import { Router, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { getDb } from "../db/schema.js";
import { authenticate, requireCustomer, requireAdmin, AuthRequest } from "../middleware/auth.js";
import { isPositiveInt, isOneOf } from "../middleware/validate.js";
import { broadcast, sendToUser } from "../sse.js";

const router = Router();

const VALID_ORDER_STATUSES = ["pending", "preparing", "ready", "delivered", "cancelled"];

// GET /api/snacks - List all snacks (public)
router.get("/", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snacks = db.prepare("SELECT * FROM snacks WHERE available = 1 ORDER BY id").all();
    res.json(snacks);
  } catch (err) {
    console.error("[Snacks] List error:", err);
    res.status(500).json({ error: "Failed to fetch snacks" });
  }
});

// POST /api/orders - Create a new order (customers only)
router.post("/", authenticate, requireCustomer, (req: AuthRequest, res: Response) => {
  try {
    const { items, console_id } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0 || items.length > 50) {
      res.status(400).json({ error: "Order must contain 1-50 items" });
      return;
    }

    const db = getDb();

    // Validate items and calculate total
    let totalPrice = 0;
    const validatedItems: { snack_id: number; quantity: number; price: number }[] = [];

    for (const item of items) {
      if (!isPositiveInt(item.id) && !(typeof item.id === "number" && item.id > 0)) {
        res.status(400).json({ error: "Each item must have a valid id" });
        return;
      }

      if (!isPositiveInt(item.quantity) || item.quantity > 20) {
        res.status(400).json({ error: "Each item quantity must be 1-20" });
        return;
      }

      const snack = db.prepare("SELECT * FROM snacks WHERE id = ? AND available = 1").get(item.id) as any;
      if (!snack) {
        res.status(400).json({ error: `Snack with id ${item.id} not found or unavailable` });
        return;
      }

      totalPrice += snack.price * item.quantity;
      validatedItems.push({
        snack_id: snack.id,
        quantity: item.quantity,
        price: snack.price,
      });
    }

    const orderId = uuid();

    const insertOrder = db.prepare(
      "INSERT INTO orders (id, user_id, console_id, total_price, status) VALUES (?, ?, ?, ?, 'pending')"
    );
    const insertItem = db.prepare(
      "INSERT INTO order_items (order_id, snack_id, quantity, price) VALUES (?, ?, ?, ?)"
    );

    const transaction = db.transaction(() => {
      insertOrder.run(orderId, req.userId, console_id || null, totalPrice);
      for (const item of validatedItems) {
        insertItem.run(orderId, item.snack_id, item.quantity, item.price);
      }
    });

    transaction();

    // Fetch the created order with items
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as any;
    const orderItems = db.prepare(`
      SELECT oi.*, s.name as snack_name, s.image as snack_image
      FROM order_items oi
      JOIN snacks s ON oi.snack_id = s.id
      WHERE oi.order_id = ?
    `).all(orderId) as any[];

    const fullOrder = { ...order, items: orderItems };

    // Broadcast to admin dashboard
    broadcast("order:created", { order: fullOrder }, "admin");

    res.status(201).json(fullOrder);
  } catch (err) {
    console.error("[Orders] Create error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// GET /api/orders - List user's orders
router.get("/", authenticate, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const orders = db.prepare(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC"
    ).all(req.userId) as any[];

    const result = orders.map((order: any) => {
      const items = db.prepare(`
        SELECT oi.*, s.name as snack_name, s.image as snack_image
        FROM order_items oi
        JOIN snacks s ON oi.snack_id = s.id
        WHERE oi.order_id = ?
      `).all(order.id);
      return { ...order, items };
    });

    res.json(result);
  } catch (err) {
    console.error("[Orders] List error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// PATCH /api/orders/:id/status - Update order status (admin only)
router.patch("/:id/status", authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!isOneOf(status, VALID_ORDER_STATUSES)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const db = getDb();

    // Get order to find the user to notify
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id) as any;
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const result = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);

    if (result.changes === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // Notify the customer who placed the order
    sendToUser(order.user_id, "order:updated", { orderId: req.params.id, status });

    // Also broadcast to admin (so other admin tabs update)
    broadcast("order:updated", { orderId: req.params.id, status }, "admin");

    res.json({ message: "Order status updated", id: req.params.id, status });
  } catch (err) {
    console.error("[Orders] Status update error:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;
