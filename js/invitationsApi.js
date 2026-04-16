/**
 * Frontend Invitations API Client
 * Bridges Studio and Dashboard to backend API
 * Usage: Import this and call functions like invitationsApi.create(), invitationsApi.save(), etc.
 */

import { authApi } from "./authApi.js";

import { API_URL } from "./env.js";

class InvitationsAPI {
  /**
   * Helper to make authenticated requests
   */
  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const token = authApi.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API request failed");
    }

    return response.json();
  }

  /**
   * Create a new draft invitation
   */
  async create(title, templateId) {
    return this.request("/api/invitations", {
      method: "POST",
      body: JSON.stringify({
        title,
        templateId,
      }),
    });
  }

  /**
   * Get all user's invitations
   */
  async list() {
    return this.request("/api/invitations");
  }

  /**
   * Get a single invitation by ID
   */
  async getById(id) {
    return this.request(`/api/invitations/${id}`);
  }

  /**
   * Get a published invitation by slug (public)
   */
  async getPublished(slug) {
    const response = await fetch(`${API_URL}/api/invitations/public/${slug}`);
    if (!response.ok) {
      throw new Error("Invitation not found");
    }
    return response.json();
  }

  /**
   * Save draft invitation (update content/interactions)
   */
  async save(id, updates) {
    return this.request(`/api/invitations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Publish invitation
   */
  async publish(id) {
    return this.request(`/api/invitations/${id}/publish`, {
      method: "POST",
    });
  }

  /**
   * Delete invitation
   */
  async delete(id) {
    return this.request(`/api/invitations/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Get RSVP stats for dashboard
   */
  async getStats(id) {
    return this.request(`/api/invitations/${id}/stats`);
  }

  /**
   * Submit RSVP response (public)
   */
  async submitRsvp(id, rsvpData) {
    const response = await fetch(`${API_URL}/api/invitations/${id}/rsvp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        guestName: rsvpData.guestName,
        guestEmail: rsvpData.guestEmail,
        rsvpStatus: rsvpData.rsvpStatus,
        dietaryRequirements: rsvpData.dietaryRequirements,
        additionalGuests: rsvpData.additionalGuests || 0,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to submit RSVP");
    }

    return response.json();
  }
}

export const invitationsApi = new InvitationsAPI();
export default invitationsApi;
