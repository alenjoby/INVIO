/**
 * Frontend Auth API Client
 * Bridges pages/auth UI to backend API
 * Usage: Import this and call functions like authApi.signup(), authApi.login(), etc.
 */

import { API_URL } from "./env.js";

class AuthAPI {
  constructor() {
    this.token = localStorage.getItem("authToken");
    this.refreshTokenValue = localStorage.getItem("authRefreshToken");
    this.user = localStorage.getItem("authUser")
      ? JSON.parse(localStorage.getItem("authUser"))
      : null;
  }

  /**
   * Set auth token in localStorage and headers
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem("authToken", token);
  }

  setRefreshToken(refreshToken) {
    this.refreshTokenValue = refreshToken || null;
    if (refreshToken) {
      localStorage.setItem("authRefreshToken", refreshToken);
    } else {
      localStorage.removeItem("authRefreshToken");
    }
  }

  /**
   * Get auth token (with fallback to localStorage if instance property is out of sync)
   */
  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem("authToken");
    }
    return this.token;
  }

  getRefreshToken() {
    if (!this.refreshTokenValue) {
      this.refreshTokenValue = localStorage.getItem("authRefreshToken");
    }
    return this.refreshTokenValue;
  }

  /**
   * Set current user in localStorage
   */
  setUser(user) {
    this.user = user;
    localStorage.setItem("authUser", JSON.stringify(user));
  }

  /**
   * Get current user
   */
  getUser() {
    return this.user;
  }

  /**
   * Clear auth state
   */
  clearAuth() {
    this.token = null;
    this.refreshTokenValue = null;
    this.user = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("authRefreshToken");
    localStorage.removeItem("authUser");
  }

  /**
   * Helper to make authenticated requests
   */
  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      let errorMessage = "API request failed";
      
      if (error && error.error) {
        if (typeof error.error === "string") {
          errorMessage = error.error;
        } else {
          errorMessage = JSON.stringify(error.error);
        }
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Sign up a new user
   */
  async signup(email, password, username = "") {
    const data = await this.request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, username: username || email }),
    });

    if (data.session?.access_token) {
      this.setToken(data.session.access_token);
      this.setRefreshToken(data.session.refresh_token || null);
      this.setUser(data.user);
      await this.syncPurchases();
    }

    return data;
  }

  /**
   * Login
   */
  async login(email, password) {
    const data = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data.session?.access_token) {
      this.setToken(data.session.access_token);
      this.setRefreshToken(data.session.refresh_token || null);
      this.setUser(data.user);
      await this.syncPurchases();
    }

    return data;
  }

  /**
   * Get current user profile
   */
  async getCurrentUser() {
    const data = await this.request("/api/auth/me");
    this.setUser(data.user);
    return data;
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await this.request("/api/auth/logout", { method: "POST" });
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Refresh auth token
   */
  async refreshToken(refreshToken) {
    const data = await this.request("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (data.session?.access_token) {
      this.setToken(data.session.access_token);
      this.setRefreshToken(data.session.refresh_token || null);
      this.setUser(data.user);
    }

    return data;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  /**
   * Verify session with server and clear local state if invalid.
   * Prevents "ghost logins" from deleted or expired accounts.
   */
  async syncSession() {
    if (!this.token) {
      this.clearAuth();
      return null;
    }

    try {
      const data = await this.getCurrentUser();
      if (data && data.user) {
        await this.syncPurchases();
      }
      return data;
    } catch (err) {
      console.warn("Session sync failed:", err.message);
      this.clearAuth();
      return null;
    }
  }

  /**
   * Sync purchased templates from backend to localStorage
   */
  async syncPurchases() {
    if (!this.token) return;

    try {
      // We fetch invitations and infer purchased templates from status
      const invitations = await this.request("/api/invitations");
      if (Array.isArray(invitations)) {
        const purchasedIds = invitations
          .filter((inv) => inv.status === "published" || inv.status === "paid")
          .map((inv) => inv.template_id)
          .filter(Boolean);
        
        // Remove duplicates
        const uniquePurchased = [...new Set(purchasedIds)];
        localStorage.setItem("invio_purchased_templates", JSON.stringify(uniquePurchased));
        console.log("[AUTH] Synced purchased templates:", uniquePurchased);
      }
    } catch (err) {
      console.warn("[AUTH] Failed to sync purchases:", err.message);
    }
  }
}

export const authApi = new AuthAPI();
if (typeof window !== "undefined") {
  window.authApi = authApi;
}
export default authApi;
