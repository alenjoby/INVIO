const TEMPLATE_CATALOG = [
  {
    id: "academic-1",
    name: "Laurel Convocation",
    category: "academic",
    price: 44,
    image: "assets/images/wedding/wedding_template_2/couple-portrait.jpg",
    templatePath: "templates/academic/academic 1.html",
    design: "Formal Editorial",
    layout: "wide",
    tags: ["graduation", "ceremony", "institutional"],
    trending: true,
  },
  {
    id: "academic-2",
    name: "Scholars Night",
    category: "academic",
    price: 46,
    image: "assets/images/wedding/wedding_template_5/venue-palace.png",
    templatePath: "templates/academic/academic 2.html",
    design: "Prestige Modern",
    layout: "square",
    tags: ["awards", "formal", "elegant"],
  },
  {
    id: "academic-3",
    name: "Thesis Reception",
    category: "academic",
    price: 42,
    image: "assets/images/wedding/wedding_template_5/venue-garden.png",
    templatePath: "templates/academic/academic 3.html",
    design: "Classic Ceremony",
    layout: "tall",
    tags: ["thesis", "reception", "timeless"],
  },
  {
    id: "birthday-1",
    name: "Confetti Chronicle",
    category: "birthday",
    price: 32,
    image: "assets/images/birthday/template_1/img.webp",
    templatePath: "templates/birthday/birthday_template_1.html",
    design: "Scrapbook Party",
    layout: "tall",
    tags: ["playful", "photo", "fun"],
  },
  {
    id: "birthday-2",
    name: "Golden Milestone",
    category: "birthday",
    price: 38,
    image: "assets/images/birthday/template_2/hero.webp",
    templatePath: "templates/birthday/birthday_template_2.html",
    design: "Luxury Celebration",
    layout: "wide",
    tags: ["gold", "milestone", "premium"],
    trending: true,
  },
  {
    id: "birthday-3",
    name: "Neon Storyline",
    category: "birthday",
    price: 35,
    image: "assets/images/birthday/template_3/girl.webp",
    templatePath: "templates/birthday/birthday_template_3.html",
    design: "Nightlife Pop",
    layout: "square",
    tags: ["neon", "party", "youthful"],
    isNew: true,
  },
  {
    id: "valentines-1",
    name: "Sunset Promise",
    category: "valentines",
    price: 34,
    image: "templates/valentines/nathan-dumlao-w5hhoYM_JsU-unsplash.jpg",
    templatePath: "templates/valentines/Template1.html",
    design: "Romantic Minimal",
    layout: "cinematic",
    tags: ["romantic", "sunset", "soft"],
  },
  {
    id: "valentines-2",
    name: "Love Letter Evening",
    category: "valentines",
    price: 36,
    image: "templates/valentines/nathan-dumlao-w5hhoYM_JsU-unsplash.jpg",
    templatePath: "templates/valentines/Template2.html",
    design: "Poetic Editorial",
    layout: "tall",
    tags: ["intimate", "letter", "warm"],
  },
  {
    id: "valentines-3",
    name: "Forever After",
    category: "valentines",
    price: 37,
    image: "templates/valentines/nathan-dumlao-w5hhoYM_JsU-unsplash.jpg",
    templatePath: "templates/valentines/Template3.html",
    design: "Cinematic Romance",
    layout: "wide",
    tags: ["couples", "cinematic", "classic"],
    trending: true,
  },
  {
    id: "wedding-1",
    name: "Maharani Blossom",
    category: "wedding",
    price: 52,
    image: "assets/images/wedding/wedding_template_1/bride_groom.png",
    templatePath: "templates/wedding/wedding_template_1.html",
    design: "Royal Floral",
    layout: "tall",
    tags: ["traditional", "floral", "ornate"],
  },
  {
    id: "wedding-2",
    name: "Ivory Vows",
    category: "wedding",
    price: 58,
    image: "assets/images/wedding/wedding_template_2/hero-background.jpg",
    templatePath: "templates/wedding/wedding_template_2.html",
    design: "Modern Luxe",
    layout: "cinematic",
    tags: ["minimal", "luxury", "editorial"],
  },
  {
    id: "wedding-3",
    name: "Aurelian Union",
    category: "wedding",
    price: 54,
    image: "assets/images/wedding/wedding_template_2/couple-portrait.jpg",
    templatePath: "templates/wedding/wedding_template_3.html",
    design: "Timeless Portrait",
    layout: "wide",
    tags: ["timeless", "ceremony", "portrait"],
  },
  {
    id: "wedding-4",
    name: "Shoreline Ceremony",
    category: "wedding",
    price: 56,
    image: "assets/images/wedding/wedding_template_5/couple-bench.png",
    templatePath: "templates/wedding/wedding_template_4.html",
    design: "Destination Romance",
    layout: "cinematic",
    tags: ["beach", "destination", "sunset"],
  },
  {
    id: "wedding-5",
    name: "Rosewood Keepsake",
    category: "wedding",
    price: 60,
    image: "assets/images/wedding/wedding_template_5/couple-hero.png",
    templatePath: "templates/wedding/wedding_template_5.html",
    design: "Storybook Luxury",
    layout: "square",
    tags: ["storybook", "premium", "collage"],
    isNew: true,
  },
  // Funeral templates
  {
    id: "funeral-1",
    name: "Cinematic Legacy",
    category: "funeral",
    price: 0,
    image: "assets/images/funeral/hero-portrait.jpg",
    templatePath: "templates/funeral/funeral-template-1.html",
    design: "Minimal Memorial",
    layout: "cinematic",
    tags: ["memorial", "tribute", "classic"],
  },
  {
    id: "funeral-2",
    name: "The Living Canvas",
    category: "funeral",
    price: 0,
    image: "assets/images/funeral/portrait-oldman.jpg",
    templatePath: "templates/funeral/funeral-template-2.html",
    design: "Warm Tribute",
    layout: "wide",
    tags: ["tribute", "warm", "elegant"],
  },
  {
    id: "funeral-3",
    name: "In Loving Memory",
    category: "funeral",
    price: 0,
    image: "assets/images/funeral/portrait-gp.jpg",
    templatePath: "templates/funeral/funeral-template-3.html",
    design: "Dramatic Slides",
    layout: "tall",
    tags: ["memorial", "slides", "modern"],
  },
];

const state = {
  templates: [],
  filtered: [],
  activeCategory: "all",
  searchText: "",
  currency: "AED",
};

const BASE_CURRENCY = "USD";
// Guest-first marketplace flow: users can edit first, auth/payment happen in Studio.
const FLOW_GUEST_STUDIO_ENABLED = true;

const CURRENCY_CONFIG = {
  AED: { rate: 3.67, locale: "en-AE", currency: "AED", prefix: "AED" },
  USD: { rate: 1, locale: "en-US", currency: "USD", prefix: "$" },
  INR: { rate: 83.2, locale: "en-IN", currency: "INR", prefix: "INR" },
  GBP: { rate: 0.79, locale: "en-GB", currency: "GBP", prefix: "GBP" },
};

const refs = {
  templateGrid: document.getElementById("templateGrid"),
  templateSearch: document.getElementById("templateSearch"),
  categoryFilter: document.getElementById("categoryFilter"),
  resultsCount: document.getElementById("resultsCount"),
  previewModal: document.getElementById("previewModal"),
  previewImage: document.getElementById("previewImage"),
  previewCategory: document.getElementById("previewCategory"),
  previewTitle: document.getElementById("previewTitle"),
  previewPrice: document.getElementById("previewPrice"),
  previewTags: document.getElementById("previewTags"),
  openTemplateBtn: document.getElementById("openTemplateBtn"),
  previewTemplateLink: document.getElementById("previewTemplateLink"),
  totalTemplates: document.getElementById("totalTemplates"),
  totalCategories: document.getElementById("totalCategories"),
  priceBand: document.getElementById("priceBand"),
  currencyButtons: document.querySelectorAll(".currency-btn"),
  authPromptModal: document.getElementById("authPromptModal"),
  authPromptLoginBtn: document.getElementById("authPromptLoginBtn"),
  authPromptSignupBtn: document.getElementById("authPromptSignupBtn"),
};

if (typeof window !== "undefined") {
  window.TEMPLATE_CATALOG = TEMPLATE_CATALOG;
}

if (refs.templateGrid && refs.templateSearch && refs.categoryFilter) {
  initialize();
}

function initialize() {
  const persistedCurrency = localStorage.getItem("invioCurrency");
  if (persistedCurrency && CURRENCY_CONFIG[persistedCurrency]) {
    state.currency = persistedCurrency;
  }

  setActiveCurrencyButton();

  bindEvents();
  state.templates = TEMPLATE_CATALOG.map(normalizeTemplate).filter(
    (item) => item.id,
  );
  updateSummaryMetrics();
  renderCategoryButtons();
  applyFilters();
  maybeShowAuthPrompt();
}

function bindEvents() {
  refs.currencyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextCurrency = button.dataset.currency;
      if (!CURRENCY_CONFIG[nextCurrency] || nextCurrency === state.currency) {
        return;
      }

      state.currency = nextCurrency;
      localStorage.setItem("invioCurrency", state.currency);
      setActiveCurrencyButton();

      updateSummaryMetrics();
      renderGrid();

      if (!refs.previewModal.classList.contains("is-hidden")) {
        const previewTemplateId = refs.openTemplateBtn.dataset.templateId;
        const template = state.templates.find(
          (item) => item.id === previewTemplateId,
        );
        if (template) {
          refs.previewPrice.textContent = formatPrice(template.price);
        }
      }
    });
  });

  refs.templateSearch.addEventListener("input", (event) => {
    state.searchText = event.target.value.trim().toLowerCase();
    applyFilters();
  });

  refs.categoryFilter.addEventListener("click", (event) => {
    const targetButton = event.target.closest("button[data-category]");
    if (!targetButton) {
      return;
    }

    state.activeCategory = targetButton.dataset.category;
    setActiveCategoryButton();
    applyFilters();
  });

  refs.templateGrid.addEventListener("click", (event) => {
    const previewButton = event.target.closest("button[data-preview-id]");
    const card = event.target.closest("article[data-template-id]");
    const templateId =
      previewButton?.dataset.previewId || card?.dataset.templateId;

    if (!templateId) {
      return;
    }

    const template = state.templates.find((item) => item.id === templateId);
    if (template) {
      openPreview(template);
    }
  });

  refs.templateGrid.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const card = event.target.closest("article[data-template-id]");
    if (!card) {
      return;
    }

    event.preventDefault();
    const template = state.templates.find(
      (item) => item.id === card.dataset.templateId,
    );
    if (template) {
      openPreview(template);
    }
  });

  refs.previewModal.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-close='true']");
    if (closeTarget) {
      closePreview();
    }
  });

  refs.authPromptModal?.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-auth-close='true']");
    if (closeTarget) {
      closeAuthPrompt();
    }
  });

  refs.authPromptLoginBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.href = buildAuthUrl(false);
  });

  refs.authPromptSignupBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.href = buildAuthUrl(true);
  });

  refs.openTemplateBtn.addEventListener("click", () => {
    const templateId = refs.openTemplateBtn.dataset.templateId;
    const templateName = refs.openTemplateBtn.dataset.templateName;
    if (!templateId) {
      return;
    }

    const params = new URLSearchParams({
      template: templateId,
      name: templateName || "Template",
    });
    const studioPath = `/pages/studio/index.html?${params.toString()}`;

    // Payment/checkout flow is temporarily disabled while Studio preview is being stabilized.
    window.location.href = studioPath;
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      !refs.previewModal.classList.contains("is-hidden")
    ) {
      closePreview();
    }
  });
}

function normalizeTemplate(template) {
  const normalizedPrice = Number(template.price);

  return {
    id: String(template.id || ""),
    name: String(template.name || "Untitled Template"),
    category: String(template.category || "other").toLowerCase(),
    design: String(template.design || "Signature Style"),
    layout: String(template.layout || "tall").toLowerCase(),
    price: Number.isFinite(normalizedPrice) ? normalizedPrice : null,
    image: String(template.image || ""),
    templatePath: String(template.templatePath || ""),
    tags: Array.isArray(template.tags)
      ? template.tags.map((tag) => String(tag).toLowerCase())
      : [],
    trending: Boolean(template.trending),
    isNew: Boolean(template.isNew),
  };
}

function renderCategoryButtons() {
  const categorySet = new Set();
  state.templates.forEach((template) => {
    if (template.category) {
      categorySet.add(template.category);
    }
  });

  const categories = ["all", ...Array.from(categorySet).sort(), "trending"];

  refs.categoryFilter.innerHTML = categories
    .map((category) => {
      const label = category === "all" ? "All" : capitalize(category);
      const isActive = category === state.activeCategory;
      return `<button class="category-btn${isActive ? " active" : ""}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(label)}</button>`;
    })
    .join("");
}

function setActiveCategoryButton() {
  refs.categoryFilter
    .querySelectorAll("button[data-category]")
    .forEach((button) => {
      const isActive = button.dataset.category === state.activeCategory;
      button.classList.toggle("active", isActive);
    });
}

function applyFilters() {
  state.filtered = state.templates.filter((template) => {
    return matchesCategory(template) && matchesSearch(template);
  });

  renderGrid();
  updateResultsCount();
}

function matchesCategory(template) {
  if (state.activeCategory === "all") {
    return true;
  }

  if (state.activeCategory === "trending") {
    return template.trending;
  }

  return template.category === state.activeCategory;
}

function matchesSearch(template) {
  if (!state.searchText) {
    return true;
  }

  const searchable = [
    template.name,
    template.category,
    template.design,
    ...template.tags,
  ]
    .join(" ")
    .toLowerCase();

  return searchable.includes(state.searchText);
}

function renderGrid() {
  refs.templateGrid.innerHTML = "";

  if (!state.filtered.length) {
    refs.templateGrid.innerHTML =
      '<div class="empty-state">No templates match your filters. Try another category or search term.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  state.filtered.forEach((template) => {
    const card = document.createElement("article");
    card.className = getCardClassName(template);
    card.dataset.templateId = template.id;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Preview ${template.name}`);

    const badgeLabel = template.trending
      ? "Trending"
      : template.isNew
        ? "New"
        : "";

    const tagMarkup = template.tags
      .slice(0, 3)
      .map((tag) => `<span class="tag">${escapeHtml(capitalize(tag))}</span>`)
      .join("");

    card.innerHTML = `
      <div class="thumbnail">
        <img src="${escapeHtml(template.image)}" alt="${escapeHtml(template.name)} thumbnail" loading="lazy" decoding="async" />
        ${badgeLabel ? `<span class="badge">${badgeLabel}</span>` : ""}
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(template.name)}</h3>
        <p class="card-design">${escapeHtml(template.design)}</p>
        <div class="card-meta">
          <span class="category">${escapeHtml(capitalize(template.category))}</span>
          <span class="price">${formatPrice(template.price)}</span>
        </div>
        <div class="tag-row">${tagMarkup}</div>
        <button class="card-action" type="button" data-preview-id="${escapeHtml(template.id)}">
          Preview Template
        </button>
      </div>
    `;

    fragment.appendChild(card);
  });

  refs.templateGrid.appendChild(fragment);
}

function getCardClassName(template) {
  const classes = ["template-card"];
  const layout = template.layout;

  if (layout === "cinematic") {
    classes.push("layout-cinematic");
  } else if (layout === "wide") {
    classes.push("layout-wide");
  } else if (layout === "square") {
    classes.push("layout-square");
  } else {
    classes.push("layout-tall");
  }

  return classes.join(" ");
}

function updateResultsCount() {
  const count = state.filtered.length;
  refs.resultsCount.textContent = `${count} template${count === 1 ? "" : "s"}`;
}

function updateSummaryMetrics() {
  if (!state.templates.length) {
    refs.totalTemplates.textContent = "0";
    refs.totalCategories.textContent = "0";
    refs.priceBand.textContent = "TBD";
    return;
  }

  const categories = new Set(state.templates.map((item) => item.category));
  const prices = state.templates
    .map((item) => item.price)
    .filter(Number.isFinite);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  refs.totalTemplates.textContent = String(state.templates.length);
  refs.totalCategories.textContent = String(categories.size);
  refs.priceBand.textContent = prices.length
    ? `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
    : "TBD";
}

function openPreview(template) {
  refs.previewImage.src = template.image;
  refs.previewImage.alt = `${template.name} preview`;
  refs.previewCategory.textContent = capitalize(template.category);
  refs.previewTitle.textContent = template.name;
  refs.previewPrice.textContent = formatPrice(template.price);
  refs.previewTags.textContent = template.tags.length
    ? `Design: ${template.design} | Tags: ${template.tags.map(capitalize).join(" / ")}`
    : `Design: ${template.design}`;

  refs.openTemplateBtn.dataset.templateId = template.id;
  refs.openTemplateBtn.dataset.templateName = template.name;
  refs.openTemplateBtn.disabled = !template.id;

  if (refs.previewTemplateLink) {
    refs.previewTemplateLink.href = template.templatePath || "#";
    refs.previewTemplateLink.setAttribute(
      "aria-disabled",
      String(!template.templatePath),
    );
    refs.previewTemplateLink.tabIndex = template.templatePath ? 0 : -1;
  }

  refs.previewModal.classList.remove("is-hidden");
  document.body.style.overflow = "hidden";
}

function closePreview() {
  refs.previewModal.classList.add("is-hidden");
  document.body.style.overflow = "";
}

function maybeShowAuthPrompt() {
  if (FLOW_GUEST_STUDIO_ENABLED) {
    return;
  }

  if (!refs.authPromptModal || isUserAuthenticated()) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("authPrompt") !== "1") {
    return;
  }

  refs.authPromptModal.classList.remove("is-hidden");
  document.body.style.overflow = "hidden";
}

function closeAuthPrompt() {
  if (!refs.authPromptModal) {
    return;
  }

  refs.authPromptModal.classList.add("is-hidden");
  document.body.style.overflow = "";
}

function isUserAuthenticated() {
  const token = localStorage.getItem("authToken");
  const userRaw = localStorage.getItem("authUser");

  if (!token || !userRaw) {
    return false;
  }

  try {
    const parsed = JSON.parse(userRaw);
    return Boolean(parsed && typeof parsed === "object");
  } catch {
    return false;
  }
}

function buildAuthUrl(openSignup = false, redirectPath = "") {
  const params = new URLSearchParams();

  if (redirectPath) {
    params.set("redirect", redirectPath);
  }

  if (openSignup) {
    params.set("mode", "signup");
  }

  const query = params.toString();
  return query ? `/pages/auth/index.html?${query}` : "/pages/auth/index.html";
}

function setActiveCurrencyButton() {
  refs.currencyButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.currency === state.currency,
    );
  });
}

function formatPrice(price) {
  if (!Number.isFinite(Number(price))) {
    return "Price TBD";
  }

  const config =
    CURRENCY_CONFIG[state.currency] || CURRENCY_CONFIG[BASE_CURRENCY];
  const convertedPrice = Number(price) * config.rate;

  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(convertedPrice);
}

function capitalize(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  const siteNav = document.querySelector(".site-nav");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", !isExpanded);
      navLinks.classList.toggle("is-open");
      if (siteNav) {
        siteNav.classList.toggle("menu-open");
      }
    });
  }
});
