package com.trident.cafe.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "rewards")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Reward {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "visits_required", nullable = false)
    private Integer visitsRequired;

    @Column(name = "reward_type", nullable = false, length = 20)
    private String rewardType; // 'discount' | 'free_session' | 'free_snack' | 'xp_boost'

    @Column(name = "reward_value", nullable = false, length = 100)
    private String rewardValue;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
