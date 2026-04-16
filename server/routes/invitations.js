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

const router = express.Router();

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

    if (!guestName || !rsvpStatus) {
      return res.status(400).json({
        error: "guestName and rsvpStatus are required",
      });
    }

    const { supabase } = await import("../config/supabase.js");
    const { data, error } = await supabase
      .from("rsvp_responses")
      .insert({
        invitation_id: id,
        guest_name: guestName,
        guest_email: guestEmail,
        rsvp_status: rsvpStatus,
        dietary_requirements: dietaryRequirements,
        additional_guests: additionalGuests || 0,
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
