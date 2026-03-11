import { Router, Request, Response } from "express";
import { getDb } from "../db/schema.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/loyalty - Get current user's loyalty info
router.get("/", authenticate, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();

    const loyalty = db.prepare(
      "SELECT * FROM loyalty WHERE user_id = ?"
    ).get(req.userId) as any;

    if (!loyalty) {
      res.status(404).json({ error: "Loyalty record not found" });
      return;
    }

    // Get all rewards and user's status for each
    const rewards = db.prepare(`
      SELECT r.*,
        COALESCE(ur.status, 'locked') as user_status,
        ur.unlocked_at,
        ur.redeemed_at
      FROM rewards r
      LEFT JOIN user_rewards ur ON ur.reward_id = r.id AND ur.user_id = ?
      ORDER BY r.visits_required ASC
    `).all(req.userId) as any[];

    // Calculate progress to next reward
    const nextReward = rewards.find((r: any) => r.user_status === "locked" || !r.user_status);
    const maxVisitsForProgress = nextReward ? nextReward.visits_required : (rewards.length > 0 ? rewards[rewards.length - 1].visits_required : 10);

    res.json({
      ...loyalty,
      rewards,
      progress: {
        current: loyalty.total_visits,
        target: maxVisitsForProgress,
        percentage: Math.min(100, Math.round((loyalty.total_visits / maxVisitsForProgress) * 100)),
      },
    });
  } catch (err: any) {
    console.error("[Loyalty] Get error:", err);
    res.status(500).json({ error: "Failed to fetch loyalty info" });
  }
});

// GET /api/loyalty/rewards - List all available rewards (public)
router.get("/rewards", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rewards = db.prepare("SELECT * FROM rewards ORDER BY visits_required ASC").all();
    res.json(rewards);
  } catch (err: any) {
    console.error("[Loyalty] Rewards list error:", err);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
});

// POST /api/loyalty/redeem/:rewardId - Redeem a reward
router.post("/redeem/:rewardId", authenticate, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();

    const userReward = db.prepare(
      "SELECT * FROM user_rewards WHERE user_id = ? AND reward_id = ?"
    ).get(req.userId, req.params.rewardId) as any;

    if (!userReward) {
      res.status(404).json({ error: "Reward not found for this user" });
      return;
    }

    if (userReward.status !== "unlocked") {
      res.status(400).json({ error: `Cannot redeem a ${userReward.status} reward` });
      return;
    }

    db.prepare(
      "UPDATE user_rewards SET status = 'redeemed', redeemed_at = datetime('now') WHERE id = ?"
    ).run(userReward.id);

    res.json({ message: "Reward redeemed successfully", rewardId: req.params.rewardId });
  } catch (err: any) {
    console.error("[Loyalty] Redeem error:", err);
    res.status(500).json({ error: "Failed to redeem reward" });
  }
});

export default router;
