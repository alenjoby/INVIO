/**
 * Controls - Sidebar control builders and managers
 * Handles dynamic control panel construction and event handling
 */

class ControlsManager {
  constructor(state) {
    this.state = state;
    this.currentControl = null;
  }

  /**
   * Build and show text control
   */
  buildTextControl(element, fieldId) {
    const container = document.getElementById("textControls");
    const input = document.getElementById("textInput");
    const label = document.getElementById("textLabel");
    const charCount = document.getElementById("charCount");

    // Set label
    label.textContent = this.formatFieldName(fieldId);

    // Set input value
    const currentValue = element.textContent || "";
    input.value = currentValue;

    // Update character count
    charCount.textContent = `${currentValue.length} / 200`;

    // Clear previous listeners
    input.onchange = null;
    input.oninput = null;

    // Add listeners
    input.addEventListener("input", (e) => {
      charCount.textContent = `${e.target.value.length} / 200`;
    });

    input.addEventListener("blur", (e) => {
      const newValue = e.target.value;
      element.textContent = newValue;
      this.state.updateText(fieldId, newValue);
    });

    container.classList.remove("hidden");
    input.focus();
  }

  /**
   * Build and show image control
   */
  buildImageControl(element, fieldId) {
    const container = document.getElementById("imageControls");
    const uploadZone = document.getElementById("imageDropZone");
    const upload = document.getElementById("imageUpload");
    const preview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");
    const clearBtn = document.getElementById("clearImageBtn");

    // Show preview if image exists
    if (element.src && element.src !== "undefined") {
      previewImg.src = element.src;
      preview.classList.remove("hidden");
    } else {
      preview.classList.add("hidden");
    }

    // Clear previous listeners
    upload.onchange = null;
    clearBtn.onclick = null;
    uploadZone.ondrop = null;
    uploadZone.onclick = null;

    // File input
    upload.addEventListener("change", (e) => {
      if (e.target.files[0]) {
        this.handleImageFile(element, fieldId, e.target.files[0], previewImg);
      }
    });

    // Drop zone
    uploadZone.addEventListener("click", () => upload.click());

    uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = "var(--accent)";
    });

    uploadZone.addEventListener("dragleave", () => {
      uploadZone.style.borderColor = "";
    });

    uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = "";
      if (e.dataTransfer.files[0]) {
        this.handleImageFile(
          element,
          fieldId,
          e.dataTransfer.files[0],
          previewImg,
        );
      }
    });

    // Clear button
    clearBtn.addEventListener("click", () => {
      element.src = "";
      this.state.updateImage(fieldId, "");
      preview.classList.add("hidden");
    });

    container.classList.remove("hidden");
  }

  /**
   * Handle image file upload
   */
  async handleImageFile(element, fieldId, file, previewImg) {
    // Validate
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Only JPG, PNG and WEBP allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    // Show loading state
    previewImg.src = "";
    const controlsContainer = document.getElementById("imageControls");
    const originalText = controlsContainer.innerHTML;

    try {
      // 1. Prepare form data
      const formData = new FormData();
      formData.append("file", file);

      // 2. Setup auth token
      const token = localStorage.getItem("invio_token");
      if (!token) throw new Error("Authentication required");

      const API_URL = typeof window.API_URL !== "undefined" ? window.API_URL : "http://localhost:4000";
      
      // 3. Upload to our API endpoint
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await response.json();
      const dataUrl = data.url;

      // 4. Update the iframe and state with live URL
      element.src = dataUrl;
      previewImg.src = dataUrl;
      this.state.updateImage(fieldId, dataUrl);
      document.getElementById("imagePreview").classList.remove("hidden");
    } catch (err) {
      alert(err.message || "Failed to upload image.");
      console.error(err);
    }
  }

  /**
   * Build and show color control
   */
  buildColorControl(element, fieldId) {
    const container = document.getElementById("colorControls");
    const colorInput = document.getElementById("colorInput");
    const colorHex = document.getElementById("colorHex");
    const resetBtn = document.getElementById("resetColorBtn");

    // Get current color
    const currentColor = this.getElementColor(element);
    const hexColor = this.colorToHex(currentColor);

    colorInput.value = hexColor;
    colorHex.value = hexColor;

    // Clear previous listeners
    colorInput.onchange = null;
    colorInput.oninput = null;
    colorHex.oninput = null;
    resetBtn.onclick = null;

    // Color picker
    colorInput.addEventListener("input", (e) => {
      const hex = e.target.value;
      colorHex.value = hex;
      this.applyColor(element, hex);
      this.state.updateColor(fieldId, hex);
    });

    // Hex input
    colorHex.addEventListener("input", (e) => {
      const hex = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(hex)) {
        colorInput.value = hex;
        this.applyColor(element, hex);
        this.state.updateColor(fieldId, hex);
      }
    });

    // Reset button
    resetBtn.addEventListener("click", () => {
      element.style.removeProperty("color");
      element.style.removeProperty("--" + fieldId);
      this.state.deleteEdit("colors", fieldId);
      colorInput.value = "#000000";
      colorHex.value = "#000000";
    });

    container.classList.remove("hidden");
  }

  /**
   * Get current element color
   */
  getElementColor(element) {
    const computed = window.getComputedStyle(element);
    return (
      computed.getPropertyValue("--accent").trim() ||
      computed.color ||
      "#000000"
    );
  }

  /**
   * Apply color to element
   */
  applyColor(element, hex) {
    element.style.color = hex;
    const dataId = element.getAttribute("data-id");
    if (dataId) {
      element.style.setProperty("--" + dataId, hex);
    }
  }

  /**
   * Convert color to hex
   */
  colorToHex(color) {
    if (color.startsWith("#")) return color;

    // RGB to hex
    const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
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

  /**
   * Format field name for display
   */
  formatFieldName(fieldId) {
    return fieldId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Hide all controls
   */
  hideAll() {
    document.getElementById("textControls").classList.add("hidden");
    document.getElementById("imageControls").classList.add("hidden");
    document.getElementById("colorControls").classList.add("hidden");
  }
}
