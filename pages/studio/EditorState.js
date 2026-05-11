/**
 * EditorState - State Management for Studio Editor
 * Maintains a single source of truth for all edits
 */

class EditorState {
  constructor(templateId, inviteId = null) {
    this.data = {
      templateId,
      inviteId: inviteId || this.generateId(),
      slug: "",
      edits: {
        text: {},
        images: {},
        colors: {},
      },
      interactions: {
        rsvp: { enabled: false, title: "Are you coming?", fields: ["name", "status", "guests"] },
        maps: { enabled: false, address: "", url: "" }
      },
      createdAt: new Date().toISOString(),
      published: false,
      inviteUrl: null,
    };

    // History management
    this.past = [];
    this.future = [];
    this.historyLimit = 50;

    // Event emitters for state changes
    this.listeners = {};
  }

  /**
   * Take a snapshot for undo/redo
   */
  takeSnapshot() {
    const snapshot = JSON.stringify({
      edits: this.data.edits,
      interactions: this.data.interactions
    });

    // Only push if different from last snapshot
    if (this.past.length > 0 && this.past[this.past.length - 1] === snapshot) {
      return;
    }

    this.past.push(snapshot);
    if (this.past.length > this.historyLimit) {
      this.past.shift();
    }
    this.future = []; // Clear redo stack on new action
    this.emit("historyChange", { canUndo: true, canRedo: false });
  }

  /**
   * Undo last action
   */
  undo() {
    if (this.past.length === 0) return null;

    // Save current state to future
    const current = JSON.stringify({
      edits: this.data.edits,
      interactions: this.data.interactions
    });
    this.future.push(current);

    // Restore previous state
    const previous = JSON.parse(this.past.pop());
    this.data.edits = previous.edits;
    this.data.interactions = previous.interactions;

    this.emit("stateRestored", this.data);
    this.emit("historyChange", { 
      canUndo: this.past.length > 0, 
      canRedo: true 
    });
    
    return this.data;
  }

  /**
   * Redo action
   */
  redo() {
    if (this.future.length === 0) return null;

    // Save current state to past
    const current = JSON.stringify({
      edits: this.data.edits,
      interactions: this.data.interactions
    });
    this.past.push(current);

    // Restore next state
    const next = JSON.parse(this.future.pop());
    this.data.edits = next.edits;
    this.data.interactions = next.interactions;

    this.emit("stateRestored", this.data);
    this.emit("historyChange", { 
      canUndo: true, 
      canRedo: this.future.length > 0 
    });

    return this.data;
  }

  /**
   * Update metadata
   */
  updateData(key, value) {
    this.data[key] = value;
    this.emit(key, value);
  }

  /**
   * Update text edit
   */
  updateText(fieldId, value) {
    this.updateEdit("text", fieldId, value);
  }

  /**
   * Update image edit
   */
  updateImage(fieldId, value) {
    this.updateEdit("images", fieldId, value);
  }

  /**
   * Update color edit
   */
  updateColor(fieldId, value) {
    this.updateEdit("colors", fieldId, value);
  }

  /**
   * Update interaction setting
   */
  updateInteraction(category, key, value) {
    this.takeSnapshot();
    this.data.interactions[category][key] = value;
    this.emit(`interaction:${category}`, this.data.interactions[category]);
  }

  /**
   * Generic update edit
   */
  updateEdit(category, fieldId, value) {
    // Note: studio.js should call takeSnapshot() before significant edits 
    // to avoid flooding history with every character stroke.
    this.data.edits[category][fieldId] = value;
    this.emit(`edit:${category}:${fieldId}`, value);
  }

  /**
   * Delete an edit
   */
  deleteEdit(category, fieldId) {
    this.takeSnapshot();
    delete this.data.edits[category][fieldId];
    this.emit(`delete:${category}:${fieldId}`);
  }

  /**
   * Get current state as JSON
   */
  getState() {
    return JSON.parse(JSON.stringify(this.data));
  }

  /**
   * Publish invitation
   */
  publish(inviteUrl) {
    this.data.published = true;
    this.data.inviteUrl = inviteUrl;
    this.emit("published", inviteUrl);
  }

  /**
   * Clear all edits
   */
  reset() {
    this.takeSnapshot();
    this.data.edits = {
      text: {},
      images: {},
      colors: {},
    };
    this.data.interactions = {
      rsvp: { enabled: false, title: "Are you coming?", fields: ["name", "status"] },
      calendar: { enabled: false, title: "", date: "" },
      maps: { enabled: false, address: "", url: "" }
    };
    this.emit("reset");
  }

  /**
   * Event emitter
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Event emitter - remove listener
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback,
      );
    }
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => {
        callback(data);
      });
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return Math.random().toString(36).substring(2, 11);
  }
}
