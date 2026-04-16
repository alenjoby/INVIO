import express from "express";
import {
  createInvitation,
  getInvitations,
  getInvitationById,
  getPublishedInvitation,
  updateInvitation,
  publishInvitation,
  deleteInvitation,
  getInvitationStats,
  purchaseInvitation,
} from "../controllers/invitationsController.js";
import { verifyToken, optionalAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";

const router = express.Router();
const RSVP_RATE_WINDOW_MS = Number(process.env.RSVP_RATE_WINDOW_MS || 600000);
const RSVP_RATE_MAX = Number(process.env.RSVP_RATE_MAX || 8);
const rsvpBuckets = new Map();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || "unknown";
}

function isRateLimited(req, invitationId) {
  const now = Date.now();
  const key = `${invitationId}:${getClientIp(req)}`;
  const recent = (rsvpBuckets.get(key) || []).filter(
    (timestamp) => now - timestamp < RSVP_RATE_WINDOW_MS,
  );

  if (recent.length >= RSVP_RATE_MAX) {
    rsvpBuckets.set(key, recent);
    return true;
  }

  recent.push(now);
  rsvpBuckets.set(key, recent);

  if (rsvpBuckets.size > 5000) {
    const cutoff = now - RSVP_RATE_WINDOW_MS;
    for (const [bucketKey, timestamps] of rsvpBuckets.entries()) {
      const valid = timestamps.filter((timestamp) => timestamp >= cutoff);
      if (valid.length === 0) {
        rsvpBuckets.delete(bucketKey);
      } else {
        rsvpBuckets.set(bucketKey, valid);
      }
    }
  }

  return false;
}

// Public routes
router.get("/public/:slug", getPublishedInvitation);

// Protected routes (require auth)
router.post("/", verifyToken, createInvitation);
router.get("/", verifyToken, getInvitations);
router.get("/:id", verifyToken, getInvitationById);
router.patch("/:id", verifyToken, updateInvitation);
router.post("/:id/publish", verifyToken, publishInvitation);
router.post("/:id/purchase", verifyToken, purchaseInvitation);
router.delete("/:id", verifyToken, deleteInvitation);
router.get("/:id/stats", verifyToken, getInvitationStats);

// RSVP route (optional auth - anyone can submit)
router.post("/:id/rsvp", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      guestName,
      guestEmail,
      rsvpStatus,
      dietaryRequirements,
      additionalGuests,
    } = req.body;

    if (isRateLimited(req, id)) {
      return res.status(429).json({
        error: "Too many RSVP attempts. Please try again shortly.",
      });
    }

    if (!guestName || !rsvpStatus) {
      return res.status(400).json({
        error: "guestName and rsvpStatus are required",
      });
    }

    const status = String(rsvpStatus);
    if (!["attending", "not_attending", "maybe"].includes(status)) {
      return res.status(400).json({
        error: "Invalid rsvpStatus value",
      });
    }

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("invitations")
      .select("id")
      .eq("id", id)
      .eq("status", "published")
      .single();

    if (invitationError || !invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    const guests = Number(additionalGuests);
    const normalizedGuests = Number.isFinite(guests)
      ? Math.max(0, Math.floor(guests))
      : 0;

    const { data, error } = await supabaseAdmin
      .from("rsvp_responses")
      .insert({
        invitation_id: id,
        guest_name: guestName,
        guest_email: guestEmail,
        rsvp_status: status,
        dietary_requirements: dietaryRequirements,
        additional_guests: normalizedGuests,
      })
      .select()
      .single();

    if (error) {
      console.error("RSVP submission error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error("RSVP submission error:", err);
    res.status(500).json({ error: "Failed to submit RSVP" });
  }
});

export default router;
