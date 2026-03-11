import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "..", "..", "trident.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function initializeDatabase(): void {
  const db = getDb();

  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Consoles table
    CREATE TABLE IF NOT EXISTS consoles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('ps5', 'psvr2')),
      image TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'maintenance')),
      players TEXT NOT NULL DEFAULT '1-4',
      features TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Pricing plans table
    CREATE TABLE IF NOT EXISTS pricing_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      duration TEXT NOT NULL,
      description TEXT NOT NULL,
      features TEXT NOT NULL DEFAULT '[]',
      console_type TEXT NOT NULL,
      popular INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT 'primary',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Bookings table
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      console_id TEXT NOT NULL,
      console_type TEXT NOT NULL CHECK(console_type IN ('ps5', 'psvr2')),
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      players INTEGER NOT NULL DEFAULT 1,
      duration_hours REAL NOT NULL DEFAULT 1,
      total_price INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'active', 'completed', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (console_id) REFERENCES consoles(id)
    );

    -- Snacks / menu items table
    CREATE TABLE IF NOT EXISTS snacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      image TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'snack' CHECK(category IN ('snack', 'drink', 'combo')),
      available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Orders table
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      console_id TEXT,
      total_price INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Order items table
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      snack_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (snack_id) REFERENCES snacks(id)
    );

    -- Sessions table (active gaming sessions)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      console_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'ending_soon', 'time_up', 'completed')),
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (console_id) REFERENCES consoles(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Loyalty / rewards table
    CREATE TABLE IF NOT EXISTS loyalty (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      total_visits INTEGER NOT NULL DEFAULT 0,
      total_xp INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'Bronze' CHECK(tier IN ('Bronze', 'Silver', 'Gold', 'Elite')),
      active_boosters INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Rewards / milestones table
    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      visits_required INTEGER NOT NULL,
      reward_type TEXT NOT NULL CHECK(reward_type IN ('discount', 'free_session', 'free_snack', 'xp_boost')),
      reward_value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- User rewards (tracking which rewards a user has unlocked/redeemed)
    CREATE TABLE IF NOT EXISTS user_rewards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      reward_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unlocked' CHECK(status IN ('locked', 'unlocked', 'redeemed')),
      unlocked_at TEXT,
      redeemed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reward_id) REFERENCES rewards(id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_console ON bookings(console_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_console ON sessions(console_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_loyalty_user ON loyalty(user_id);
  `);

  console.log("[DB] Database schema initialized successfully");
}
