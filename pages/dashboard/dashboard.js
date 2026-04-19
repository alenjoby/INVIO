import { authApi } from "../../js/authApi.js";
import { invitationsApi } from "../../js/invitationsApi.js";

const TEMPLATE_PREVIEW_MAP = {
  "academic-1": "../../templates/academic/academic 1.html",
  "academic-2": "../../templates/academic/academic 2.html",
  "academic-3": "../../templates/academic/academic 3.html",
  "birthday-1": "../../templates/birthday/birthday_template_1.html",
  "birthday-2": "../../templates/birthday/birthday_template_2.html",
  "birthday-3": "../../templates/birthday/birthday_template_3.html",
  "valentines-1": "../../templates/valentines/Template1.html",
  "valentines-2": "../../templates/valentines/Template2.html",
  "valentines-3": "../../templates/valentines/Template3.html",
  "wedding-1": "../../templates/wedding/wedding_template_1.html",
  "wedding-2": "../../templates/wedding/wedding_template_2.html",
  "wedding-3": "../../templates/wedding/wedding_template_3.html",
  "wedding-4": "../../templates/wedding/wedding_template_4.html",
  "wedding-5": "../../templates/wedding/wedding_template_5.html",
};

const state = {
  invitations: [],
  selectedInvitationId: null,
};

document.addEventListener("DOMContentLoaded", () => {
  initDashboard().catch((err) => {
    console.error("Dashboard init failed:", err);
    // If it's an auth error, redirect to login instead of alerting
    if (err.message.includes("token") || err.message.includes("Unauthorized")) {
      window.location.href = "/pages/auth/index.html";
    } else {
      alert(`Oops! Something went wrong: ${err.message}`);
    }
  });
});

async function initDashboard() {
  const session = await authApi.syncSession();
  
  if (!session) {
    window.location.href = "/pages/auth/index.html";
    return;
  }

  /* if (!authApi.isAuthenticated()) {
    window.location.href = "/pages/auth/index.html";
    return;
  } */

  setupStaticEnhancements();
  setupLogout();

  const me = authApi.getUser() || (await authApi.getCurrentUser()).user;
  renderUser(me);

  const invitations = await invitationsApi.list();
  state.invitations = Array.isArray(invitations) ? invitations : [];
  const activeInvitation = getCurrentPublishedInvitation(invitations);

  renderTemplateHistory(state.invitations, activeInvitation?.id || null);
  setupHistorySelection();
  setupDeleteAction();

  if (!activeInvitation) {
    renderEmptyState();
    return;
  }

  await selectInvitation(activeInvitation.id);
}

function getCurrentPublishedInvitation(invitations = []) {
  return (
    invitations
      .filter((invitation) => invitation.status === "published")
      .sort((a, b) => {
        const aDate = new Date(
          a.published_at || a.updated_at || a.created_at || 0,
        ).getTime();
        const bDate = new Date(
          b.published_at || b.updated_at || b.created_at || 0,
        ).getTime();
        return bDate - aDate;
      })[0] || null
  );
}

function renderUser(user) {
  const userNameEl = document.getElementById("user-name");
  const userAvatarEl = document.getElementById("user-avatar");

  const displayName =
    user?.user_metadata?.username || user?.email?.split("@")[0] || "INVIO User";

  if (userNameEl) userNameEl.textContent = displayName;
  if (userAvatarEl) {
    const initials = displayName
      .split(" ")
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join("");
    userAvatarEl.textContent = initials || "IU";
  }
}

function renderInvitationHeader(invitation) {
  const titleEl = document.querySelector(".event-title");
  const metaEl = document.querySelector(".event-meta");

  if (titleEl) titleEl.textContent = invitation.title || "Untitled Invitation";
  if (metaEl) {
    const created = new Date(invitation.created_at);
    const status = String(invitation.status || "draft");
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    metaEl.textContent = `Template: ${invitation.template_id} • ${statusLabel} • Created ${created.toLocaleDateString()}`;
  }
}

function configureStudioLink(invitation) {
  const editBtn = document.querySelector(".header-actions .dash-btn-outline");
  if (!editBtn) return;

  editBtn.onclick = () => {
    const query = new URLSearchParams({
      template: invitation.template_id,
      id: invitation.id,
    }).toString();
    window.location.href = `/pages/studio/index.html?${query}`;
  };
}

function configureCopyLinkButton(invitation) {
  const copyBtn = document.querySelector(".header-actions .dash-btn-primary");
  if (!copyBtn) return;

  copyBtn.onclick = async () => {
    const slug = invitation.slug;
    if (!slug) {
      alert("This invitation has no share slug yet.");
      return;
    }

    const shareLink = `${window.location.origin}/invite?slug=${encodeURIComponent(slug)}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      alert("Link copied!");
    } catch {
      alert(`Copy this link manually: ${shareLink}`);
    }
  };
}

function setupDeleteAction() {
  const deleteBtn = document.getElementById("deleteInvitationBtn");
  if (!deleteBtn) return;

  deleteBtn.onclick = async () => {
    if (!state.selectedInvitationId) {
      alert("Select an invitation first.");
      return;
    }

    const invitation = state.invitations.find(
      (item) => item.id === state.selectedInvitationId,
    );
    const label = invitation?.title || "this invitation";
    const confirmed = window.confirm(
      `Delete ${label}? This will also remove it from template history and cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await invitationsApi.delete(state.selectedInvitationId);
      state.invitations = state.invitations.filter(
        (item) => item.id !== state.selectedInvitationId,
      );
      state.selectedInvitationId = null;

      const nextActive = getCurrentPublishedInvitation(state.invitations);
      renderTemplateHistory(state.invitations, nextActive?.id || null);

      if (!nextActive) {
        renderEmptyState();
        return;
      }

      await selectInvitation(nextActive.id);
    } catch (error) {
      console.error("Delete invitation failed:", error);
      alert(error.message || "Failed to delete invitation.");
    }
  };
}

function setDeleteButtonEnabled(isEnabled) {
  const deleteBtn = document.getElementById("deleteInvitationBtn");
  if (!deleteBtn) return;

  deleteBtn.disabled = !isEnabled;
  deleteBtn.setAttribute("aria-disabled", String(!isEnabled));
}

function renderPreview(templateId) {
  const previewFrame = document.getElementById("preview-frame");
  if (!previewFrame) return;

  const previewSrc = TEMPLATE_PREVIEW_MAP[templateId];
  if (!previewSrc) {
    previewFrame.src = "about:blank";
    return;
  }

  previewFrame.src = previewSrc;

  previewFrame.addEventListener("load", () => {
    const frameDoc = previewFrame.contentDocument;
    if (frameDoc) {
      const scriptId = "__invio-security-guard";
      if (!frameDoc.getElementById(scriptId)) {
        const script = frameDoc.createElement("script");
        script.id = scriptId;
        script.src = "../../js/security-guard.js";
        frameDoc.head.appendChild(script);
      }
    }
  });
}

async function selectInvitation(invitationId) {
  const invitation = state.invitations.find((item) => item.id === invitationId);
  if (!invitation) {
    return;
  }

  state.selectedInvitationId = invitation.id;
  renderTemplateHistory(state.invitations, state.selectedInvitationId);
  renderInvitationHeader(invitation);
  configureStudioLink(invitation);
  configureCopyLinkButton(invitation);
  setDeleteButtonEnabled(true);
  renderPreview(invitation.template_id);

  try {
    const [stats, responses] = await Promise.all([
      invitationsApi.getStats(invitation.id),
      invitationsApi.getResponses(invitation.id),
    ]);
    renderStats(stats);
    renderGuestLedgerFromResponses(Array.isArray(responses) ? responses : []);
  } catch {
    renderStats({});
    renderGuestLedgerFromResponses([]);
  }
}

function renderStats(stats) {
  const responsesEl = document.getElementById("val-responses");
  const headcountEl = document.getElementById("val-headcount");
  const daysEl = document.getElementById("val-days");

  const total = Number(stats.total_responses || 0);
  const attending = Number(stats.attending || 0);
  const notAttending = Number(stats.not_attending || 0);
  const maybe = Number(stats.maybe || 0);
  const totalGuests = Number(stats.total_guests || 0);

  if (responsesEl) {
    responsesEl.innerHTML = `${total}<span class="stat-total">/${total}</span>`;
  }

  if (headcountEl) {
    headcountEl.textContent = String(totalGuests || attending);
    const subText = headcountEl.parentElement?.querySelector(".stat-subtext");
    if (subText) {
      subText.textContent = `${notAttending} Declined • ${maybe} Maybe`;
    }
  }

  if (daysEl) {
    daysEl.textContent = "--";
  }

  const progressFill = document.querySelector(".progress-fill");
  if (progressFill) {
    const ratio =
      total > 0 ? Math.min(100, Math.round((attending / total) * 100)) : 0;
    progressFill.style.width = `${ratio}%`;
  }
}

function renderTemplateHistory(invitations = [], activeInvitationId = null) {
  const historyList = document.getElementById("template-history-list");
  if (!historyList) return;

  if (!invitations.length) {
    historyList.innerHTML = `
      <li>
        <button class="history-item" type="button" disabled>
          <span class="history-item-title">No templates yet</span>
          <span class="history-item-template">Create your first invitation</span>
        </button>
      </li>
    `;
    return;
  }

  const rows = [...invitations]
    .sort((a, b) => {
      const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
      const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
      return bDate - aDate;
    })
    .slice(0, 6)
    .map((invitation) => {
      const status = String(invitation.status || "draft");
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      const dateLabel = new Date(
        invitation.updated_at || invitation.created_at,
      ).toLocaleDateString();
      const templateLabel = invitation.template_id || "template";
      const isActive = invitation.id === activeInvitationId;
      const activeBadge = isActive ? "Selected" : statusLabel;

      return `
        <li>
          <div class="history-item-shell">
            <button class="history-item${isActive ? " is-active" : ""}" type="button" data-invitation-id="${escapeHtml(invitation.id)}">
              <span class="history-item-title">${escapeHtml(invitation.title || "Untitled Invitation")}</span>
              <span class="history-item-template">${escapeHtml(templateLabel)}</span>
              <span class="history-meta">${escapeHtml(activeBadge)} • ${escapeHtml(dateLabel)}</span>
            </button>
            <button class="history-item-delete" type="button" aria-label="Delete ${escapeHtml(invitation.title || "Untitled Invitation")}" data-delete-invitation-id="${escapeHtml(invitation.id)}">
              <i class="ph ph-trash"></i>
            </button>
          </div>
        </li>
      `;
    })
    .join("");

  historyList.innerHTML = rows;
}

function setupHistorySelection() {
  const historyList = document.getElementById("template-history-list");
  if (!historyList) return;

  historyList.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest(
      "button[data-delete-invitation-id]",
    );
    if (deleteButton) {
      event.stopPropagation();
      const invitationId = deleteButton.dataset.deleteInvitationId;
      const invitation = state.invitations.find(
        (item) => item.id === invitationId,
      );
      const label = invitation?.title || "this invitation";
      const confirmed = window.confirm(
        `Delete ${label}? This will also remove it from template history and cannot be undone.`,
      );

      if (!confirmed) return;

      try {
        await invitationsApi.delete(invitationId);
        state.invitations = state.invitations.filter(
          (item) => item.id !== invitationId,
        );

        const nextActive = getCurrentPublishedInvitation(state.invitations);
        state.selectedInvitationId = nextActive?.id || null;
        renderTemplateHistory(state.invitations, state.selectedInvitationId);

        if (!nextActive) {
          renderEmptyState();
          return;
        }

        await selectInvitation(nextActive.id);
      } catch (error) {
        console.error("Delete invitation failed:", error);
        alert(error.message || "Failed to delete invitation.");
      }

      return;
    }

    const button = event.target.closest("button[data-invitation-id]");
    if (!button) return;

    const invitationId = button.dataset.invitationId;
    if (!invitationId || invitationId === state.selectedInvitationId) return;

    await selectInvitation(invitationId);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderGuestLedgerFromResponses(responses = []) {
  const guestTbody = document.getElementById("guest-tbody");
  if (!guestTbody) return;

  if (!responses.length) {
    guestTbody.innerHTML = `
      <tr>
        <td colspan="4" style="color: var(--dash-text-muted); text-align: center; padding: 1rem;">
          No RSVP responses yet.
        </td>
      </tr>
    `;
    return;
  }

  guestTbody.innerHTML = responses
    .map((response) => {
      const status = String(response.rsvp_status || "maybe");
      const statusLabel =
        status === "attending"
          ? "Attending"
          : status === "not_attending"
            ? "Not attending"
            : "Maybe";

      const statusClass =
        status === "attending"
          ? "tag-accepted"
          : status === "not_attending"
            ? "tag-declined"
            : "";

      const noteParts = [];
      if (response.dietary_requirements) {
        noteParts.push(response.dietary_requirements);
      }
      if (Number(response.additional_guests || 0) > 0) {
        noteParts.push(`+${Number(response.additional_guests)} guest(s)`);
      }

      const rsvpDate = response.created_at
        ? new Date(response.created_at).toLocaleDateString()
        : "-";

      return `
        <tr>
          <td><strong>${escapeHtml(response.guest_name || "Guest")}</strong></td>
          <td><span class="status-tag ${statusClass}">${escapeHtml(statusLabel)}</span></td>
          <td style="color: var(--dash-text-muted);">${escapeHtml(noteParts.join(" • ") || "-")}</td>
          <td style="color: var(--dash-text-muted);">${escapeHtml(rsvpDate)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderEmptyState() {
  const titleEl = document.querySelector(".event-title");
  const metaEl = document.querySelector(".event-meta");
  const guestTbody = document.getElementById("guest-tbody");
  const previewFrame = document.getElementById("preview-frame");

  if (titleEl) titleEl.textContent = "No invitations yet";
  if (metaEl)
    metaEl.textContent = "Create one from Templates or Studio to see analytics";

  if (previewFrame) {
    previewFrame.src = "about:blank";
  }

  if (guestTbody) {
    guestTbody.innerHTML = `
      <tr>
        <td colspan="4" style="color: var(--dash-text-muted); text-align: center; padding: 1rem;">
          No RSVP data yet.
        </td>
      </tr>
    `;
  }

  const editBtn = document.querySelector(".header-actions .dash-btn-outline");
  if (editBtn) {
    editBtn.onclick = () => {
      window.location.href = "../../templates.html";
    };
  }

  setDeleteButtonEnabled(false);
}

function setupStaticEnhancements() {
  setupMobileNav();
  if (typeof gsap !== "undefined") {
    gsap.from(".dash-header", {
      y: -30,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out",
    });

    gsap.from(".bento-card.gs-elem", {
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out",
      delay: 0.2,
    });
  }

  const filterSelect = document.getElementById("guest-filter");
  if (filterSelect) {
    filterSelect.addEventListener("change", () => {
      // Reserved for future row-level filtering once individual RSVP rows are loaded.
    });
  }
}

function setupMobileNav() {
  const menuToggle = document.getElementById("dashMenuToggle");
  const menuIcon = document.getElementById("dashMenuIcon");

  if (menuToggle && menuIcon) {
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const nextExpanded = !document.body.classList.contains("menu-open");

      menuToggle.setAttribute("aria-expanded", String(nextExpanded));
      if (nextExpanded) {
        document.body.classList.add("menu-open");
        menuIcon.className = "ph ph-x";
      } else {
        document.body.classList.remove("menu-open");
        menuIcon.className = "ph ph-list";
      }
    });

    // Close on navigation
    document.addEventListener("click", (e) => {
      if (
        document.body.classList.contains("menu-open") &&
        !e.target.closest(".dash-nav") &&
        !e.target.closest("#dashMenuToggle")
      ) {
        document.body.classList.remove("menu-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuIcon.className = "ph ph-list";
      }
    });
  }
}

function setupLogout() {
  const logoutLink = document.getElementById("logout-link");
  if (!logoutLink) return;

  logoutLink.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      await authApi.logout();
    } catch (error) {
      console.warn(
        "Logout API call failed, cleared local session anyway.",
        error,
      );
      authApi.clearAuth();
    }

    window.location.href = "/pages/auth/index.html";
  });
}
