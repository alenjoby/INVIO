import { API_URL } from "../../js/env.js";

/**
 * Checkout Logic - Simple payment flow (OTP removed)
 */

const CONFIG = {
  API_BASE: API_URL + "/api",
  PLATFORM_FEE: 0.0,
  STORAGE_KEY: "invio_purchased_templates",
};

const checkoutState = {
  template: null,
  isProcessing: false,
};

const refs = {
  form: document.getElementById("checkoutForm"),
  payBtn: document.getElementById("payButton"),
  successOverlay: document.getElementById("successOverlay"),

  // Summary refs
  img: document.getElementById("templateImage"),
  category: document.getElementById("templateCategory"),
  name: document.getElementById("templateName"),
  design: document.getElementById("templateDesign"),
  basePrice: document.getElementById("basePrice"),
  totalPrice: document.getElementById("totalPrice"),

  // Input refs
  cardNumber: document.getElementById("cardNumber"),
  expiry: document.getElementById("expiry"),
};

// Entry Point
function init() {
  bindEvents();
  loadTemplateFromUrl();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

function loadTemplateFromUrl(retryCount = 0) {
  const params = new URLSearchParams(window.location.search);
  let templateId = params.get("template");

  if (!templateId) {
    console.warn("No template ID found in URL. Redirecting...");
    window.location.href = "../../templates.html";
    return;
  }

  // Normalize ID (handle common dash/space issues)
  templateId = templateId.replace(/\s+/g, "-");

  const templateCatalog = window.TEMPLATE_CATALOG;

  if (!Array.isArray(templateCatalog)) {
    if (retryCount < 10) {
      setTimeout(() => loadTemplateFromUrl(retryCount + 1), 200);
      return;
    }
    document.getElementById("templateName").textContent =
      "Error Loading Template";
    return;
  }

  const template = templateCatalog.find((t) => t.id === templateId);
  if (!template) {
    alert("Template not found");
    window.location.href = "../../templates.html";
    return;
  }

  checkoutState.template = template;
  renderSummary();
}

function renderSummary() {
  const { template } = checkoutState;
  refs.img.src = new URL(template.image, window.location.origin + "/").href;
  refs.category.textContent = template.category;
  refs.name.textContent = template.name;
  refs.design.textContent = `Design: ${template.design}`;

  const priceStr = formatCurrency(template.price);
  refs.basePrice.textContent = priceStr;
  refs.totalPrice.textContent = priceStr;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function bindEvents() {
  refs.form.addEventListener("submit", handleCheckout);
}

async function handleCheckout(e) {
  e.preventDefault();
  if (checkoutState.isProcessing) return;

  setLoading(true);

  // In a real app, this would call a payment provider (Stripe/PayPal)
  // For INVIO, we simulate a quick processing delay and then succeed.
  setTimeout(async () => {
    try {
      await handleSuccess();
    } catch (error) {
      console.error("Checkout completion failed:", error);
      alert(
        error?.message ||
          "Payment completed, but publishing failed. Please retry from Studio.",
      );
    } finally {
      setLoading(false);
    }
  }, 1500);
}

async function handleSuccess() {
  // Save purchase to simulate ownership
  const purchased = JSON.parse(
    localStorage.getItem(CONFIG.STORAGE_KEY) || "[]",
  );
  if (!purchased.includes(checkoutState.template.id)) {
    purchased.push(checkoutState.template.id);
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(purchased));
  }

  const query = new URLSearchParams(window.location.search);
  const invitationId = query.get("invitationId");

  // Call backend to mark as purchased/published before showing success
  if (invitationId) {
    const response = await postWithAuthRetry(
      `${CONFIG.API_BASE}/invitations/${invitationId}/purchase`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        errorBody.error ||
          "Could not publish invitation after checkout. Please retry.",
      );
    }
  }

  // Show Success Overlay
  refs.successOverlay.classList.remove("hidden");

  // Redirect to Dashboard
  setTimeout(() => {
    // FIX: Replaced "/dashboard" with the exact HTML file path!
    window.location.href = "/pages/dashboard/index.html";
  }, 2500);
}

async function postWithAuthRetry(url, options = {}) {
  let token = localStorage.getItem("authToken");
  if (!token) {
    throw new Error("Session expired. Please sign in again.");
  }

  let response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAuthToken();
  if (!refreshed) {
    return response;
  }

  token = localStorage.getItem("authToken");
  if (!token) {
    return response;
  }

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

async function refreshAuthToken() {
  const refreshToken = localStorage.getItem("authRefreshToken");
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const accessToken = data?.session?.access_token;
    const nextRefreshToken = data?.session?.refresh_token;

    if (!accessToken) {
      return false;
    }

    localStorage.setItem("authToken", accessToken);
    if (nextRefreshToken) {
      localStorage.setItem("authRefreshToken", nextRefreshToken);
    }

    return true;
  } catch (error) {
    console.warn("Checkout token refresh failed:", error);
    return false;
  }
}

function setLoading(isLoading) {
  checkoutState.isProcessing = isLoading;
  refs.payBtn.disabled = isLoading;
  refs.payBtn.classList.toggle("processing", isLoading);

  if (isLoading) {
    refs.payBtn.querySelector(".btn-text").textContent =
      "Processing Payment...";
  } else {
    refs.payBtn.querySelector(".btn-text").textContent = "Complete Purchase";
  }
}