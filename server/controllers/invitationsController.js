import { supabaseAdmin } from "../config/supabase.js";
import { generateSlug } from "../utils/generateSlug.js";

function normalizeSlug(value) {
  const cleaned = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned.slice(0, 60);
}

async function resolveAvailableSlug(baseSlug, currentInvitationId) {
  const safeBase = normalizeSlug(baseSlug) || "invitation";
  let candidate = safeBase;
  let counter = 2;

  while (counter < 500) {
    let query = supabaseAdmin
      .from("invitations")
      .select("id")
      .eq("slug", candidate)
      .limit(1);

    if (currentInvitationId) {
      query = query.neq("id", currentInvitationId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return candidate;
    }

    const suffix = `-${counter}`;
    const trimmedBase = safeBase.slice(0, Math.max(1, 60 - suffix.length));
    candidate = `${trimmedBase}${suffix}`;
    counter += 1;
  }

  throw new Error("Could not generate a unique invitation slug");
}

/**
 * Create a new draft invitation
 */
export const createInvitation = async (req, res) => {
  try {
    const { title, templateId } = req.body;
    const userId = req.user.id;

    if (!title || !templateId) {
      return res
        .status(400)
        .json({ error: "title and templateId are required" });
    }

    const slug = generateSlug(templateId);

    const { data, error } = await supabaseAdmin
      .from("invitations")
      .insert({
        user_id: userId,
        title,
        template_id: templateId,
        slug,
        status: "draft",
        content: {},
        interactions: {},
      })
      .select()
      .single();

    if (error) {
      console.error("Create invitation error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error("Create invitation error:", err);
    res.status(500).json({ error: "Failed to create invitation" });
  }
};

/**
 * Get all invitations for the current user
 */
export const getInvitations = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from("invitations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get invitations error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error("Get invitations error:", err);
    res.status(500).json({ error: "Failed to fetch invitations" });
  }
};

/**
 * Get a single invitation by ID
 */
export const getInvitationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from("invitations")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Invitation not found" });
      }
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error("Get invitation error:", err);
    res.status(500).json({ error: "Failed to fetch invitation" });
  }
};

/**
 * Get a published invitation by slug (public)
 */
export const getPublishedInvitation = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data, error } = await supabaseAdmin
      .from("invitations")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Invitation not found" });
      }
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error("Get published invitation error:", err);
    res.status(500).json({ error: "Failed to fetch invitation" });
  }
};

/**
 * Update invitation (save draft)
 */
export const updateInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, interactions } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (interactions !== undefined) updateData.interactions = interactions;

    const { data, error } = await supabaseAdmin
      .from("invitations")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Update invitation error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error("Update invitation error:", err);
    res.status(500).json({ error: "Failed to update invitation" });
  }
};

/**
 * Publish invitation (set status to published)
 */
export const publishInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const requestedSlug = req.body?.slug;

    const { data: currentInvitation, error: currentError } = await supabaseAdmin
      .from("invitations")
      .select("id, title")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (currentError || !currentInvitation) {
      if (currentError?.code === "PGRST116") {
        return res.status(404).json({ error: "Invitation not found" });
      }
      return res
        .status(400)
        .json({ error: currentError?.message || "Invitation not found" });
    }

    const baseSlug = normalizeSlug(
      requestedSlug || currentInvitation.title || "",
    );
    if (!baseSlug) {
      return res
        .status(400)
        .json({ error: "Invitation link name is required" });
    }

    const finalSlug = await resolveAvailableSlug(baseSlug, id);

    const { data, error } = await supabaseAdmin
      .from("invitations")
      .update({
        slug: finalSlug,
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Publish invitation error:", error);
      return res.status(400).json({ error: error.message });
    }

    // Return slug for sharing
    const frontendBase = String(process.env.FRONTEND_URL || "").replace(
      /\/+$/,
      "",
    );
    res.json({
      ...data,
      shareUrl: `${frontendBase}/invite?slug=${encodeURIComponent(data.slug)}`,
    });
  } catch (err) {
    console.error("Publish invitation error:", err);
    res.status(500).json({ error: "Failed to publish invitation" });
  }
};

/**
 * Purchase invitation (alias for publish, to be used by checkout flow)
 */
export const purchaseInvitation = async (req, res) => {
  // Currently, purchasing just publishes it.
  // In a real billing scenario, you might mark paid = true on a different table.
  return publishInvitation(req, res);
};

/**
 * Delete invitation
 */
export const deleteInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabaseAdmin
      .from("invitations")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Delete invitation error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Invitation deleted successfully" });
  } catch (err) {
    console.error("Delete invitation error:", err);
    res.status(500).json({ error: "Failed to delete invitation" });
  }
};

/**
 * Get RSVP stats for an invitation (for dashboard)
 */
export const getInvitationStats = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("invitations")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (invError || !invitation) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Get RSVP stats
    const { data: responses, error: rsvpError } = await supabaseAdmin
      .from("rsvp_responses")
      .select("rsvp_status, additional_guests")
      .eq("invitation_id", id);

    if (rsvpError) {
      console.error("Get stats error:", rsvpError);
      return res.status(400).json({ error: rsvpError.message });
    }

    // Calculate stats
    const stats = {
      total_responses: responses.length,
      attending: responses.filter((r) => r.rsvp_status === "attending").length,
      not_attending: responses.filter((r) => r.rsvp_status === "not_attending")
        .length,
      maybe: responses.filter((r) => r.rsvp_status === "maybe").length,
      total_guests: responses.reduce(
        (sum, r) => sum + (r.additional_guests || 0) + 1,
        0,
      ),
    };

    res.json(stats);
  } catch (err) {
    console.error("Get stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};
