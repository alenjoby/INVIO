/**
 * INVIO Environment Configuration
 * Centralizes the backend API URL for all frontend scripts.
 * 
 * To switch to production:
 * 1. Deploy the backend to Render.
 * 2. Paste your Render URL in the PRODUCTION_URL constant below.
 */

const CONFIG = {
  LOCAL_URL: "http://localhost:4000",
  // In production, we use Vercel's rewrite proxy (defined in vercel.json)
  // This avoids CORS issues by routing /api through the same origin.
  PRODUCTION_URL: window.location.origin, 
};

// Auto-detect environment based on hostname
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

export const API_URL = isLocal ? CONFIG.LOCAL_URL : (window.__INVIO_API_URL__ || CONFIG.PRODUCTION_URL);

console.log(`[INVIO] Environment: ${isLocal ? "Local" : "Production"}`);
console.log(`[INVIO] API Base: ${API_URL}`);

export default API_URL;
