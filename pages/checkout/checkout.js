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
    await handleSuccess();
    setLoading(false);
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

  // Show Success Overlay
  refs.successOverlay.classList.remove("hidden");

  // Call backend to mark as purchased/published
  try {
    const query = new URLSearchParams(window.location.search);
    const invitationId = query.get("invitationId");

    if (invitationId) {
      const token = localStorage.getItem("authToken");
      if (token) {
        await fetch(`${CONFIG.API_BASE}/invitations/${invitationId}/purchase`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    }
  } catch (error) {
    console.error("Failed to update backend status:", error);
  }

  // Redirect to Dashboard
  setTimeout(() => {
    window.location.href = "/dashboard";
  }, 2500);
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
