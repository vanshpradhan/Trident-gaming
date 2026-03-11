import { Router, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { getDb } from "../db/schema.js";
import { authenticate, requireCustomer, AuthRequest } from "../middleware/auth.js";
import { isValidDate, isValidString, isPositiveInt, isOneOf } from "../middleware/validate.js";
import { broadcast } from "../sse.js";

const router = Router();

const VALID_TIME_SLOTS = ["10:00 AM", "12:00 PM", "02:00 PM", "04:00 PM", "06:00 PM", "08:00 PM", "10:00 PM"];
const VALID_CONSOLE_TYPES = ["ps5", "psvr2"];

// GET /api/bookings - List user's bookings
router.get("/", authenticate, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const bookings = db.prepare(`
      SELECT b.*, c.name as console_name
      FROM bookings b
      JOIN consoles c ON b.console_id = c.id
      WHERE b.user_id = ?
      ORDER BY b.date DESC, b.time_slot DESC
    `).all(req.userId) as any[];

    res.json(bookings);
  } catch (err) {
    console.error("[Bookings] List error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// GET /api/bookings/availability - Check available time slots for a date
router.get("/availability", (req: Request, res: Response) => {
  try {
    const date = req.query.date as string;
    const console_type = req.query.console_type as string | undefined;

    if (!date || !isValidDate(date)) {
      res.status(400).json({ error: "A valid date (YYYY-MM-DD) is required" });
      return;
    }

    if (console_type && !isOneOf(console_type, VALID_CONSOLE_TYPES)) {
      res.status(400).json({ error: "Invalid console type" });
      return;
    }

    const db = getDb();

    // Count booked slots per time
    const bookedSlots = db.prepare(`
      SELECT time_slot, COUNT(*) as booked_count
      FROM bookings
      WHERE date = ? AND status IN ('confirmed', 'active')
      ${console_type ? "AND console_type = ?" : ""}
      GROUP BY time_slot
    `).all(...(console_type ? [date, console_type] : [date])) as any[];

    // Count available consoles of the requested type
    let totalConsoles: number;
    if (console_type) {
      const types = console_type === "ps5" ? ["ps5"] : [console_type];
      totalConsoles = (db.prepare(
        `SELECT COUNT(*) as count FROM consoles WHERE type IN (${types.map(() => "?").join(",")}) AND status != 'maintenance'`
      ).get(...types) as any).count;
    } else {
      totalConsoles = (db.prepare(
        "SELECT COUNT(*) as count FROM consoles WHERE status != 'maintenance'"
      ).get() as any).count;
    }

    const bookedMap = new Map(bookedSlots.map((s: any) => [s.time_slot, s.booked_count]));

    const availability = VALID_TIME_SLOTS.map((slot) => ({
      time: slot,
      available: totalConsoles - (bookedMap.get(slot) || 0),
      total: totalConsoles,
      booked: bookedMap.get(slot) || 0,
    }));

    res.json(availability);
  } catch (err) {
    console.error("[Bookings] Availability error:", err);
    res.status(500).json({ error: "Failed to check availability" });
  }
});

// POST /api/bookings - Create a new booking (customers only)
router.post("/", authenticate, requireCustomer, (req: AuthRequest, res: Response) => {
  try {
    const { console_type, date, time_slot, players, duration_hours } = req.body;

    // Validate inputs
    if (!isOneOf(console_type, VALID_CONSOLE_TYPES)) {
      res.status(400).json({ error: "Invalid console type. Must be 'ps5' or 'psvr2'" });
      return;
    }

    if (!isValidDate(date)) {
      res.status(400).json({ error: "A valid date (YYYY-MM-DD) is required" });
      return;
    }

    if (!isValidString(time_slot) || !isOneOf(time_slot, VALID_TIME_SLOTS)) {
      res.status(400).json({ error: "Invalid time slot" });
      return;
    }

    const playerCount = players || 1;
    const hours = duration_hours || 1;

    if (!isPositiveInt(playerCount) || playerCount > 8) {
      res.status(400).json({ error: "Players must be 1-8" });
      return;
    }

    if (!isPositiveInt(hours) || hours > 12) {
      res.status(400).json({ error: "Duration must be 1-12 hours" });
      return;
    }

    const db = getDb();

    // Find an available console of the requested type
    const types = console_type === "ps5" ? ["ps5"] : [console_type];
    const availableConsole = db.prepare(`
      SELECT c.id FROM consoles c
      WHERE c.type IN (${types.map(() => "?").join(",")})
        AND c.status = 'available'
        AND c.id NOT IN (
          SELECT console_id FROM bookings
          WHERE date = ? AND time_slot = ? AND status IN ('confirmed', 'active')
        )
      LIMIT 1
    `).get(...types, date, time_slot) as any;

    if (!availableConsole) {
      res.status(409).json({ error: "No consoles available for the selected time slot" });
      return;
    }

    // Calculate price
    let pricePerHour: number;
    if (console_type === "psvr2") {
      pricePerHour = 500;
    } else if (playerCount === 1) {
      pricePerHour = 100;
    } else if (playerCount === 2) {
      pricePerHour = 150;
    } else {
      pricePerHour = 150 + (playerCount - 2) * 50;
    }

    const totalPrice = pricePerHour * hours;
    const bookingId = uuid();

    db.prepare(`
      INSERT INTO bookings (id, user_id, console_id, console_type, date, time_slot, players, duration_hours, total_price, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `).run(bookingId, req.userId, availableConsole.id, console_type, date, time_slot, playerCount, hours, totalPrice);

    // Increment user visits and XP
    db.prepare(`
      UPDATE loyalty SET
        total_visits = total_visits + 1,
        total_xp = total_xp + ?,
        tier = CASE
          WHEN total_visits + 1 >= 20 THEN 'Elite'
          WHEN total_visits + 1 >= 10 THEN 'Gold'
          WHEN total_visits + 1 >= 5 THEN 'Silver'
          ELSE 'Bronze'
        END,
        updated_at = datetime('now')
      WHERE user_id = ?
    `).run(Math.floor(totalPrice * 1.5), req.userId);

    const booking = db.prepare(`
      SELECT b.*, c.name as console_name
      FROM bookings b
      JOIN consoles c ON b.console_id = c.id
      WHERE b.id = ?
    `).get(bookingId) as any;

    // Broadcast real-time update
    broadcast("booking:created", { booking });

    res.status(201).json(booking);
  } catch (err) {
    console.error("[Bookings] Create error:", err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// PATCH /api/bookings/:id/cancel - Cancel a booking (customers only, own bookings)
router.patch("/:id/cancel", authenticate, requireCustomer, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const booking = db.prepare(
      "SELECT * FROM bookings WHERE id = ? AND user_id = ?"
    ).get(req.params.id, req.userId) as any;

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      res.status(400).json({ error: `Cannot cancel a ${booking.status} booking` });
      return;
    }

    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);

    // Broadcast real-time update
    broadcast("booking:cancelled", { bookingId: req.params.id, console_type: booking.console_type, date: booking.date, time_slot: booking.time_slot });

    res.json({ message: "Booking cancelled", id: req.params.id });
  } catch (err) {
    console.error("[Bookings] Cancel error:", err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

export default router;
