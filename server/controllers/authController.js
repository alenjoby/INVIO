import { supabase } from "../config/supabase.js";

/**
 * User signup (register)
 */
export const signup = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email,
        },
      },
    });

    if (error) {
      console.error("Signup error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      user: data.user,
      session: data.session,
      message: "User created. Check email for verification.",
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to create account" });
  }
};

/**
 * User login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error);
      return res.status(401).json({ error: error.message });
    }

    res.json({
      user: data.user,
      session: data.session,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to login" });
  }
};

/**
 * Get current user (requires auth token)
 */
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Get profile error:", error);
      return res.status(400).json({ error: error.message });
    }

    // Get user's invitations count
    const { count: invitationsCount, error: countError } = await supabase
      .from("invitations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      console.error("Count invitations error:", countError);
    }

    res.json({
      user: req.user,
      profile,
      invitationsCount: invitationsCount || 0,
    });
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

/**
 * Logout (client-side operation, but included for completeness)
 */
export const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Failed to logout" });
  }
};

/**
 * Refresh token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: "refresh_token is required" });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      console.error("Refresh token error:", error);
      return res.status(401).json({ error: error.message });
    }

    res.json({
      user: data.user,
      session: data.session,
    });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(500).json({ error: "Failed to refresh token" });
  }
};
