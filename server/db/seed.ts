import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { getDb } from "./schema.js";

export function seedDatabase(): void {
  const db = getDb();

  // Check if already seeded
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count > 0) {
    console.log("[DB] Database already seeded, skipping...");
    return;
  }

  console.log("[DB] Seeding database...");

  // --- Seed Admin User ---
  const adminId = uuid();
  const adminHash = bcrypt.hashSync("admin123", 10);

  db.prepare(
    "INSERT INTO users (id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(adminId, "Admin", "admin@tridentcafe.com", "+91-9876543210", adminHash, "admin");

  // --- Seed Consoles (2x PS5 + 1x PSVR2) ---
  const insertConsole = db.prepare(
    "INSERT INTO consoles (id, name, type, image, status, players, features) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  insertConsole.run(
    "PS5-01", "PlayStation 5", "ps5",
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=800",
    "available", "1-4",
    '["4K 120Hz","DualSense","Ray Tracing"]'
  );
  insertConsole.run(
    "PS5-02", "PlayStation 5", "ps5",
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=800",
    "available", "1-4",
    '["4K 120Hz","DualSense","Ray Tracing"]'
  );
  insertConsole.run(
    "PSVR-01", "PSVR 2", "psvr2",
    "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&q=80&w=800",
    "available", "1",
    '["4K HDR","Eye Tracking","Sense Controllers"]'
  );

  // --- Seed Rewards / Milestones (keep these as system data) ---
  const insertReward = db.prepare(
    "INSERT INTO rewards (id, name, description, visits_required, reward_type, reward_value) VALUES (?, ?, ?, ?, ?, ?)"
  );

  insertReward.run(uuid(), "5 Visits Reward", "Get 50% off your next 1-hour session.", 5, "discount", "50");
  insertReward.run(uuid(), "10 Visits Reward", "Earn a completely free 1-hour session on any console.", 10, "free_session", "1");
  insertReward.run(uuid(), "20 Visits Reward", "Free Gaming Combo + 2X XP for your next 3 visits.", 20, "free_snack", "gaming_combo");
  insertReward.run(uuid(), "50 Visits Reward", "Lifetime 20% discount on all sessions.", 50, "discount", "20_lifetime");

  // --- No fake customers, bookings, orders, sessions, snacks, or pricing plans ---
  // Admin will add snacks and pricing plans from the admin dashboard.

  console.log("[DB] Database seeded successfully");
  console.log("[DB] Admin login: admin@tridentcafe.com / admin123");
  console.log("[DB] Consoles: PS5-01, PS5-02, PSVR-01 (all available)");
  console.log("[DB] No snacks or pricing plans seeded — add them from admin dashboard.");
}
