/**
 * StudioBridge.js - The "Ghost Controller"
 * 
 * Runs inside the template iframe to provide a premium editing experience
 * without mutating the original template code or breaking CSS.
 */

(function() {
  if (window.__INVIO_BRIDGE_INITIALIZED__) return;
  window.__INVIO_BRIDGE_INITIALIZED__ = true;

  console.log("[StudioBridge] Initializing...");
  document.body.classList.add('invio-studio-mode');

  const BridgeState = {
    selectedElement: null,
    hoveredElement: null,
    isEditMode: true,
    shadowRoot: null,
    selectionBox: null,
    hoverBox: null,
  };

  /**
   * Initialize the Shadow DOM Overlay
   */
  function initOverlay() {
    const container = document.createElement('div');
    container.id = "invio-studio-overlay";
    container.style.position = "fixed";
    container.style.inset = "0";
    container.style.zIndex = "999999";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);

    BridgeState.shadowRoot = container.attachShadow({ mode: 'open' });
    
    // Inject Overlay Styles
    const style = document.createElement('style');
    style.textContent = `
      .selection-box, .hover-box {
        position: absolute;
        border: 2px solid #3b82f6;
        pointer-events: none;
        transition: all 0.1s ease-out;
        box-sizing: border-box;
        z-index: 10;
        display: none;
      }
      .hover-box {
        border-color: rgba(59, 130, 246, 0.4);
        border-style: dashed;
      }
      .selection-box {
        box-shadow: 0 0 0 4000px rgba(0,0,0,0.1);
      }
      .label {
        position: absolute;
        top: -24px;
        left: -2px;
        background: #3b82f6;
        color: white;
        font-family: sans-serif;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 2px 2px 0 0;
        white-space: nowrap;
      }
    `;
    BridgeState.shadowRoot.appendChild(style);

    // Create selection boxes
    BridgeState.selectionBox = document.createElement('div');
    BridgeState.selectionBox.className = "selection-box";
    BridgeState.selectionBox.innerHTML = '<div class="label">SELECTED</div>';
    
    BridgeState.hoverBox = document.createElement('div');
    BridgeState.hoverBox.className = "hover-box";
    
    BridgeState.shadowRoot.appendChild(BridgeState.selectionBox);
    BridgeState.shadowRoot.appendChild(BridgeState.hoverBox);
  }

  /**
   * Update box position based on element
   */
  function updateFocusBox(box, element) {
    if (!element) {
      box.style.display = "none";
      return;
    }
    const rect = element.getBoundingClientRect();
    box.style.display = "block";
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    box.style.top = `${rect.top + window.scrollY}px`;
    box.style.left = `${rect.left + window.scrollX}px`;
  }

  /**
   * Global Event Listeners
   */
  document.addEventListener('mouseover', (e) => {
    if (!BridgeState.isEditMode) return;
    const target = e.target.closest('[data-edit], p, h1, h2, h3, h4, img, button, .editable');
    if (target && target !== BridgeState.selectedElement) {
      BridgeState.hoveredElement = target;
      updateFocusBox(BridgeState.hoverBox, target);
    } else {
      BridgeState.hoverBox.style.display = "none";
    }
  });

  document.addEventListener('click', (e) => {
    if (!BridgeState.isEditMode) return;
    
    const target = e.target.closest('[data-edit], p, h1, h2, h3, h4, img, button, .editable');
    if (target) {
      e.preventDefault();
      e.stopPropagation();
      selectElement(target);
    } else {
      deselect();
    }
  }, true);

  function selectElement(el) {
    if (BridgeState.selectedElement === el) return;
    BridgeState.selectedElement = el;
    updateFocusBox(BridgeState.selectionBox, el);
    BridgeState.hoverBox.style.display = "none";

    // Notify Parent
    window.parent.postMessage({
      type: 'elementSelected',
      payload: {
        id: el.getAttribute('data-id') || el.id || generateGhostId(el),
        tagName: el.tagName,
        content: el.tagName === 'IMG' ? el.src : el.innerText,
        category: getCategory(el)
      }
    }, '*');
  }

  function deselect() {
    BridgeState.selectedElement = null;
    BridgeState.selectionBox.style.display = "none";
    window.parent.postMessage({ type: 'selectionCleared' }, '*');
  }

  function generateGhostId(el) {
    // Generate a stable path-based ID if no ID exists
    const path = [];
    let current = el;
    while (current && current !== document.body) {
      const index = Array.from(current.parentNode.children).indexOf(current);
      path.push(`${current.tagName}-${index}`);
      current = current.parentNode;
    }
    const id = `ghost-${path.reverse().join('/')}`;
    el.setAttribute('data-id', id); // persist for the session
    return id;
  }

  function getCategory(el) {
    if (el.tagName === 'IMG') return 'images';
    if (['H1', 'H2', 'H3', 'P', 'SPAN'].includes(el.tagName)) return 'text';
    return 'styles';
  }

  /**
   * Listen for State Updates from Studio
   */
  window.addEventListener('message', (e) => {
    const { type, payload } = e.data;
    if (type === 'applyEdit') {
      const el = document.querySelector(`[data-id="${payload.id}"]`);
      if (!el) return;

      if (payload.category === 'text') {
        el.innerText = payload.value;
      } else if (payload.category === 'images') {
        el.src = payload.value;
      } else if (payload.category === 'colors') {
        el.style.color = payload.value;
      } else if (payload.category === 'styles') {
        Object.assign(el.style, payload.value);
      }
      // Re-sync selection box in case size changed
      updateFocusBox(BridgeState.selectionBox, BridgeState.selectedElement);
    }
    
    if (type === 'syncState') {
      // Full state restore logic
      applyFullState(payload);
    }
  });

  function applyFullState(state) {
    if (!state || !state.edits) return;
    
    // Process text
    for (const [id, val] of Object.entries(state.edits.text || {})) {
      const el = document.querySelector(`[data-id="${id}"]`);
      if (el) el.innerText = val;
    }
    // Process images
    for (const [id, val] of Object.entries(state.edits.images || {})) {
      const el = document.querySelector(`[data-id="${id}"] img`) || document.querySelector(`img[data-id="${id}"]`) || document.querySelector(`[data-id="${id}"]`);
      if (el && el.tagName === 'IMG') el.src = val;
    }
    // Process styles
    for (const [id, val] of Object.entries(state.edits.styles || {})) {
      const el = document.querySelector(`[data-id="${id}"]`);
      if (el) Object.assign(el.style, val);
    }
  }

  // Initial Boot
  initOverlay();

  // Signal to parent that we are alive
  window.parent.postMessage({ type: 'bridgeReady' }, '*');

})();
