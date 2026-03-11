import { Router, Request, Response } from "express";
import { getDb } from "../db/schema.js";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth.js";
import { isOneOf } from "../middleware/validate.js";
import { broadcast } from "../sse.js";

const router = Router();

const VALID_CONSOLE_STATUSES = ["available", "occupied", "maintenance"];

// GET /api/consoles - List all consoles (public)
router.get("/", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const consoles = db.prepare("SELECT * FROM consoles ORDER BY id").all() as any[];

    const result = consoles.map((c) => ({
      ...c,
      features: JSON.parse(c.features),
    }));

    res.json(result);
  } catch (err) {
    console.error("[Consoles] List error:", err);
    res.status(500).json({ error: "Failed to fetch consoles" });
  }
});

// GET /api/consoles/grouped - Get consoles grouped by type (for frontend display)
router.get("/grouped", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const consoles = db.prepare("SELECT * FROM consoles ORDER BY type, id").all() as any[];

    // Group by type and show aggregate status
    const typeMap = new Map<string, any>();

    for (const c of consoles) {
      const existing = typeMap.get(c.type);
      if (!existing) {
        typeMap.set(c.type, {
          id: c.type,
          name: c.name,
          type: c.type,
          image: c.image,
          players: c.players,
          features: JSON.parse(c.features),
          total: 1,
          available: c.status === "available" ? 1 : 0,
          occupied: c.status === "occupied" ? 1 : 0,
          status: c.status === "available" ? "available" : "occupied",
        });
      } else {
        existing.total++;
        if (c.status === "available") existing.available++;
        if (c.status === "occupied") existing.occupied++;
        // If any console of this type is available, mark as available
        if (existing.available > 0) existing.status = "available";
      }
    }

    res.json(Array.from(typeMap.values()));
  } catch (err) {
    console.error("[Consoles] Grouped error:", err);
    res.status(500).json({ error: "Failed to fetch consoles" });
  }
});

// GET /api/consoles/:id - Get single console
router.get("/:id", (req: Request, res: Response) => {
  try {
    const db = getDb();
    const console_ = db.prepare("SELECT * FROM consoles WHERE id = ?").get(req.params.id) as any;

    if (!console_) {
      res.status(404).json({ error: "Console not found" });
      return;
    }

    res.json({
      ...console_,
      features: JSON.parse(console_.features),
    });
  } catch (err) {
    console.error("[Consoles] Get error:", err);
    res.status(500).json({ error: "Failed to fetch console" });
  }
});

// PATCH /api/consoles/:id/status - Update console status (admin only)
router.patch("/:id/status", authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!isOneOf(status, VALID_CONSOLE_STATUSES)) {
      res.status(400).json({ error: "Invalid status. Must be: available, occupied, or maintenance" });
      return;
    }

    const db = getDb();
    const result = db.prepare("UPDATE consoles SET status = ? WHERE id = ?").run(status, req.params.id);

    if (result.changes === 0) {
      res.status(404).json({ error: "Console not found" });
      return;
    }

    // Broadcast console status change to all clients
    broadcast("console:updated", { consoleId: req.params.id, status });

    res.json({ message: "Console status updated", id: req.params.id, status });
  } catch (err) {
    console.error("[Consoles] Status update error:", err);
    res.status(500).json({ error: "Failed to update console status" });
  }
});

export default router;
