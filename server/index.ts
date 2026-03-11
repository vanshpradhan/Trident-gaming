import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { initializeDatabase } from "./db/schema.js";
import { seedDatabase } from "./db/seed.js";
import { addClient, getClientCount } from "./sse.js";
import { parseToken, AuthRequest } from "./middleware/auth.js";
import { getDb } from "./db/schema.js";

import authRoutes from "./routes/auth.js";
import consoleRoutes from "./routes/consoles.js";
import bookingRoutes from "./routes/bookings.js";
import orderRoutes from "./routes/orders.js";
import loyaltyRoutes from "./routes/loyalty.js";
import pricingRoutes from "./routes/pricing.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ─── Security Headers (helmet) ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: IS_PRODUCTION ? undefined : false, // Disable CSP in dev (Vite needs inline scripts)
  crossOriginEmbedderPolicy: false, // Allow loading external images
}));

// ─── CORS ───────────────────────────────────────────────────────────────
const allowedOrigins = IS_PRODUCTION
  ? [process.env.ALLOWED_ORIGIN || "https://tridentcafe.com"]
  : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// ─── Body Parsing with Size Limits ──────────────────────────────────────
app.use(express.json({ limit: "100kb" }));            // 100KB max JSON body
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ─── Rate Limiting ──────────────────────────────────────────────────────

// Strict rate limit for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 20,                      // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || "unknown",
});

// General rate limit for mutation endpoints
const mutationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,    // 1 minute
  max: 60,                      // 60 mutations per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || "unknown",
});

// Global rate limit (all endpoints)
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,    // 1 minute
  max: 200,                     // 200 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests." },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || "unknown",
});

app.use(globalLimiter);

// ─── Request Logging ────────────────────────────────────────────────────
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ─── SSE Endpoint (real-time updates) ───────────────────────────────────
// EventSource API doesn't support custom headers, so we accept token via query param
app.get("/api/events", (req: AuthRequest, res) => {
  // Try to authenticate from query param (SSE can't send headers)
  const token = req.query.token as string | undefined;
  if (token) {
    const userId = parseToken(token);
    if (userId) {
      const db = getDb();
      const user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId) as { id: string; role: string } | undefined;
      if (user) {
        req.userId = user.id;
        req.userRole = user.role;
      }
    }
  }

  const cleanup = addClient(res, req.userId, req.userRole);
  req.on("close", cleanup);
});

// ─── API Routes ─────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/consoles", consoleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/snacks", orderRoutes);    // GET /api/snacks for menu
app.use("/api/orders", mutationLimiter, orderRoutes);    // POST /api/orders for placing orders
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/admin", mutationLimiter, adminRoutes);

// Health check (includes SSE client count for monitoring)
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    sseClients: getClientCount(),
  });
});

// ─── Global Error Handler (never leak stack traces) ─────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Server] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Serve Static Frontend in Production ────────────────────────────────
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ─── Initialize & Start ─────────────────────────────────────────────────
try {
  initializeDatabase();
  seedDatabase();

  app.listen(PORT, () => {
    console.log(`
=========================================
  TRIDENT GAMING CAFE - Backend Server
=========================================
  Server:   http://localhost:${PORT}
  API Base: http://localhost:${PORT}/api
  Health:   http://localhost:${PORT}/api/health
  SSE:      http://localhost:${PORT}/api/events
  Mode:     ${IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT"}
=========================================
  Security:
    - Helmet security headers: ENABLED
    - HMAC-signed tokens: ENABLED (24h expiry)
    - Rate limiting: ENABLED
    - Body size limit: 100KB
    - CORS: ${IS_PRODUCTION ? "RESTRICTED" : "DEV ORIGINS"}
=========================================
    `);
  });
} catch (err) {
  console.error("Failed to start server:", err);
  process.exit(1);
}
