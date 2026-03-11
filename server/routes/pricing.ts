import { Router, Request, Response } from "express";
import { getDb } from "../db/schema.js";

const router = Router();

// GET /api/pricing - List all pricing plans (public)
router.get("/", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const plans = db.prepare("SELECT * FROM pricing_plans ORDER BY price ASC").all() as any[];

    const result = plans.map((p) => ({
      ...p,
      features: JSON.parse(p.features),
      popular: !!p.popular,
    }));

    res.json(result);
  } catch (err: any) {
    console.error("[Pricing] List error:", err);
    res.status(500).json({ error: "Failed to fetch pricing plans" });
  }
});

export default router;
