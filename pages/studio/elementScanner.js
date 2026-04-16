/**
 * Element Scanner - Detects and manages editable elements in template
 * Handles element selection, highlighting, and event delegation
 */

class ElementScanner {
  constructor(frameElement) {
    this.frame = frameElement;
    this.frameDoc = null;
    this.elements = new Map(); // data-id -> element reference
    this.selectedElement = null;
  }

  /**
   * Initialize scanner after frame loads
   */
  initialize() {
    try {
      this.frameDoc = this.frame.contentDocument;
      if (!this.frameDoc) {
        console.warn("Cannot access frame document");
        return;
      }

      this.scanElements();
      this.attachEventListeners();
    } catch (error) {
      console.error("✗ Scanner initialization failed:", error);
    }
  }

  /**
   * Scan for all editable elements
   */
  scanElements() {
    const editableElements = this.frameDoc.querySelectorAll("[data-edit]");
    console.log(`✓ Found ${editableElements.length} editable elements`);

    editableElements.forEach((element) => {
      const dataId = element.getAttribute("data-id");
      const editType = element.getAttribute("data-edit");

      if (dataId) {
        this.elements.set(dataId, {
          element,
          type: editType,
          id: dataId,
        });
      }
    });
  }

  /**
   * Attach event listeners to elements
   */
  attachEventListeners() {
    this.elements.forEach(({ element }) => {
      // Hover effects
      element.addEventListener("mouseenter", () => {
        this.highlightElement(element);
      });

      element.addEventListener("mouseleave", () => {
        if (element !== this.selectedElement) {
          this.unhighlightElement(element);
        }
      });

      // Click to select
      element.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectElement(element);
      });
    });

    // Click outside to deselect
    this.frameDoc.addEventListener("click", () => {
      this.deselect();
    });
  }

  /**
   * Get element by data-id
   */
  getElement(dataId) {
    return this.elements.get(dataId);
  }

  /**
   * Highlight element on hover
   */
  highlightElement(element) {
    element.style.outline = "2px solid var(--accent)";
    element.style.outlineOffset = "2px";
    element.style.cursor = "pointer";
    this.showLabel(element);
  }

  /**
   * Remove highlight
   */
  unhighlightElement(element) {
    element.style.outline = "";
    element.style.outlineOffset = "";
    element.style.cursor = "";
    this.removeLabel(element);
  }

  /**
   * Select element
   */
  selectElement(element) {
    if (this.selectedElement) {
      this.deselect();
    }

    this.selectedElement = element;
    element.style.outline = "3px solid var(--accent)";
    element.style.outlineOffset = "2px";
    element.style.boxShadow = "inset 0 0 0 2px var(--accent)";

    // Trigger editor sidebar update
    const dataId = element.getAttribute("data-id");
    const editType = element.getAttribute("data-edit");
    window.editor?.selectElement(element);

    console.log(`Selected: ${dataId} (${editType})`);
  }

  /**
   * Deselect element
   */
  deselect() {
    if (this.selectedElement) {
      this.unhighlightElement(this.selectedElement);
      this.selectedElement.style.boxShadow = "";
      this.selectedElement = null;
      window.editor?.deselectElement();
    }
  }

  /**
   * Show label on hover
   */
  showLabel(element) {
    const dataId = element.getAttribute("data-id");
    if (!dataId) return;

    const label = document.createElement("div");
    label.className = "editor-label";
    label.textContent = dataId;
    label.style.cssText = `
      position: fixed;
      background: var(--accent);
      color: white;
      padding: 0.35rem 0.7rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
      z-index: 1000;
      pointer-events: none;
      white-space: nowrap;
      bottom: 10px;
      left: 10px;
    `;
    element.editorLabel = label;
  }

  /**
   * Remove label
   */
  removeLabel(element) {
    if (element.editorLabel) {
      element.editorLabel.remove();
      element.editorLabel = null;
    }
  }

  /**
   * Get all elements
   */
  getAllElements() {
    return Array.from(this.elements.values());
  }

  /**
   * Get elements by type
   */
  getElementsByType(type) {
    return Array.from(this.elements.values()).filter(
      (item) => item.type === type,
    );
  }
}
