import { supabase } from "../config/supabase.js";

/**
 * Middleware to verify JWT token from Supabase Auth
 * Extracts user from Authorization header and attaches to req.user
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
};

/**
 * Optional middleware - attaches user if token exists, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const {
        data: { user },
      } = await supabase.auth.getUser(token);

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (err) {
    console.error("Optional auth error:", err);
    next(); // Continue without user
  }
};
