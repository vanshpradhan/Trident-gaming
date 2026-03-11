import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { getDb } from "../db/schema.js";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth.js";
import { sanitizeString, isValidString, isValidUrl, isPositiveNumber, isOneOf } from "../middleware/validate.js";
import { broadcast } from "../sse.js";

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/stats - Dashboard statistics
router.get("/stats", (_req: AuthRequest, res: Response) => {
  try {
    const db = getDb();

    const totalConsoles = (db.prepare("SELECT COUNT(*) as count FROM consoles").get() as any).count;
    const activeConsoles = (db.prepare("SELECT COUNT(*) as count FROM consoles WHERE status = 'occupied'").get() as any).count;
    const availableConsoles = (db.prepare("SELECT COUNT(*) as count FROM consoles WHERE status = 'available'").get() as any).count;

    const pendingOrders = (db.prepare(
      "SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'preparing')"
    ).get() as any).count;

    const todayRevenue = (db.prepare(`
      SELECT COALESCE(SUM(total_price), 0) as total
      FROM bookings
      WHERE date = date('now') AND status IN ('confirmed', 'active', 'completed')
    `).get() as any).total;

    const orderRevenue = (db.prepare(`
      SELECT COALESCE(SUM(total_price), 0) as total
      FROM orders
      WHERE date(created_at) = date('now') AND status != 'cancelled'
    `).get() as any).total;

    const totalCustomers = (db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE role = 'customer'"
    ).get() as any).count;

    const todayBookings = (db.prepare(
      "SELECT COUNT(*) as count FROM bookings WHERE date = date('now')"
    ).get() as any).count;

    res.json({
      consoles: {
        total: totalConsoles,
        active: activeConsoles,
        available: availableConsoles,
        display: `${activeConsoles}/${totalConsoles}`,
      },
      orders: {
        pending: pendingOrders,
      },
      revenue: {
        today: todayRevenue + orderRevenue,
        bookings: todayRevenue,
        orders: orderRevenue,
        display: `₹${(todayRevenue + orderRevenue).toLocaleString("en-IN")}`,
      },
      customers: {
        total: totalCustomers,
      },
      bookings: {
        today: todayBookings,
      },
    });
  } catch (err) {
    console.error("[Admin] Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/admin/sessions - List active gaming sessions
router.get("/sessions", (_req: AuthRequest, res: Response) => {
  try {
    const db = getDb();

    const sessions = db.prepare(`
      SELECT
        s.*,
        c.name as console_name,
        c.type as console_type,
        u.name as user_name,
        u.email as user_email
      FROM sessions s
      JOIN consoles c ON s.console_id = c.id
      JOIN users u ON s.user_id = u.id
      WHERE s.status IN ('active', 'ending_soon', 'time_up')
      ORDER BY s.end_time ASC
    `).all() as any[];

    // Calculate time remaining for each session
    const now = new Date();
    const result = sessions.map((s: any) => {
      const endTime = new Date(s.end_time);
      const diffMs = endTime.getTime() - now.getTime();
      const minsRemaining = Math.max(0, Math.ceil(diffMs / 60000));

      let status = s.status;
      if (minsRemaining <= 0) status = "time_up";
      else if (minsRemaining <= 15) status = "ending_soon";
      else status = "active";

      return {
        ...s,
        time_remaining_mins: minsRemaining,
        time_remaining_display: minsRemaining > 0 ? `${minsRemaining} mins` : "0 mins",
        computed_status: status,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("[Admin] Sessions error:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// GET /api/admin/orders - List all orders (with filters)
router.get("/orders", (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const db = getDb();

    let query = `
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
    `;
    const params: any[] = [];

    if (status && typeof status === "string") {
      query += " WHERE o.status = ?";
      params.push(status);
    }

    query += " ORDER BY o.created_at DESC LIMIT 50";

    const orders = db.prepare(query).all(...params) as any[];

    const result = orders.map((order: any) => {
      const items = db.prepare(`
        SELECT oi.*, s.name as snack_name
        FROM order_items oi
        JOIN snacks s ON oi.snack_id = s.id
        WHERE oi.order_id = ?
      `).all(order.id);
      return { ...order, items };
    });

    res.json(result);
  } catch (err) {
    console.error("[Admin] Orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/admin/bookings - List all bookings
router.get("/bookings", (req: AuthRequest, res: Response) => {
  try {
    const { date, status } = req.query;
    const db = getDb();

    let query = `
      SELECT b.*, u.name as user_name, u.email as user_email, c.name as console_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN consoles c ON b.console_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date && typeof date === "string") {
      query += " AND b.date = ?";
      params.push(date);
    }
    if (status && typeof status === "string") {
      query += " AND b.status = ?";
      params.push(status);
    }

    query += " ORDER BY b.date DESC, b.time_slot ASC LIMIT 100";

    const bookings = db.prepare(query).all(...params);
    res.json(bookings);
  } catch (err) {
    console.error("[Admin] Bookings error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// GET /api/admin/customers - List all customers
router.get("/customers", (_req: AuthRequest, res: Response) => {
  try {
    const db = getDb();

    const customers = db.prepare(`
      SELECT
        u.id, u.name, u.email, u.phone, u.created_at,
        COALESCE(l.total_visits, 0) as total_visits,
        COALESCE(l.total_xp, 0) as total_xp,
        COALESCE(l.tier, 'Bronze') as tier,
        (SELECT COUNT(*) FROM bookings WHERE user_id = u.id) as total_bookings,
        (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE user_id = u.id AND status != 'cancelled') as total_spent
      FROM users u
      LEFT JOIN loyalty l ON l.user_id = u.id
      WHERE u.role = 'customer'
      ORDER BY total_spent DESC
    `).all();

    res.json(customers);
  } catch (err) {
    console.error("[Admin] Customers error:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// POST /api/admin/sessions/:id/end - End a session
router.post("/sessions/:id/end", (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();

    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id) as any;
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    db.transaction(() => {
      db.prepare("UPDATE sessions SET status = 'completed' WHERE id = ?").run(req.params.id);
      db.prepare("UPDATE bookings SET status = 'completed' WHERE id = ?").run(session.booking_id);
      db.prepare("UPDATE consoles SET status = 'available' WHERE id = ?").run(session.console_id);
    })();

    // Broadcast console availability change
    broadcast("console:updated", { consoleId: session.console_id, status: "available" });
    broadcast("session:ended", { sessionId: req.params.id });

    res.json({ message: "Session ended successfully" });
  } catch (err) {
    console.error("[Admin] End session error:", err);
    res.status(500).json({ error: "Failed to end session" });
  }
});

// ─── CONSOLE CRUD ─────────────────────────────────────────────────────

// POST /api/admin/consoles - Add a new console
router.post("/consoles", (req: AuthRequest, res: Response) => {
  try {
    const id = sanitizeString(req.body.id);
    const name = sanitizeString(req.body.name);
    const type = typeof req.body.type === "string" ? req.body.type.trim() : "";
    const image = typeof req.body.image === "string" ? req.body.image.trim() : "";
    const players = sanitizeString(req.body.players) || "1-4";
    const features = Array.isArray(req.body.features) ? req.body.features.map(String).slice(0, 20) : [];

    if (!isValidString(id, 1, 50)) {
      res.status(400).json({ error: "Console ID is required (max 50 chars)" });
      return;
    }

    if (!isValidString(name, 1, 100)) {
      res.status(400).json({ error: "Console name is required (max 100 chars)" });
      return;
    }

    if (!isOneOf(type, ["ps5", "psvr2"])) {
      res.status(400).json({ error: "type must be 'ps5' or 'psvr2'" });
      return;
    }

    if (!isValidString(image, 1, 2000)) {
      res.status(400).json({ error: "Image URL is required" });
      return;
    }

    const db = getDb();

    // Check for duplicate ID
    const existing = db.prepare("SELECT id FROM consoles WHERE id = ?").get(id);
    if (existing) {
      res.status(409).json({ error: "Console with this ID already exists" });
      return;
    }

    db.prepare(
      "INSERT INTO consoles (id, name, type, image, status, players, features) VALUES (?, ?, ?, ?, 'available', ?, ?)"
    ).run(id, name, type, image, players, JSON.stringify(features));

    const console_ = db.prepare("SELECT * FROM consoles WHERE id = ?").get(id) as any;
    const result = { ...console_, features: JSON.parse(console_.features) };

    // Broadcast console added
    broadcast("console:added", { console: result });

    res.status(201).json(result);
  } catch (err) {
    console.error("[Admin] Add console error:", err);
    res.status(500).json({ error: "Failed to add console" });
  }
});

// DELETE /api/admin/consoles/:id - Remove a console
router.delete("/consoles/:id", (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();

    // Check if console has active sessions or bookings
    const activeSessions = (db.prepare(
      "SELECT COUNT(*) as count FROM sessions WHERE console_id = ? AND status IN ('active', 'ending_soon', 'time_up')"
    ).get(req.params.id) as any).count;

    if (activeSessions > 0) {
      res.status(409).json({ error: "Cannot remove console with active sessions" });
      return;
    }

    const result = db.prepare("DELETE FROM consoles WHERE id = ?").run(req.params.id);

    if (result.changes === 0) {
      res.status(404).json({ error: "Console not found" });
      return;
    }

    // Broadcast console removed
    broadcast("console:removed", { consoleId: req.params.id });

    res.json({ message: "Console removed successfully", id: req.params.id });
  } catch (err) {
    console.error("[Admin] Remove console error:", err);
    res.status(500).json({ error: "Failed to remove console" });
  }
});

// ─── SNACK CRUD ───────────────────────────────────────────────────────

// GET /api/admin/snacks - List all snacks (including unavailable)
router.get("/snacks", (_req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const snacks = db.prepare("SELECT * FROM snacks ORDER BY id").all();
    res.json(snacks);
  } catch (err) {
    console.error("[Admin] Snacks list error:", err);
    res.status(500).json({ error: "Failed to fetch snacks" });
  }
});

// POST /api/admin/snacks - Add a snack
router.post("/snacks", (req: AuthRequest, res: Response) => {
  try {
    const name = sanitizeString(req.body.name);
    const price = req.body.price;
    const image = typeof req.body.image === "string" ? req.body.image.trim() : "";
    const category = typeof req.body.category === "string" ? req.body.category.trim() : "snack";

    if (!isValidString(name, 1, 100)) {
      res.status(400).json({ error: "Snack name is required (max 100 chars)" });
      return;
    }

    if (!isPositiveNumber(price) || price > 100000) {
      res.status(400).json({ error: "A valid positive price is required" });
      return;
    }

    if (!isValidString(image, 1, 2000)) {
      res.status(400).json({ error: "Image URL is required" });
      return;
    }

    if (!isOneOf(category, ["snack", "drink", "combo"])) {
      res.status(400).json({ error: "category must be 'snack', 'drink', or 'combo'" });
      return;
    }

    const db = getDb();
    const result = db.prepare(
      "INSERT INTO snacks (name, price, image, category) VALUES (?, ?, ?, ?)"
    ).run(name, price, image, category);

    const snack = db.prepare("SELECT * FROM snacks WHERE id = ?").get(result.lastInsertRowid);

    // Broadcast snack menu change
    broadcast("snack:added", { snack });

    res.status(201).json(snack);
  } catch (err) {
    console.error("[Admin] Add snack error:", err);
    res.status(500).json({ error: "Failed to add snack" });
  }
});

// PUT /api/admin/snacks/:id - Edit a snack
router.put("/snacks/:id", (req: AuthRequest, res: Response) => {
  try {
    const { name, price, image, category, available } = req.body;
    const db = getDb();

    const existing = db.prepare("SELECT * FROM snacks WHERE id = ?").get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Snack not found" });
      return;
    }

    // Validate provided fields
    if (name !== undefined && !isValidString(name, 1, 100)) {
      res.status(400).json({ error: "Snack name must be 1-100 characters" });
      return;
    }

    if (price !== undefined && (!isPositiveNumber(price) || price > 100000)) {
      res.status(400).json({ error: "Price must be a positive number" });
      return;
    }

    if (category !== undefined && !isOneOf(category, ["snack", "drink", "combo"])) {
      res.status(400).json({ error: "category must be 'snack', 'drink', or 'combo'" });
      return;
    }

    db.prepare(`
      UPDATE snacks SET
        name = COALESCE(?, name),
        price = COALESCE(?, price),
        image = COALESCE(?, image),
        category = COALESCE(?, category),
        available = COALESCE(?, available)
      WHERE id = ?
    `).run(
      name ? sanitizeString(name) : null,
      price || null,
      image ? (typeof image === "string" ? image.trim() : null) : null,
      category || null,
      available !== undefined ? (available ? 1 : 0) : null,
      req.params.id
    );

    const updated = db.prepare("SELECT * FROM snacks WHERE id = ?").get(req.params.id);

    // Broadcast snack menu change
    broadcast("snack:updated", { snack: updated });

    res.json(updated);
  } catch (err) {
    console.error("[Admin] Edit snack error:", err);
    res.status(500).json({ error: "Failed to update snack" });
  }
});

// DELETE /api/admin/snacks/:id - Remove a snack
router.delete("/snacks/:id", (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const result = db.prepare("DELETE FROM snacks WHERE id = ?").run(req.params.id);

    if (result.changes === 0) {
      res.status(404).json({ error: "Snack not found" });
      return;
    }

    // Broadcast snack menu change
    broadcast("snack:removed", { snackId: req.params.id });

    res.json({ message: "Snack removed successfully", id: req.params.id });
  } catch (err) {
    console.error("[Admin] Remove snack error:", err);
    res.status(500).json({ error: "Failed to remove snack" });
  }
});

// ─── PRICING PLAN CRUD ───────────────────────────────────────────────

// GET /api/admin/pricing - List all pricing plans
router.get("/pricing", (_req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const plans = db.prepare("SELECT * FROM pricing_plans ORDER BY price ASC").all() as any[];
    const result = plans.map((p) => ({
      ...p,
      features: JSON.parse(p.features),
      popular: !!p.popular,
    }));
    res.json(result);
  } catch (err) {
    console.error("[Admin] Pricing list error:", err);
    res.status(500).json({ error: "Failed to fetch pricing plans" });
  }
});

// POST /api/admin/pricing - Add a pricing plan
router.post("/pricing", (req: AuthRequest, res: Response) => {
  try {
    const name = sanitizeString(req.body.name);
    const price = req.body.price;
    const duration = sanitizeString(req.body.duration);
    const description = sanitizeString(req.body.description);
    const features = Array.isArray(req.body.features) ? req.body.features.map(String).slice(0, 20) : [];
    const console_type = typeof req.body.console_type === "string" ? req.body.console_type.trim() : "";
    const popular = !!req.body.popular;
    const color = sanitizeString(req.body.color) || "primary";

    if (!isValidString(name, 1, 100)) {
      res.status(400).json({ error: "Plan name is required (max 100 chars)" });
      return;
    }

    if (!isPositiveNumber(price) || price > 1000000) {
      res.status(400).json({ error: "A valid positive price is required" });
      return;
    }

    if (!isValidString(duration, 1, 50)) {
      res.status(400).json({ error: "Duration is required" });
      return;
    }

    if (!isValidString(description, 1, 500)) {
      res.status(400).json({ error: "Description is required (max 500 chars)" });
      return;
    }

    if (!isValidString(console_type, 1, 20)) {
      res.status(400).json({ error: "Console type is required" });
      return;
    }

    const db = getDb();
    const id = uuid();

    db.prepare(
      "INSERT INTO pricing_plans (id, name, price, duration, description, features, console_type, popular, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, name, price, duration, description, JSON.stringify(features), console_type, popular ? 1 : 0, color);

    const plan = db.prepare("SELECT * FROM pricing_plans WHERE id = ?").get(id) as any;
    const result = { ...plan, features: JSON.parse(plan.features), popular: !!plan.popular };

    // Broadcast pricing change
    broadcast("pricing:added", { plan: result });

    res.status(201).json(result);
  } catch (err) {
    console.error("[Admin] Add pricing error:", err);
    res.status(500).json({ error: "Failed to add pricing plan" });
  }
});

// PUT /api/admin/pricing/:id - Edit a pricing plan
router.put("/pricing/:id", (req: AuthRequest, res: Response) => {
  try {
    const { name, price, duration, description, features, console_type, popular, color } = req.body;
    const db = getDb();

    const existing = db.prepare("SELECT * FROM pricing_plans WHERE id = ?").get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Pricing plan not found" });
      return;
    }

    // Validate provided fields
    if (name !== undefined && !isValidString(name, 1, 100)) {
      res.status(400).json({ error: "Plan name must be 1-100 characters" });
      return;
    }

    if (price !== undefined && (!isPositiveNumber(price) || price > 1000000)) {
      res.status(400).json({ error: "Price must be a positive number" });
      return;
    }

    db.prepare(`
      UPDATE pricing_plans SET
        name = COALESCE(?, name),
        price = COALESCE(?, price),
        duration = COALESCE(?, duration),
        description = COALESCE(?, description),
        features = COALESCE(?, features),
        console_type = COALESCE(?, console_type),
        popular = COALESCE(?, popular),
        color = COALESCE(?, color)
      WHERE id = ?
    `).run(
      name ? sanitizeString(name) : null,
      price || null,
      duration ? sanitizeString(duration) : null,
      description ? sanitizeString(description) : null,
      features ? JSON.stringify(features) : null,
      console_type ? (typeof console_type === "string" ? console_type.trim() : null) : null,
      popular !== undefined ? (popular ? 1 : 0) : null,
      color ? sanitizeString(color) : null,
      req.params.id
    );

    const updated = db.prepare("SELECT * FROM pricing_plans WHERE id = ?").get(req.params.id) as any;
    const result = { ...updated, features: JSON.parse(updated.features), popular: !!updated.popular };

    // Broadcast pricing change
    broadcast("pricing:updated", { plan: result });

    res.json(result);
  } catch (err) {
    console.error("[Admin] Edit pricing error:", err);
    res.status(500).json({ error: "Failed to update pricing plan" });
  }
});

// DELETE /api/admin/pricing/:id - Remove a pricing plan
router.delete("/pricing/:id", (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const result = db.prepare("DELETE FROM pricing_plans WHERE id = ?").run(req.params.id);

    if (result.changes === 0) {
      res.status(404).json({ error: "Pricing plan not found" });
      return;
    }

    // Broadcast pricing change
    broadcast("pricing:removed", { planId: req.params.id });

    res.json({ message: "Pricing plan removed successfully", id: req.params.id });
  } catch (err) {
    console.error("[Admin] Remove pricing error:", err);
    res.status(500).json({ error: "Failed to remove pricing plan" });
  }
});

export default router;
