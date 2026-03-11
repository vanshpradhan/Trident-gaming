package com.trident.cafe.controller;

import com.trident.cafe.entity.Loyalty;
import com.trident.cafe.entity.Reward;
import com.trident.cafe.entity.User;
import com.trident.cafe.entity.UserReward;
import com.trident.cafe.repository.LoyaltyRepository;
import com.trident.cafe.repository.RewardRepository;
import com.trident.cafe.repository.UserRepository;
import com.trident.cafe.repository.UserRewardRepository;
import com.trident.cafe.security.AuthGuard;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/loyalty")
public class LoyaltyController {

    @Autowired private LoyaltyRepository loyaltyRepository;
    @Autowired private RewardRepository rewardRepository;
    @Autowired private UserRewardRepository userRewardRepository;
    @Autowired private UserRepository userRepository;

    // GET /api/loyalty - Current user's loyalty info
    @GetMapping
    public ResponseEntity<?> get(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireAuth(req, res)) return null;
        String userId = (String) req.getAttribute("userId");

        Optional<Loyalty> loyaltyOpt = loyaltyRepository.findByUserId(userId);
        if (loyaltyOpt.isEmpty())
            return ResponseEntity.status(404).body(Map.of("error", "Loyalty record not found"));

        Loyalty loyalty = loyaltyOpt.get();
        List<Reward> allRewards = rewardRepository.findAllByOrderByVisitsRequiredAsc();
        List<UserReward> userRewards = userRewardRepository.findByUserId(userId);

        Map<String, String> statusByReward = new HashMap<>();
        for (UserReward ur : userRewards) {
            statusByReward.put(ur.getRewardId(), ur.getStatus());
        }

        List<Map<String, Object>> rewardsWithStatus = allRewards.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("name", r.getName());
            m.put("description", r.getDescription());
            m.put("visits_required", r.getVisitsRequired());
            m.put("reward_type", r.getRewardType());
            m.put("reward_value", r.getRewardValue());
            m.put("created_at", r.getCreatedAt());

            String us = statusByReward.getOrDefault(r.getId(), "locked");
            m.put("user_status", us);

            userRewardRepository.findByUserIdAndRewardId(userId, r.getId()).ifPresent(ur -> {
                m.put("unlocked_at", ur.getUnlockedAt());
                m.put("redeemed_at", ur.getRedeemedAt());
            });
            return m;
        }).toList();

        // Progress to next tier (every 10 visits)
        int current = loyalty.getTotalVisits();
        int nextTierAt = ((current / 10) + 1) * 10;
        int progressInTier = current % 10;
        int pct = (int) Math.round((double) progressInTier / 10 * 100);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", loyalty.getId());
        result.put("user_id", loyalty.getUserId());
        result.put("total_visits", loyalty.getTotalVisits());
        result.put("total_xp", loyalty.getTotalXp());
        result.put("tier", loyalty.getTier());
        result.put("stars", loyalty.getStars());
        result.put("active_boosters", loyalty.getActiveBoosters());
        result.put("updated_at", loyalty.getUpdatedAt());
        result.put("rewards", rewardsWithStatus);
        result.put("progress", Map.of("current", progressInTier, "target", 10, "percentage", pct, "next_tier_at", nextTierAt));

        return ResponseEntity.ok(result);
    }

    // GET /api/loyalty/rewards - List all rewards (public)
    @GetMapping("/rewards")
    public ResponseEntity<?> rewards() {
        return ResponseEntity.ok(rewardRepository.findAllByOrderByVisitsRequiredAsc());
    }

    // GET /api/loyalty/leaderboard - Top 5 customers by visits (public)
    @GetMapping("/leaderboard")
    public ResponseEntity<?> leaderboard() {
        List<Loyalty> top5 = loyaltyRepository.findTop5ByOrderByTotalVisitsDesc();
        List<Map<String, Object>> board = new ArrayList<>();
        for (Loyalty l : top5) {
            Map<String, Object> entry = new LinkedHashMap<>();
            // Look up user name
            String name = userRepository.findById(l.getUserId())
                .map(User::getName)
                .orElse("Unknown");
            entry.put("name", name);
            entry.put("total_visits", l.getTotalVisits());
            entry.put("tier", l.getTier());
            entry.put("stars", l.getStars());
            entry.put("total_xp", l.getTotalXp());
            board.add(entry);
        }
        return ResponseEntity.ok(board);
    }

    // POST /api/loyalty/redeem/:rewardId
    @PostMapping("/redeem/{rewardId}")
    public ResponseEntity<?> redeem(@PathVariable String rewardId,
                                     HttpServletRequest req,
                                     HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireAuth(req, res)) return null;
        String userId = (String) req.getAttribute("userId");

        Optional<UserReward> opt = userRewardRepository.findByUserIdAndRewardId(userId, rewardId);
        if (opt.isEmpty())
            return ResponseEntity.status(404).body(Map.of("error", "Reward not found for this user"));

        UserReward ur = opt.get();
        if (!"unlocked".equals(ur.getStatus()))
            return ResponseEntity.status(400).body(Map.of("error", "Cannot redeem a " + ur.getStatus() + " reward"));

        ur.setStatus("redeemed");
        ur.setRedeemedAt(java.time.LocalDateTime.now());
        userRewardRepository.save(ur);

        return ResponseEntity.ok(Map.of("message", "Reward redeemed successfully", "rewardId", rewardId));
    }
}
