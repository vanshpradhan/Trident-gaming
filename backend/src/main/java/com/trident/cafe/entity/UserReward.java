package com.trident.cafe.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_rewards")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserReward {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(name = "reward_id", nullable = false, length = 36)
    private String rewardId;

    @Column(nullable = false, length = 10)
    private String status = "unlocked"; // 'locked' | 'unlocked' | 'redeemed'

    @Column(name = "unlocked_at")
    private LocalDateTime unlockedAt;

    @Column(name = "redeemed_at")
    private LocalDateTime redeemedAt;
}
