import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getDb } from "../db/schema.js";

// ─── HMAC-Signed Token System ─────────────────────────────────────────
// Tokens are HMAC-SHA256 signed with a server secret and include an expiry.
// Format: base64url(payload).base64url(signature)
// Payload: JSON { uid, iat, exp }

const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString("hex");
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function base64urlEncode(data: string): string {
  return Buffer.from(data, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf-8");
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateToken(userId: string): string {
  const payload = JSON.stringify({
    uid: userId,
    iat: Date.now(),
    exp: Date.now() + TOKEN_EXPIRY_MS,
  });
  const encodedPayload = base64urlEncode(payload);
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encodedPayload, providedSignature] = parts;

    // Verify signature
    const expectedSignature = sign(encodedPayload);
    if (!crypto.timingSafeEqual(
      Buffer.from(providedSignature, "utf-8"),
      Buffer.from(expectedSignature, "utf-8")
    )) {
      return null; // Signature mismatch — tampered or forged
    }

    // Decode and validate payload
    const payload = JSON.parse(base64urlDecode(encodedPayload));

    if (!payload.uid || !payload.exp) return null;

    // Check expiry
    if (Date.now() > payload.exp) {
      return null; // Token expired
    }

    return payload.uid;
  } catch {
    return null;
  }
}

// ─── Auth Types ────────────────────────────────────────────────────────

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

// ─── Middleware ─────────────────────────────────────────────────────────

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const userId = parseToken(token);

  if (!userId) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const db = getDb();
  const user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId) as { id: string; role: string } | undefined;

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.userId = user.id;
  req.userRole = user.role;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function requireCustomer(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== "customer") {
    res.status(403).json({ error: "This action is only available to customers" });
    return;
  }
  next();
}

// Optional auth — doesn't fail if no token, but populates userId if present
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
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
  next();
}
