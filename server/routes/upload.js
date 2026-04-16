import express from "express";
import multer from "multer";
import { supabase } from "../config/supabase.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Setup multer for memory storage handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { user } = req;
    const file = req.file;
    
    // Create unique filename tied to user
    const filename = `${user.id}/${Date.now()}-${file.originalname
      .replace(/[^a-z0-9.]/gi, "_")
      .toLowerCase()}`;

    // Upload directly to Supabase Storage bucket
    const { data, error } = await supabase.storage
      .from("invitation_media")
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error("Supabase storage error:", error);
      return res.status(500).json({ error: "Storage error: " + error.message });
    }

    // Get the live public URL
    const { data: publicUrlData } = supabase.storage
      .from("invitation_media")
      .getPublicUrl(filename);

    res.status(200).json({
      url: publicUrlData.publicUrl,
      path: filename,
    });
  } catch (err) {
    console.error("Upload route error:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

export default router;
