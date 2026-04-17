import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import invitationsRoutes from "./routes/invitations.js";
import uploadRoutes from "./routes/upload.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
].filter(Boolean);
const allowVercelPreviews =
  String(process.env.ALLOW_VERCEL_PREVIEWS || "true").toLowerCase() !== "false";

function getHostname(origin) {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalhost =
        !origin ||
        /^http:\/\/localhost:\d+$/i.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/i.test(origin);
      const isConfiguredOrigin = Boolean(
        origin && configuredOrigins.includes(origin),
      );
      const hostname = origin ? getHostname(origin) : "";
      const isVercelPreview =
        allowVercelPreviews && hostname.endsWith(".vercel.app");

      if (isLocalhost || isConfiguredOrigin || isVercelPreview) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/invitations", invitationsRoutes);
app.use("/api/upload", uploadRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
    method: req.method,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 INVIO Server running on port ${PORT}`);
  console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

export default app;
