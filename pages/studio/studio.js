/**
 * INVIO Studio Editor - Main Controller
 * Orchestrates template loading, state management, and event handling
 */

const _isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_URL =
  window.__INVIO_API_URL__ ||
  (_isLocalhost
    ? "http://localhost:4000"
    : "https://invio-backend-znac.onrender.com");
const PURCHASED_STORAGE_KEY = "invio_purchased_templates";

class StudioEditor {
  constructor() {
    this.state = null;
    this.selectedElement = null;
    this.templateFrame = null;
    this.isDirty = false;
    this.saveTimeout = null;
    this.autoSaveInterval = null;
    this.isImageUploading = false;
    this.originalValues = { text: {}, images: {}, colors: {} };

    this.init();
  }

  async init() {
    try {
      const params = new URLSearchParams(window.location.search);
      const rawTemplateId = params.get("template");
      const templateId = this.getCanonicalTemplateId(rawTemplateId);
      const inviteId = params.get("id");

      if (!templateId) {
        this.showToast("Missing template ID", "error");
        return;
      }

      this.state = new EditorState(templateId, inviteId);
      this.hasPersistentInviteId = Boolean(inviteId);

      this.cacheElements();
      this.bindEvents();
      this.changeDevice("desktop");

      await this.loadExistingInvitation(inviteId);
      await this.loadTemplate(templateId);
      this.applyStoredEdits();

      this.startAutoSave();

      if (this.state.data.slug) {
        document.getElementById("invitationName").value = this.state.data.slug;
      }

      if (params.get("publishIntent") === "1" && this.isAuthenticated()) {
        console.log("[STUDIO] Processing publishIntent...");
        // Wait for state to stabilize and then open modal/checkout
        setTimeout(() => this.openPublishModal(), 800);
      }

      console.log("âœ“ Studio initialized");
    } catch (error) {
      console.error("âœ- Studio init failed:", error);
      this.showToast("Failed to initialize editor", "error");
    }
  }

  cacheElements() {
    this.els = {
      frame: document.getElementById("templateFrame"),
      canvas: document.querySelector(".editor-canvas"),
      invitationName: document.getElementById("invitationName"),
      publishBtn: document.getElementById("publishBtn"),
      publishModal: document.getElementById("publishModal"),
      successModal: document.getElementById("successModal"),
      editorTitle: document.getElementById("editorTitle"),
      saveIndicator: document.getElementById("saveIndicator"),
      saveIcon: document.getElementById("saveIcon"),
      toastContainer: document.getElementById("toastContainer"),
      deviceBtns: document.querySelectorAll(".device-btn"),
      deviceLabel: document.getElementById("deviceLabel"),
      textControls: document.getElementById("textControls"),
      imageControls: document.getElementById("imageControls"),
      colorControls: document.getElementById("colorControls"),
      textInput: document.getElementById("textInput"),
      textLabel: document.getElementById("textLabel"),
      charCount: document.getElementById("charCount"),
      imageDropZone: document.getElementById("imageDropZone"),
      imageUpload: document.getElementById("imageUpload"),
      imagePreview: document.getElementById("imagePreview"),
      previewImg: document.getElementById("previewImg"),
      clearImageBtn: document.getElementById("clearImageBtn"),
      colorInput: document.getElementById("colorInput"),
      colorHex: document.getElementById("colorHex"),
      resetColorBtn: document.getElementById("resetColorBtn"),
      publishSlug: document.getElementById("publishSlug"),
      slugPrefix: document.querySelector(".slug-prefix"),
      confirmPublishBtn: document.getElementById("confirmPublishBtn"),
      shareLink: document.getElementById("shareLink"),
      copyLinkBtn: document.getElementById("copyLinkBtn"),
      undoBtn: document.getElementById("undoBtn"),
      redoBtn: document.getElementById("redoBtn"),
      tabBtns: document.querySelectorAll(".tab-btn"),
      tabContents: document.querySelectorAll(".tab-content"),
      layersList: document.getElementById("layersList"),
      rsvpToggle: document.getElementById("rsvpToggle"),
      rsvpTitle: document.getElementById("rsvpTitle"),
      mapsToggle: document.getElementById("mapsToggle"),
      mapsAddress: document.getElementById("mapsAddress"),
      rsvpSettings: document.getElementById("rsvpSettings"),
      mapsSettings: document.getElementById("mapsSettings"),
    };
  }

  bindEvents() {
    this.els.publishBtn.addEventListener("click", () =>
      this.openPublishModal(),
    );
    document.querySelectorAll('[data-close="true"]').forEach((btn) => {
      btn.addEventListener("click", () => this.closeAllModals());
    });
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", () => this.closeAllModals());
    });
    this.els.deviceBtns.forEach((btn) => {
      btn.addEventListener("click", () =>
        this.changeDevice(btn.dataset.device),
      );
    });
    this.els.invitationName.addEventListener("blur", (e) => {
      this.state.updateData("slug", e.target.value);
      this.markDirty();
    });
    this.els.textInput.addEventListener("input", (e) => {
      if (this.selectedElement) this.updateText(e.target.value);
      this.els.charCount.textContent = `${e.target.value.length} / 200`;
    });
    this.els.textInput.addEventListener("focus", () =>
      this.state.takeSnapshot(),
    );
    this.els.textInput.addEventListener("blur", () => this.markDirty());

    this.els.imageDropZone.addEventListener("click", () =>
      this.isImageUploading ? null : this.els.imageUpload.click(),
    );
    this.els.imageDropZone.addEventListener("dragover", (e) => {
      if (this.isImageUploading) return;
      e.preventDefault();
      this.els.imageDropZone.style.borderColor = "var(--accent)";
    });
    this.els.imageDropZone.addEventListener("dragleave", () => {
      this.els.imageDropZone.style.borderColor = "";
    });
    this.els.imageDropZone.addEventListener("drop", (e) => {
      if (this.isImageUploading) return;
      e.preventDefault();
      this.els.imageDropZone.style.borderColor = "";
      if (e.dataTransfer.files[0])
        this.handleImageUpload(e.dataTransfer.files[0]);
    });
    this.els.imageUpload.addEventListener("change", (e) => {
      if (this.isImageUploading) return;
      if (e.target.files[0]) this.handleImageUpload(e.target.files[0]);
    });
    this.els.clearImageBtn.addEventListener("click", () => {
      if (this.isImageUploading) return;
      this.clearImage();
    });

    this.els.colorInput.addEventListener("input", (e) => {
      this.updateColor(e.target.value);
      this.els.colorHex.value = e.target.value;
    });
    this.els.colorInput.addEventListener("mousedown", () =>
      this.state.takeSnapshot(),
    );
    this.els.colorHex.addEventListener("input", (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        this.els.colorInput.value = e.target.value;
        this.updateColor(e.target.value);
      }
    });
    this.els.resetColorBtn.addEventListener("click", () => this.resetColor());
    this.els.confirmPublishBtn.addEventListener("click", () =>
      this.publishInvite(),
    );
    this.els.publishSlug?.addEventListener("input", (e) => {
      e.target.value = this.normalizePublicSlug(e.target.value);
    });
    this.els.copyLinkBtn.addEventListener("click", () =>
      this.copyToClipboard(),
    );

    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        this.undo();
      }
      if (
        (e.ctrlKey && e.key === "y") ||
        (e.ctrlKey && e.shiftKey && e.key === "Z")
      ) {
        e.preventDefault();
        this.redo();
      }
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        this.saveNow();
      }
      if (e.key === "Escape") this.deselectElement();
    });

    this.els.undoBtn.addEventListener("click", () => this.undo());
    this.els.redoBtn.addEventListener("click", () => this.redo());

    this.els.tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab));
    });

    this.els.rsvpToggle.addEventListener("change", (e) => {
      this.state.updateInteraction("rsvp", "enabled", e.target.checked);
      this.els.rsvpSettings.classList.toggle("hidden", !e.target.checked);
      this.refreshInteractionBlocks();
    });
    this.els.rsvpTitle.addEventListener("input", (e) => {
      this.state.updateInteraction("rsvp", "title", e.target.value);
      this.refreshInteractionBlocks();
    });
    this.els.mapsToggle.addEventListener("change", (e) => {
      this.state.updateInteraction("maps", "enabled", e.target.checked);
      this.els.mapsSettings.classList.toggle("hidden", !e.target.checked);
      this.refreshInteractionBlocks();
    });
    this.els.mapsAddress.addEventListener("input", (e) => {
      this.state.updateInteraction("maps", "address", e.target.value);
      this.refreshInteractionBlocks();
    });

    this.state.on("historyChange", (e) => {
      this.els.undoBtn.disabled = !e.canUndo;
      this.els.redoBtn.disabled = !e.canRedo;
    });
    this.state.on("stateRestored", () => this.syncUItoState());
  }

  async loadTemplate(templateId) {
    try {
      const templatePath = this.getTemplatePathById(templateId);
      if (!templatePath) throw new Error(`Unknown template: ${templateId}`);

      const templateUrl = new URL(templatePath, window.location.href).href;
      const response = await fetch(templateUrl, { cache: "no-store" });

      if (!response.ok)
        throw new Error(`Failed to load template: ${templateUrl}`);

      const templateHtml = await response.text();

      // CRITICAL FIX: No longer stripping scripts! This allows the template
      // to render exactly as it does in Live Preview (animations and interactions work natively).
      const framedHtml = this.injectBaseHref(templateHtml, templateUrl);

      this.els.frame.removeAttribute("src");
      this.els.frame.removeAttribute("srcdoc");
      this.els.frame.onload = null;
      this.els.frame.onerror = null;

      this.els.frame.src = "about:blank";

      await new Promise((resolve) => {
        const checkReady = () => {
          try {
            const frameDoc = this.els.frame.contentDocument;
            if (frameDoc && frameDoc.readyState === "complete") resolve();
            else setTimeout(checkReady, 50);
          } catch (e) {
            setTimeout(checkReady, 50);
          }
        };
        checkReady();
      });

      const frameDoc = this.els.frame.contentDocument;
      frameDoc.open();
      frameDoc.write(framedHtml);
      frameDoc.close();

      await new Promise((resolve) => {
        setTimeout(() => {
          this.injectSecurityGuard();
          resolve();
        }, 300); // Given extra time for scripts to build the template naturally
      });

      this.injectEditorStyles();

      this.scanFrameElements();
      this.updateLayersPanel();
      this.attachFrameEvents();
      this.refreshInteractionBlocks();

      const templateName = this.getTemplateNameById(templateId);
      this.els.editorTitle.textContent = `Customize: ${templateName}`;
      this.showToast(`${templateName} loaded`, "success");
    } catch (error) {
      console.error("âœ- Template load failed:", error);
      this.showToast("Failed to load template: " + error.message, "error");
    }
  }

  injectBaseHref(html, templateUrl) {
    const baseTag = `<base href="${templateUrl}">`;
    if (/<base\s/i.test(html)) return html.replace(/<base\s[^>]*>/i, baseTag);
    if (/<head\b[^>]*>/i.test(html))
      return html.replace(/<head\b([^>]*)>/i, `<head$1>${baseTag}`);
    return `${baseTag}${html}`;
  }

  /**
   * Applies all edits stored in state to the visible iframe content.
   * Essential for restoring saved versions when opening existing invitations.
   */
  applyStoredEdits() {
    const frameDoc = this.els.frame.contentDocument;
    if (!frameDoc || !this.state.data.edits) return;

    const { text, images, colors } = this.state.data.edits;

    // Apply Text Edits
    if (text) {
      Object.entries(text).forEach(([selector, val]) => {
        const el = frameDoc.querySelector(selector);
        if (el) el.textContent = val;
      });
    }

    // Apply Image Edits
    if (images) {
      Object.entries(images).forEach(([selector, src]) => {
        const el = frameDoc.querySelector(selector);
        if (el) {
          if (el.tagName === "IMG") el.src = src;
          else el.style.backgroundImage = `url("${src}")`;
        }
      });
    }

    // Apply Color Edits
    if (colors) {
      Object.entries(colors).forEach(([selector, color]) => {
        const el = frameDoc.querySelector(selector);
        if (el) el.style.color = color;
      });
    }

    // Interactions
    const interactions = this.state.data.interactions;
    if (interactions?.rsvp?.enabled) {
      const rsvp = frameDoc.getElementById("rsvp-section");
      if (rsvp) rsvp.style.display = "block";
    }

    console.log("Studio: Applied stored edits to iframe content");
  }

  injectEditorStyles() {
    try {
      const frameDoc = this.els.frame.contentDocument;
      if (!frameDoc || !frameDoc.head) return;

      const existing = frameDoc.getElementById("__invio-editor-styles");
      if (existing) existing.remove();

      const style = frameDoc.createElement("style");
      style.id = "__invio-editor-styles";
      style.textContent = [
        ":root { --accent: #BFA77A; }",
        "[data-edit] { cursor: pointer !important; transition: outline 0.12s ease; }",
        "/* Disable pointer events on canvas so scratch cards/particles don't block text editing */",
        "canvas:not([data-interactive-canvas='true']) { pointer-events: none !important; }",
        "/* Force .reveal elements to be visible in editor */",
        ".reveal, .reveal-up, .fade-in, .fade-up, .hidden-message, .reveal-image, .hidden, .split-line span { opacity: 1 !important; transform: none !important; visibility: visible !important; }",
      ].join("\n");
      frameDoc.head.appendChild(style);
    } catch (err) {
      console.warn("Could not inject editor styles:", err);
    }
  }

  getCanonicalTemplateId(rawId) {
    if (!rawId) return "wedding-1";
    const id = String(rawId).toLowerCase().trim();

    const templateMap = {
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
      "funeral-1": "../../templates/funeral/funeral-template-1.html",
      "funeral-2": "../../templates/funeral/funeral-template-2.html",
      "funeral-3": "../../templates/funeral/funeral-template-3.html",
    };

    // 1. Direct Match
    if (templateMap[id]) return id;

    // 2. Fuzzy ID Match (birthday_template_3 -> birthday-3)
    const simplifiedId = id
      .replace(/_template_/g, "-")
      .replace(/template/g, "")
      .replace(/[\s_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (templateMap[simplifiedId]) return simplifiedId;

    // 3. Filename Match
    for (const [key, path] of Object.entries(templateMap)) {
      if (path.toLowerCase().includes(id)) return key;
    }

    // 4. Category Fallback
    const category = simplifiedId.split("-")[0];
    const categories = ["academic", "birthday", "valentines", "wedding", "funeral"];
    if (categories.includes(category)) return `${category}-1`;

    return "wedding-1";
  }

  getTemplatePathById(templateId) {
    const id = this.getCanonicalTemplateId(templateId);
    const templateMap = {
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
      "funeral-1": "../../templates/funeral/funeral-template-1.html",
      "funeral-2": "../../templates/funeral/funeral-template-2.html",
      "funeral-3": "../../templates/funeral/funeral-template-3.html",
    };

    return templateMap[id] || templateMap["wedding-1"];
  }

  getTemplateNameById(templateId) {
    if (!templateId) return "Invitation";
    const id = String(templateId).toLowerCase().trim();
    const fuzzyId = id.replace(/[\s_]/g, "-");

    const names = {
      "academic-1": "Laurel Convocation",
      "academic-2": "Scholars Night",
      "academic-3": "Thesis Reception",
      "birthday-1": "Confetti Chronicle",
      "birthday-2": "Golden Milestone",
      "birthday-3": "Neon Storyline",
      "valentines-1": "Sunset Promise",
      "valentines-2": "Love Letter Evening",
      "valentines-3": "Forever After",
      "wedding-1": "Maharani Blossom",
      "wedding-2": "Ivory Vows",
      "wedding-3": "Aurelian Union",
      "wedding-4": "Shoreline Ceremony",
      "wedding-5": "Rosewood Keepsake",
      "funeral-1": "Cinematic Legacy",
      "funeral-2": "The Living Canvas",
      "funeral-3": "In Loving Memory",
    };

    if (names[id]) return names[id];
    if (names[fuzzyId]) return names[fuzzyId];

    const category = fuzzyId.split("-")[0];
    const fallbackNames = {
      academic: "Laurel Convocation",
      birthday: "Confetti Chronicle",
      valentines: "Sunset Promise",
      wedding: "Maharani Blossom",
      funeral: "Cinematic Legacy",
    };

    return fallbackNames[category] || "Invitation";
  }

  scanFrameElements() {
    try {
      const frameDoc = this.els.frame.contentDocument;
      if (!frameDoc) return;

      this.autoRegisterEditableElements(frameDoc);

      const editableElements = frameDoc.querySelectorAll("[data-edit]");
      this.editableElements = editableElements;

      this.originalValues = { text: {}, images: {}, colors: {} };
      editableElements.forEach((el) => {
        const id = el.getAttribute("data-id");
        const type = el.getAttribute("data-edit");
        if (type === "text") this.originalValues.text[id] = el.textContent;
        if (type === "image") this.originalValues.images[id] = el.src;
        if (type === "color") {
          this.originalValues.colors[id] =
            el.style.color || getComputedStyle(el).color;
        }
      });

      editableElements.forEach((element) => {
        element.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.selectElement(element);
        });

        element.addEventListener("mouseenter", () => {
          element.style.outline = "2px solid #BFA77A";
          element.style.outlineOffset = "2px";
        });

        element.addEventListener("mouseleave", () => {
          if (element !== this.selectedElement) {
            element.style.outline = "";
          }
        });
      });
    } catch (error) {
      console.error("âœ- Element scan failed:", error);
    }
  }

  autoRegisterEditableElements(frameDoc) {
    const usedIds = new Set(
      Array.from(frameDoc.querySelectorAll("[data-id]"))
        .map((el) => el.getAttribute("data-id"))
        .filter(Boolean),
    );

    let autoImageCount = 0;
    let autoTextCount = 0;

    frameDoc.querySelectorAll("img").forEach((img) => {
      if (img.hasAttribute("data-edit")) return;
      const seed = img.getAttribute("alt") || img.className || "image";
      const dataId = this.generateUniqueDataId(seed, usedIds, "image");
      img.setAttribute("data-edit", "image");
      img.setAttribute("data-id", dataId);
      autoImageCount += 1;
    });

    const textSelectors =
      "h1,h2,h3,h4,h5,h6,p,span,small,strong,em,a,li,label,button,figcaption,blockquote,td,th,div";

    frameDoc.querySelectorAll(textSelectors).forEach((el) => {
      if (el.hasAttribute("data-edit") || el.closest("[data-edit]")) return;
      if (!this.isEditableTextCandidate(el)) return;

      const seed = el.className || el.tagName.toLowerCase() || "text";
      const dataId = this.generateUniqueDataId(seed, usedIds, "text");
      el.setAttribute("data-edit", "text");
      el.setAttribute("data-id", dataId);
      autoTextCount += 1;
    });
  }

  isEditableTextCandidate(el) {
    if (!el || !el.textContent) return false;
    const text = el.textContent.replace(/\s+/g, " ").trim();
    if (!text) return false;

    if (
      el.closest(
        "script,style,noscript,head,svg,canvas,iframe,.modal-backdrop,.canvas-overlay",
      )
    )
      return false;

    const nonBreakChildren = Array.from(el.children).filter(
      (child) => child.tagName !== "BR",
    );
    if (el.tagName === "DIV" && nonBreakChildren.length > 0) return false;
    if (el.children.length > 0 && nonBreakChildren.length > 1) return false;
    if (text.length > 220 && el.tagName === "DIV") return false;

    return true;
  }

  generateUniqueDataId(seed, usedIds, fallbackPrefix) {
    const normalizedSeed = String(seed || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const base = normalizedSeed || fallbackPrefix;
    let candidate = base;
    let counter = 2;

    while (usedIds.has(candidate)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }

    usedIds.add(candidate);
    return candidate;
  }

  attachFrameEvents() {
    try {
      const frameDoc = this.els.frame.contentDocument;
      if (!frameDoc) return;

      frameDoc.addEventListener("click", (e) => {
        if (!e.target.closest("[data-edit]")) {
          this.deselectElement();
        }
      });
    } catch (error) {
      console.warn("Cannot attach frame events:", error);
    }
  }

  selectElement(element) {
    if (this.selectedElement) this.selectedElement.style.outline = "";

    this.selectedElement = element;
    this.selectedElement.style.outline = "2px solid #BFA77A";

    const editType = element.getAttribute("data-edit");
    const dataId = element.getAttribute("data-id");

    this.hideAllControls();

    if (editType === "text") this.showTextControls(element, dataId);
    else if (editType === "image") this.showImageControls(element, dataId);
    else if (editType === "color") this.showColorControls(element, dataId);
  }

  deselectElement() {
    if (this.selectedElement) {
      this.selectedElement.style.outline = "";
      this.selectedElement = null;
    }
    this.hideAllControls();
  }

  showTextControls(element, dataId) {
    this.els.textLabel.textContent = dataId || "Text";
    this.els.textInput.value = element.textContent;
    this.els.charCount.textContent = `${element.textContent.length} / 200`;
    this.els.textControls.classList.remove("hidden");
    this.els.textInput.focus();
  }

  showImageControls(element, dataId) {
    let imageUrl = element.src;

    if (!imageUrl) {
      const frameWin = this.els.frame.contentDocument?.defaultView ?? window;
      const computed = frameWin.getComputedStyle(element);
      const bg = element.style.backgroundImage || computed.backgroundImage;
      if (bg && bg !== "none") {
        const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
        if (match) imageUrl = match[1];
      }
    }
    if (imageUrl && imageUrl !== "undefined" && !imageUrl.includes("about:blank")) {
      this.els.previewImg.src = imageUrl;
      this.els.imagePreview.classList.remove("hidden");
    }
    this.els.imageControls.classList.remove("hidden");
  }

  showColorControls(element, dataId) {
    const frameWin = this.els.frame.contentDocument?.defaultView ?? window;
    const computed = frameWin.getComputedStyle(element);
    const color = element.style.color || computed.color || "#000000";

    this.els.colorInput.value = this.rgbToHex(color);
    this.els.colorHex.value = this.rgbToHex(color);
    this.els.colorControls.classList.remove("hidden");
  }

  hideAllControls() {
    this.els.textControls.classList.add("hidden");
    this.els.imageControls.classList.add("hidden");
    this.els.colorControls.classList.add("hidden");
    this.els.imagePreview.classList.add("hidden");
  }

  updateText(value) {
    if (this.selectedElement) {
      this.selectedElement.textContent = value;
      const dataId = this.selectedElement.getAttribute("data-id");
      this.state.updateEdit("text", dataId, value);
      this.markDirty();
    }
  }

  async handleImageUpload(file) {
    if (this.isImageUploading) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      this.showToast("Only JPG, PNG, and WEBP allowed", "error");
      this.els.imageUpload.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.showToast("Image must be under 5MB", "error");
      this.els.imageUpload.value = "";
      return;
    }

    if (!this.isAuthenticated()) {
      this.redirectToAuth(false);
      return;
    }

    try {
      this.setImageUploadState(true);
      const uploadedUrl = await this.uploadImageFile(file);
      this.applyImage(uploadedUrl);
    } catch (error) {
      console.error("Image upload failed:", error);
      this.showToast(error.message || "Failed to upload image", "error");
    } finally {
      this.setImageUploadState(false);
      // Reset so selecting the same file again still triggers change.
      this.els.imageUpload.value = "";
    }
  }

  setImageUploadState(isUploading) {
    this.isImageUploading = isUploading;

    if (!this.els?.imageDropZone) return;

    const zone = this.els.imageDropZone;
    const zoneText = zone.querySelector("p");
    const zoneHint = zone.querySelector("small");

    if (!zone.dataset.defaultText && zoneText) {
      zone.dataset.defaultText = zoneText.textContent;
    }
    if (!zone.dataset.defaultHint && zoneHint) {
      zone.dataset.defaultHint = zoneHint.textContent;
    }

    zone.classList.toggle("is-uploading", isUploading);
    zone.setAttribute("aria-busy", String(isUploading));
    this.els.imageUpload.disabled = isUploading;
    this.els.clearImageBtn.disabled = isUploading;

    if (zoneText) {
      zoneText.textContent = isUploading
        ? "Uploading image..."
        : zone.dataset.defaultText || "Drag image here or click to browse";
    }
    if (zoneHint) {
      zoneHint.textContent = isUploading
        ? "Please wait"
        : zone.dataset.defaultHint || "JPG, PNG, WEBP â€¢ Max 5MB";
    }
  }

  async uploadImageFile(file) {
    const token = this.getAuthToken();
    if (!token) throw new Error("Authentication required");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Upload failed");
    }

    const data = await response.json();
    if (!data?.url) throw new Error("Upload response missing URL");
    return data.url;
  }

  applyImage(dataUrl) {
    if (this.selectedElement) {
      this.state.takeSnapshot();
      const dataId = this.selectedElement.getAttribute("data-id");
      
      if (this.selectedElement.tagName === "IMG") {
        this.selectedElement.src = dataUrl;
        this.els.previewImg.src = dataUrl;
      } else {
        this.selectedElement.style.backgroundImage = `url("${dataUrl}")`;
        this.els.previewImg.src = dataUrl;
      }
      
      this.state.updateEdit("images", dataId, dataUrl);
      this.markDirty();
      this.showToast("Image updated", "success");
    }
  }

  clearImage() {
    if (this.selectedElement) {
      const dataId = this.selectedElement.getAttribute("data-id");
      if (this.selectedElement.tagName === "IMG") {
        this.selectedElement.src = "";
      } else {
        this.selectedElement.style.backgroundImage = "none";
      }
      this.state.updateEdit("images", dataId, "");
      this.els.imagePreview.classList.add("hidden");
      this.markDirty();
      this.showToast("Image cleared", "success");
    }
  }

  updateColor(hex) {
    if (this.selectedElement) {
      const dataId = this.selectedElement.getAttribute("data-id");
      this.selectedElement.style.setProperty("--" + dataId, hex);
      if (this.selectedElement.style.color !== "")
        this.selectedElement.style.color = hex;
      this.state.updateEdit("colors", dataId, hex);
      this.markDirty();
    }
  }

  resetColor() {
    if (this.selectedElement) {
      const dataId = this.selectedElement.getAttribute("data-id");
      this.selectedElement.style.removeProperty("--" + dataId);
      this.selectedElement.style.removeProperty("color");
      this.state.deleteEdit("colors", dataId);
      this.markDirty();
      this.showToast("Color reset", "success");
    }
  }

  changeDevice(device) {
    this.els.deviceBtns.forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.device === device),
    );
    this.els.frame.classList.remove(
      "device-desktop",
      "device-tablet",
      "device-mobile",
    );
    this.els.frame.classList.add(`device-${device}`);
    const labels = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" };
    this.els.deviceLabel.textContent = labels[device];
  }

  markDirty() {
    this.isDirty = true;
    this.els.saveIcon.classList.remove("visible");
    this.els.saveIndicator.textContent = "Saving...";
  }

  startAutoSave() {
    if (!this.isAuthenticated()) {
      this.els.saveIndicator.textContent = "Guest mode (save requires login)";
      return;
    }
    this.autoSaveInterval = setInterval(() => {
      if (this.isDirty) this.saveNow();
    }, 30000);
  }

  async saveNow() {
    if (!this.isAuthenticated()) {
      this.redirectToAuth(false);
      return;
    }
    try {
      const invitationId = await this.ensureBackendInvitation();
      const title =
        this.els.invitationName.value.trim() ||
        this.getTemplateNameById(this.state.data.templateId);

      await this.apiRequest(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          content: { edits: this.state.data.edits },
          interactions: this.state.data.interactions,
        }),
      });

      this.isDirty = false;
      this.els.saveIndicator.textContent = "All changes saved";
      this.els.saveIcon.classList.add("visible");
    } catch (error) {
      console.error("âœ- Save failed:", error);
      this.showToast("Failed to save", "error");
    }
  }

  async openPublishModal() {
    if (!this.isAuthenticated()) {
      this.redirectToAuth(true);
      return;
    }
    if (!this.isTemplatePurchased(this.state.data.templateId)) {
      await this.saveNow();
      if (!this.state.data.inviteId) {
        this.showToast(
          "Cannot proceed to payment without a saved invitation",
          "error",
        );
        return;
      }
      this.redirectToCheckoutForPayment(this.state.data.inviteId);
      return;
    }
    const name = this.els.invitationName.value || "invitation";
    this.els.publishSlug.value = this.normalizePublicSlug(name);
    if (this.els.slugPrefix)
      this.els.slugPrefix.textContent = `${window.location.origin}/invite?slug=`;
    this.els.publishModal.classList.remove("hidden");
  }

  normalizePublicSlug(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  async publishInvite() {
    const slug = this.normalizePublicSlug(this.els.publishSlug.value);
    this.els.publishSlug.value = slug;
    if (!slug) {
      this.showToast("Please enter an invitation name", "error");
      return;
    }
    try {
      await this.saveNow();
      if (!this.state.data.inviteId) return;

      const invitationId = this.state.data.inviteId;
      const result = await this.apiRequest(
        `/api/invitations/${invitationId}/publish`,
        {
          method: "POST",
          body: JSON.stringify({ slug }),
        },
      );

      const inviteUrl = `/invite?slug=${encodeURIComponent(result.slug)}`;
      this.closeAllModals();
      this.els.shareLink.value = window.location.origin + inviteUrl;
      this.els.successModal.classList.remove("hidden");
      this.showToast("Invitation published!", "success");
    } catch (error) {
      console.error("âœ- Publish failed:", error);
      this.showToast("Failed to publish", "error");
    }
  }

  async loadExistingInvitation(inviteId) {
    if (!inviteId) return;
    if (!this.isAuthenticated()) {
      this.hasPersistentInviteId = false;
      return;
    }
    try {
      const invitation = await this.apiRequest(`/api/invitations/${inviteId}`);
      this.state.updateData("inviteId", invitation.id);
      this.state.updateData("slug", invitation.title || "");
      if (invitation.content?.edits)
        this.state.data.edits = invitation.content.edits;
      if (invitation.interactions)
        this.state.data.interactions = {
          ...this.state.data.interactions,
          ...invitation.interactions,
        };
      if (invitation.title) this.els.invitationName.value = invitation.title;
      
      // CRITICAL: Ensure templateId is updated from invitation
      if (invitation.template_id) {
        this.state.updateData("templateId", invitation.template_id);
        // Also reload the frame if it mismatch? 
        // Actually this.init calls loadExistingInvitation BEFORE any frame load? 
        // No, loadExistingInvitation is called first. 
        // Then caller likely needs to load the template.
      }
    } catch (error) {
      console.warn("Could not load invitation by id:", error.message);
      this.hasPersistentInviteId = false;
    }
  }

  async ensureBackendInvitation() {
    if (this.hasPersistentInviteId && this.state.data.inviteId)
      return this.state.data.inviteId;
    const title =
      this.els.invitationName.value.trim() ||
      this.getTemplateNameById(this.state.data.templateId);
    const created = await this.apiRequest("/api/invitations", {
      method: "POST",
      body: JSON.stringify({ title, templateId: this.state.data.templateId }),
    });
    this.state.updateData("inviteId", created.id);
    this.state.updateData("slug", created.title || title);
    this.hasPersistentInviteId = true;
    const params = new URLSearchParams(window.location.search);
    params.set("template", this.state.data.templateId);
    params.set("id", created.id);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
    return created.id;
  }

  async apiRequest(endpoint, options = {}) {
    let token = this.getAuthToken();
    if (!token) throw new Error("Not authenticated");
    let response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (response.status === 401) {
      const refreshed = await this.tryRefreshAuthToken();
      if (refreshed) {
        token = this.getAuthToken();
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
          },
        });
      }
    }
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || "Request failed");
    }
    return response.json();
  }

  async tryRefreshAuthToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return false;
      const data = await response.json();
      const accessToken = data?.session?.access_token;
      const nextRefreshToken = data?.session?.refresh_token;
      if (!accessToken) return false;
      localStorage.setItem("authToken", accessToken);
      if (nextRefreshToken)
        localStorage.setItem("authRefreshToken", nextRefreshToken);
      return true;
    } catch (error) {
      console.warn("Token refresh failed:", error);
      return false;
    }
  }

  getAuthToken() {
    return localStorage.getItem("authToken");
  }
  getRefreshToken() {
    return localStorage.getItem("authRefreshToken");
  }
  isAuthenticated() {
    return Boolean(this.getAuthToken());
  }
  buildStudioReturnPath(includePublishIntent = false) {
    const params = new URLSearchParams(window.location.search);
    params.set(
      "template",
      this.state?.data?.templateId || params.get("template") || "",
    );
    if (includePublishIntent) params.set("publishIntent", "1");
    return `/pages/studio/index.html?${params.toString()}`;
  }
  redirectToAuth(includePublishIntent = false) {
    const redirect = this.buildStudioReturnPath(includePublishIntent);
    const authParams = new URLSearchParams({ redirect });
    window.location.href = `/pages/auth/index.html?${authParams.toString()}`;
  }
  isTemplatePurchased(templateId) {
    const purchased = JSON.parse(
      localStorage.getItem(PURCHASED_STORAGE_KEY) || "[]",
    );
    const canonicalId = this.getCanonicalTemplateId(templateId);
    return Array.isArray(purchased) && purchased.includes(canonicalId);
  }
  redirectToCheckoutForPayment(invitationId) {
    const params = new URLSearchParams({
      template: this.getCanonicalTemplateId(this.state.data.templateId),
      name: this.getTemplateNameById(this.getCanonicalTemplateId(this.state.data.templateId)),
      invitationId: invitationId,
    });
    window.location.href = `/pages/checkout/index.html?${params.toString()}`;
  }

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.els.shareLink.value);
      this.showToast("Link copied!", "success");
    } catch {
      this.els.shareLink.select();
      document.execCommand("copy");
      this.showToast("Link copied!", "success");
    }
  }

  closeAllModals() {
    this.els.publishModal.classList.add("hidden");
    this.els.successModal.classList.add("hidden");
  }

  rgbToHex(rgb) {
    if (rgb.startsWith("#")) return rgb;
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (match) {
      const [, r, g, b] = match;
      return (
        "#" +
        [r, g, b]
          .map((x) => parseInt(x).toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase()
      );
    }
    return "#000000";
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.els.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  switchTab(tabId) {
    this.els.tabBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
      btn.setAttribute("aria-selected", btn.dataset.tab === tabId);
    });
    this.els.tabContents.forEach((content) => {
      content.classList.toggle("active", content.id === `${tabId}Tab`);
    });
    document.querySelector(".sidebar-sticky").scrollTop = 0;
  }

  undo() {
    const newState = this.state.undo();
    if (newState) {
      this.showToast("Undo performed", "info");
      this.markDirty();
    }
  }

  redo() {
    const newState = this.state.redo();
    if (newState) {
      this.showToast("Redo performed", "info");
      this.markDirty();
    }
  }

  syncUItoState() {
    console.log("ðŸ”„ Reconciling UI with State...");
    const edits = this.state.data.edits;
    const frameDoc = this.els.frame.contentDocument;
    if (!frameDoc || !this.editableElements) return;

    this.editableElements.forEach((el) => {
      const id = el.getAttribute("data-id");
      const type = el.getAttribute("data-edit");

      if (type === "text") {
        const val =
          edits.text[id] !== undefined
            ? edits.text[id]
            : this.originalValues.text[id];
        if (el.textContent !== val) el.textContent = val;
      } else if (type === "image") {
        const val =
          edits.images[id] !== undefined
            ? edits.images[id]
            : this.originalValues.images[id];
        if (el.src !== val) el.src = val;
      } else if (type === "color") {
        const val =
          edits.colors[id] !== undefined
            ? edits.colors[id]
            : this.originalValues.colors[id];
        el.style.setProperty("--" + id, val);
        if (el.style.color !== "") el.style.color = val;
      }
    });

    if (this.selectedElement) {
      const type = this.selectedElement.getAttribute("data-edit");
      if (type === "text") {
        this.els.textInput.value = this.selectedElement.textContent;
        this.els.charCount.textContent = `${this.selectedElement.textContent.length} / 200`;
      } else if (type === "color") {
        const hex = this.rgbToHex(
          this.selectedElement.style.color ||
            getComputedStyle(this.selectedElement).color,
        );
        this.els.colorInput.value = hex;
        this.els.colorHex.value = hex;
      }
    }

    const inter = this.state.data.interactions;
    this.els.rsvpToggle.checked = inter.rsvp.enabled;
    this.els.rsvpTitle.value = inter.rsvp.title;
    this.els.mapsToggle.checked = inter.maps.enabled;
    this.els.mapsAddress.value = inter.maps.address;

    this.els.rsvpSettings.classList.toggle("hidden", !inter.rsvp.enabled);
    this.els.mapsSettings.classList.toggle("hidden", !inter.maps.enabled);

    this.refreshInteractionBlocks();
    this.updateLayersPanel();
  }

  updateLayersPanel() {
    if (!this.editableElements) return;
    this.els.layersList.innerHTML = "";
    this.editableElements.forEach((el) => {
      const type = el.getAttribute("data-edit");
      const dataId = el.getAttribute("data-id");
      const item = document.createElement("div");
      item.className = "layer-item";
      if (el === this.selectedElement) item.classList.add("active");

      const iconClass = type === "text" ? "ph-text-t" : "ph-image";
      item.innerHTML = `<div class="layer-icon"><i class="ph ${iconClass}"></i></div><div class="layer-info"><span class="layer-name">${dataId}</span><span class="layer-type">${type}</span></div>`;

      item.addEventListener("click", () => {
        this.selectElement(el);
        this.switchTab("edit");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      this.els.layersList.appendChild(item);
    });
  }

  getTemplateDesign() {
    let tid = (this.state.data.templateId || "").toLowerCase();
    const path = this.getTemplatePathById(this.state.data.templateId);
    if (path) tid = path.split("/").pop().toLowerCase();

    const designs = {
      "wedding_template_1.html": {
        accent: "#d4af37",
        bg: "#ffffff",
        titleFont: "Playfair Display",
        bodyFont: "Baskervville",
        style:
          "border-radius: 0; border: 1px solid #d4af37; box-shadow: 0 10px 40px rgba(0,0,0,0.05);",
        mapFilter: "grayscale(1) contrast(1.2) brightness(0.9)",
      },
      "wedding_template_2.html": {
        accent: "#7c8c7c",
        bg: "#f9f7f2",
        titleFont: "Playfair Display",
        bodyFont: "Montserrat",
        style:
          "border-radius: 20px; border: none; box-shadow: 0 8px 30px rgba(0,0,0,0.03);",
        mapFilter: "sepia(20%) grayscale(0.5)",
      },
      "wedding_template_3.html": {
        accent: "#c5a059",
        bg: "#0a1a2f",
        titleFont: "Cormorant Garamond",
        bodyFont: "Montserrat",
        dark: true,
        style: "border-radius: 0; border: 2px solid #c5a059; padding: 60px;",
        mapFilter: "invert(90%) hue-rotate(180deg) grayscale(0.2)",
      },
      "wedding_template_4.html": {
        accent: "#8b1538",
        bg: "#fff5eb",
        titleFont: "Playfair Display",
        bodyFont: "Playfair Display",
        style:
          "border-radius: 22px; border: 1px solid rgba(139,21,56,0.25); box-shadow: 0 18px 36px rgba(87,16,36,0.12);",
        mapFilter: "saturate(0.9) sepia(15%)",
      },
      "wedding_template_5.html": {
        accent: "#5c0000",
        bg: "#e8dfd0",
        titleFont: "Mrs Saint Delafield",
        bodyFont: "Cormorant Garamond",
        style:
          "border-radius: 2px; border: none; box-shadow: 2px 2px 0 rgba(0,0,0,0.1); clip-path: polygon(0% 0%, 100% 0%, 98% 100%, 2% 98%);",
        mapFilter: "sepia(50%) contrast(1.1)",
      },
      "academic 1.html": {
        accent: "#ccff00",
        bg: "#0a0a0a",
        titleFont: "Orbitron",
        bodyFont: "Space Grotesk",
        dark: true,
        style:
          "border-radius: 12px; border: 1px solid #ccff00; backdrop-filter: blur(10px); box-shadow: 0 0 20px rgba(204,255,0,0.1);",
        mapFilter: "invert(100%) hue-rotate(180deg) brightness(0.8)",
      },
      "academic 2.html": {
        accent: "#00f2ff",
        bg: "#050505",
        titleFont: "Archivo Black",
        bodyFont: "Inter",
        dark: true,
        style:
          "border-radius: 0; border-left: 5px solid #00f2ff; background: rgba(255,255,255,0.02);",
        mapFilter: "invert(90%) hue-rotate(160deg)",
      },
      "academic 3.html": {
        accent: "#d4af37",
        bg: "#0a0b10",
        titleFont: "Playfair Display",
        bodyFont: "Space Grotesk",
        dark: true,
        style:
          "border-radius: 0; border-top: 1px solid #d4af37; border-bottom: 1px solid #d4af37;",
        mapFilter: "invert(100%) grayscale(100%) contrast(1.5)",
      },
      "birthday_template_1.html": {
        accent: "#ff5e78",
        bg: "#ffffff",
        titleFont: "Fredoka",
        bodyFont: "Montserrat",
        style: "border-radius: 20px; border: 3px solid #f0f0f0;",
        mapFilter: "saturate(1.5)",
      },
      "birthday_template_2.html": {
        accent: "#d4af37",
        bg: "#050505",
        titleFont: "hero2",
        bodyFont: "Montserrat",
        dark: true,
        style:
          "border-radius: 100px 100px 0 0; border: 1px solid rgba(212,175,55,0.2);",
        mapFilter: "grayscale(100%) brightness(0.7)",
      },
      "birthday_template_3.html": {
        accent: "#ffb6c1",
        bg: "#f3efe8",
        titleFont: "Courier New",
        bodyFont: "Courier New",
        style:
          "border-radius: 12px; border: 12px solid #fff; background: #fff; box-shadow: 15px 15px 50px rgba(0,0,0,0.15); transform: rotate(-1.5deg); overflow: hidden; padding: 0;",
        mapFilter: "sepia(30%) contrast(1.2) brightness(0.9) saturate(1.2)",
      },
      "template1.html": {
        accent: "#ff003c",
        bg: "#0a0004",
        titleFont: "Playfair Display",
        bodyFont: "Space Grotesk",
        dark: true,
        style:
          "border-radius: 8px; border: 1px solid #ff003c; box-shadow: 0 0 30px rgba(255,0,60,0.2);",
        mapFilter: "invert(100%) hue-rotate(320deg) brightness(0.8)",
      },
      "template2.html": {
        accent: "#ff5c8d",
        bg: "#fff0f5",
        titleFont: "Plus Jakarta Sans",
        bodyFont: "Plus Jakarta Sans",
        style:
          "border-radius: 30px; border: 1px solid rgba(255,255,255,0.8); backdrop-filter: blur(20px);",
        mapFilter: "hue-rotate(330deg) saturate(1.2)",
      },
      "template3.html": {
        accent: "#d6336c",
        bg: "#1a1a24",
        titleFont: "Shadows Into Light",
        bodyFont: "Poppins",
        dark: true,
        style:
          "border-radius: 20px; border: none; box-shadow: 0 10px 40px rgba(0,0,0,0.3);",
        mapFilter: "invert(90%) hue-rotate(280deg)",
      },
      "funeral-template-1.html": {
        accent: "#ffffff",
        bg: "#111111",
        titleFont: "Playfair Display",
        bodyFont: "Space Grotesk",
        dark: true,
        style: "border-radius: 4px; border: 1px solid #333;",
        mapFilter: "grayscale(100%)",
      },
      "funeral-template-2.html": {
        accent: "#d4af37",
        bg: "#fdfdfd",
        titleFont: "Cormorant Garamond",
        bodyFont: "Montserrat",
        style: "border-radius: 12px; border: 1px solid #eee;",
        mapFilter: "sepia(30%)",
      },
      "funeral-template-3.html": {
        accent: "#a3b1c6",
        bg: "#0f172a",
        titleFont: "Cinzel",
        bodyFont: "Inter",
        dark: true,
        style: "border-radius: 8px; border-top: 3px solid #a3b1c6;",
        mapFilter: "invert(90%) hue-rotate(200deg)",
      },
    };
    return designs[tid] || designs["wedding_template_1.html"];
  }

  refreshInteractionBlocks() {
    const frameDoc = this.els.frame.contentDocument;
    if (!frameDoc || !frameDoc.body) return;

    const inter = this.state.data.interactions;
    const design = this.getTemplateDesign();
    let tid = (this.state.data.templateId || "").toLowerCase();
    const templatePath = this.getTemplatePathById(this.state.data.templateId);
    if (templatePath) tid = templatePath.split("/").pop().toLowerCase();
    const isWeddingTemplate4 = tid === "wedding_template_4.html";

    let container = frameDoc.getElementById("__invio-interactions");
    if (!container) {
      container = frameDoc.createElement("div");
      container.id = "__invio-interactions";
      const firstScript = Array.from(frameDoc.body.children).find(
        (el) => el.tagName === "SCRIPT",
      );
      if (firstScript && firstScript.parentNode === frameDoc.body)
        frameDoc.body.insertBefore(container, firstScript);
      else frameDoc.body.appendChild(container);
    }

    const styleId = "__invio-interaction-styles";
    let styleEl = frameDoc.getElementById(styleId);
    if (!styleEl) {
      styleEl = frameDoc.createElement("style");
      styleEl.id = styleId;
      frameDoc.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      #__invio-interactions { padding: 100px 5%; text-align: center; }
      .invio-card { max-width: 700px; margin: 50px auto; padding: 60px 40px; background: ${design.bg}; color: ${design.dark ? "#fff" : "#333"}; font-family: ${design.bodyFont}, sans-serif; ${design.style} }
      .invio-title { font-family: ${design.titleFont}, serif; font-size: 3.5rem; color: ${design.accent}; margin-bottom: 30px; line-height: 1.1; }
      .invio-input { width: 100%; padding: 15px; margin-bottom: 20px; background: ${design.dark ? "rgba(255,255,255,0.05)" : "#fff"}; border: 1px solid ${design.dark ? "rgba(255,255,255,0.1)" : "#ddd"}; color: ${design.dark ? "#fff" : "#333"}; font-size: 1.1rem; outline: none; transition: 0.3s; border-radius: ${design.style.includes("border-radius") ? "8px" : "0"}; }
      .invio-input:focus { border-color: ${design.accent}; box-shadow: 0 0 15px ${design.accent}44; }
      .invio-btn { background: ${design.accent}; color: ${design.dark && design.accent !== "#ccff00" && design.accent !== "#00f2ff" ? "#fff" : "#000"}; border: none; padding: 18px 50px; font-family: inherit; font-size: 1.1rem; cursor: pointer; letter-spacing: 2px; text-transform: uppercase; margin-top: 20px; transition: 0.3s; border-radius: ${design.style.includes("border-radius") ? "50px" : "0"}; font-weight: 700; }
      .invio-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 20px ${design.accent}66; }
      .invio-map-wrap { margin-top: 40px; overflow: hidden; ${design.style} }
      .invio-map-iframe { width: 100%; height: 400px; border: none; filter: ${design.mapFilter}; transition: 0.8s; }
      .invio-map-iframe:hover { filter: none; }
      .invio-reveal { opacity: 0; transform: translateY(40px); transition: all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1); }
      .invio-reveal.active { opacity: 1; transform: translateY(0); }

      @media (max-width: 768px) {
        #__invio-interactions { padding: 60px 20px; }
        .invio-card { padding: 40px 25px; margin: 30px auto; }
        .invio-title { font-size: 2.5rem; margin-bottom: 20px; }
        .invio-input { font-size: 1rem; padding: 12px; }
        .invio-btn { padding: 15px 30px; font-size: 1rem; }
        .invio-map-iframe { height: 300px; }
      }

      ${
        isWeddingTemplate4
          ? `
      #__invio-interactions { padding-top: 70px; }
      .invio-card.invio-w4-rsvp {
        text-align: left;
        max-width: 860px;
        padding: clamp(28px, 5vw, 46px);
        background: linear-gradient(145deg, #fff8f2 0%, #fff3e8 100%);
        color: #3e252b;
        border: 1px solid rgba(139, 21, 56, 0.22);
        border-radius: 24px;
      }
      .invio-w4-kicker {
        display: inline-block;
        margin-bottom: 10px;
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid rgba(139, 21, 56, 0.28);
        color: #7b213d;
        letter-spacing: 1.4px;
        text-transform: uppercase;
        font-size: 0.74rem;
      }
      .invio-card.invio-w4-rsvp .invio-title {
        color: #8b1538;
        font-size: clamp(2rem, 4.5vw, 3.1rem);
        margin-bottom: 12px;
      }
      .invio-w4-intro {
        margin: 0 0 24px;
        color: #6c3b48;
        font-size: 1.02rem;
        line-height: 1.75;
      }
      .invio-w4-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .invio-w4-grid .invio-input,
      .invio-w4-rsvp .invio-input {
        border: 1px solid rgba(139, 21, 56, 0.22);
        background: #fffdfb;
        color: #3b2229;
        border-radius: 14px;
        margin-bottom: 0;
      }
      .invio-w4-actions {
        margin-top: 16px;
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
      }
      .invio-w4-note {
        font-size: 0.86rem;
        letter-spacing: 0.4px;
        color: #7a4654;
      }
      .invio-btn.invio-w4-btn {
        background: #8b1538;
        color: #fff8f5;
        border-radius: 999px;
        padding: 14px 28px;
        margin-top: 0;
        letter-spacing: 1.2px;
      }
      .invio-btn.invio-w4-btn:hover {
        box-shadow: 0 12px 24px rgba(139, 21, 56, 0.32);
      }
      @media (max-width: 768px) {
        .invio-card.invio-w4-rsvp {
          padding: 24px 18px;
          border-radius: 18px;
        }
        .invio-w4-grid {
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .invio-w4-actions {
          align-items: stretch;
        }
        .invio-btn.invio-w4-btn {
          width: 100%;
        }
      }
          `
          : ""
      }
    `;

    container.innerHTML = "";

    if (inter.rsvp.enabled) {
      if (isWeddingTemplate4) {
        container.innerHTML += `
        <div class="invio-card invio-w4-rsvp invio-reveal" data-invio-anim="reveal">
          <span class="invio-w4-kicker">RSVP</span>
          <h2 class="invio-title">${inter.rsvp.title}</h2>
          <p class="invio-w4-intro">Kindly let us know if you can celebrate with us in Madrid. Your response helps us prepare your welcome details and seating.</p>
          <form onsubmit="event.preventDefault(); alert('RSVP sent successfully!')">
            <div class="invio-w4-grid">
              <input type="text" class="invio-input" placeholder="Guest full name" required>
              <input type="email" class="invio-input" placeholder="Email address" required>
              <select class="invio-input" required><option value="">RSVP status</option><option>Joyfully Accepts</option><option>Regretfully Declines</option></select>
              <input type="text" class="invio-input" placeholder="Dietary notes (optional)">
            </div>
            <div class="invio-w4-actions">
              <span class="invio-w4-note">Please respond before October 15, 2030</span>
              <button class="invio-btn invio-w4-btn" type="submit">Send RSVP</button>
            </div>
          </form>
        </div>
      `;
      } else {
        container.innerHTML += `
        <div class="invio-card invio-reveal" data-invio-anim="reveal">
          <h2 class="invio-title">${inter.rsvp.title}</h2>
          <form onsubmit="event.preventDefault(); alert('RSVP sent successfully!')">
            <input type="text" class="invio-input" placeholder="Your Full Name" required>
            <input type="email" class="invio-input" placeholder="Your Email address" required>
            <select class="invio-input"><option>Joyfully Accepts</option><option>Regretfully Declines</option></select>
            <button class="invio-btn" type="submit">Send RSVP</button>
          </form>
        </div>
      `;
      }
    }
    if (inter.maps.enabled) {
      let mapQuery = inter.maps.address || "Main Street";
      if (mapQuery.includes("google.com/maps")) {
        const placeMatch = mapQuery.match(/\/place\/([^\/\?]+)/);
        const coordMatch = mapQuery.match(/@(-?\d+\.\d+,-?\d+\.\d+)/);
        if (placeMatch)
          mapQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
        else if (coordMatch) mapQuery = coordMatch[1];
      }
      const gMapUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
      container.innerHTML += `
        <div class="invio-card invio-reveal" data-invio-anim="reveal">
          <h2 class="invio-title">The Location</h2>
          <p style="margin-bottom: 25px; opacity: 0.8; font-size: 1.2rem;">${inter.maps.address || "No address provided"}</p>
          <div class="invio-map-wrap"><iframe class="invio-map-iframe" src="${gMapUrl}" allowfullscreen="" loading="lazy"></iframe></div>
        </div>
      `;
    }

    container.style.display = container.innerHTML === "" ? "none" : "block";
    this.refreshAnimations();
  }

  injectSecurityGuard() {
    const frameDoc = this.els.frame.contentDocument;
    if (!frameDoc) return;
    const scriptId = "__invio-security-guard";
    if (!frameDoc.getElementById(scriptId)) {
      const script = frameDoc.createElement("script");
      script.id = scriptId;
      script.src = "../../js/security-guard.js";
      frameDoc.head.appendChild(script);
    }
  }

  refreshAnimations() {
    const frameDoc = this.els.frame.contentDocument;
    if (!frameDoc) return;
    const obs = new frameDoc.defaultView.IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("active");
        });
      },
      { threshold: 0.1 },
    );
    frameDoc.querySelectorAll(".invio-reveal").forEach((el) => obs.observe(el));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.editor = new StudioEditor();
});
