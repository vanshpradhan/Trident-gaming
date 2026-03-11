import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { getDb } from "../db/schema.js";
import { authenticate, generateToken, AuthRequest } from "../middleware/auth.js";
import { sanitizeString, isValidEmail, isValidString } from "../middleware/validate.js";

const router = Router();

// POST /api/auth/register
router.post("/register", (req: Request, res: Response) => {
  try {
    const name = sanitizeString(req.body.name);
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const phone = sanitizeString(req.body.phone);
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!isValidString(name, 1, 100)) {
      res.status(400).json({ error: "Name is required (max 100 characters)" });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "A valid email is required" });
      return;
    }

    if (password.length < 6 || password.length > 128) {
      res.status(400).json({ error: "Password must be 6-128 characters" });
      return;
    }

    if (phone && !isValidString(phone, 0, 20)) {
      res.status(400).json({ error: "Phone number is too long" });
      return;
    }

    const db = getDb();

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const id = uuid();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(
      "INSERT INTO users (id, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)"
    ).run(id, name, email, phone || null, passwordHash);

    // Create loyalty record
    db.prepare(
      "INSERT INTO loyalty (id, user_id, total_visits, total_xp, tier) VALUES (?, ?, 0, 0, 'Bronze')"
    ).run(uuid(), id);

    const token = generateToken(id);

    res.status(201).json({
      token,
      user: { id, name, email, phone: phone || null, role: "customer" },
    });
  } catch (err) {
    console.error("[Auth] Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", (req: Request, res: Response) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const db = getDb();
    const user = db.prepare(
      "SELECT id, name, email, phone, password_hash, role FROM users WHERE email = ?"
    ).get(email) as any;

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me - Get current user profile
router.get("/me", authenticate, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const user = db.prepare(
      "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?"
    ).get(req.userId) as any;

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Get loyalty info
    const loyalty = db.prepare(
      "SELECT total_visits, total_xp, tier, active_boosters FROM loyalty WHERE user_id = ?"
    ).get(req.userId) as any;

    res.json({
      user: {
        ...user,
        loyalty: loyalty || { total_visits: 0, total_xp: 0, tier: "Bronze", active_boosters: 0 },
      },
    });
  } catch (err) {
    console.error("[Auth] Profile error:", err);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

export default router;
