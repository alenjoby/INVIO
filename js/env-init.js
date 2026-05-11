import { API_URL } from "./env.js";

// Bridge for legacy / non-module scripts (like studio.js, dashboard.js, etc.)
window.__INVIO_API_URL__ = API_URL;

console.log("[INVIO Shared] API URL initialized globally:", window.__INVIO_API_URL__);
