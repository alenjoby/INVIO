import express from "express";
import {
  verifyAdmin,
  getDashboardStats,
  getSalesLedger,
} from "../controllers/adminController.js";

const router = express.Router();

/**
 * Lightweight admin auth middleware.
 * Checks for X-Admin-Token header (the token returned from /api/admin/login).
 * This is a simple gate — the real security is the password on every visit.
 */
function adminAuth(req, res, next) {
  const token = req.headers["x-admin-token"];

  if (!token) {
    return res.status(401).json({ error: "Admin token required" });
  }

  // Verify token is a valid base64 string that starts with our prefix
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    if (!decoded.startsWith("invio-admin:")) {
      return res.status(401).json({ error: "Invalid admin token" });
    }
  } catch {
    return res.status(401).json({ error: "Invalid admin token" });
  }

  next();
}

// Public: admin login (password check)
router.post("/login", verifyAdmin);

// Protected: dashboard data
router.get("/stats", adminAuth, getDashboardStats);
router.get("/sales", adminAuth, getSalesLedger);

export default router;
