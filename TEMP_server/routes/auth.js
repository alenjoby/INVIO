import express from "express";
import {
  signup,
  login,
  getCurrentUser,
  logout,
  refreshToken,
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refreshToken);

// Protected routes
router.get("/me", verifyToken, getCurrentUser);
router.post("/logout", verifyToken, logout);

export default router;
