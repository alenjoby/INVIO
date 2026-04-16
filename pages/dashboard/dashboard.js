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

document.addEventListener("DOMContentLoaded", () => {
  initDashboard().catch((err) => {
    console.error("Dashboard init failed:", err);
    alert(`Failed to load dashboard: ${err.message}`);
  });
});

async function initDashboard() {
  if (!authApi.isAuthenticated()) {
    window.location.href = "/pages/auth/index.html";
    return;
  }

  setupStaticEnhancements();

  const me = authApi.getUser() || (await authApi.getCurrentUser()).user;
  renderUser(me);

  const invitations = await invitationsApi.list();
  const activeInvitation =
    invitations.find(
      (invitation) =>
        invitation.status === "published" && Boolean(invitation.slug),
    ) ||
    invitations[0] ||
    null;

  if (!activeInvitation) {
    renderEmptyState();
    return;
  }

  renderInvitationHeader(activeInvitation);
  configureStudioLink(activeInvitation);
  configureCopyLinkButton(activeInvitation);
  renderPreview(activeInvitation.template_id);

  const stats = await invitationsApi.getStats(activeInvitation.id);
  renderStats(stats);
  renderDietaryInsights();
  renderGuestLedgerFromStats(stats);
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

function renderPreview(templateId) {
  const previewFrame = document.getElementById("preview-frame");
  if (!previewFrame) return;

  previewFrame.src =
    TEMPLATE_PREVIEW_MAP[templateId] ||
    "../../templates/wedding/wedding_template_1.html";

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
    responsesEl.innerHTML = `${total}<span class="stat-total">/${Math.max(total, 1)}</span>`;
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

function renderDietaryInsights() {
  const dietaryList = document.getElementById("dietary-list");
  if (!dietaryList) return;

  dietaryList.innerHTML = `
    <li class="insight-item">
      <span class="insight-label">RSVP data source</span>
      <span class="insight-count">Live</span>
    </li>
    <li class="insight-item">
      <span class="insight-label">Dietary support</span>
      <span class="insight-count">Enabled</span>
    </li>
    <li class="insight-item">
      <span class="insight-label">Detailed split</span>
      <span class="insight-count">After submissions</span>
    </li>
  `;
}

function renderGuestLedgerFromStats(stats) {
  const guestTbody = document.getElementById("guest-tbody");
  if (!guestTbody) return;

  const total = Number(stats.total_responses || 0);
  const attending = Number(stats.attending || 0);
  const notAttending = Number(stats.not_attending || 0);
  const maybe = Number(stats.maybe || 0);

  guestTbody.innerHTML = `
    <tr>
      <td><strong>Summary</strong></td>
      <td><span class="status-tag tag-accepted">${attending} attending</span></td>
      <td style="color: var(--dash-text-muted);">Aggregate</td>
      <td style="color: var(--dash-text-muted);">Live</td>
    </tr>
    <tr>
      <td><strong>Summary</strong></td>
      <td><span class="status-tag tag-declined">${notAttending} declined</span></td>
      <td style="color: var(--dash-text-muted);">Aggregate</td>
      <td style="color: var(--dash-text-muted);">Live</td>
    </tr>
    <tr>
      <td><strong>Summary</strong></td>
      <td><span class="status-tag">${maybe} maybe</span></td>
      <td style="color: var(--dash-text-muted);">Total responses: ${total}</td>
      <td style="color: var(--dash-text-muted);">Live</td>
    </tr>
  `;
}

function renderEmptyState() {
  const titleEl = document.querySelector(".event-title");
  const metaEl = document.querySelector(".event-meta");
  const guestTbody = document.getElementById("guest-tbody");

  if (titleEl) titleEl.textContent = "No invitations yet";
  if (metaEl)
    metaEl.textContent = "Create one from Templates or Studio to see analytics";

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
}

function setupStaticEnhancements() {
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
