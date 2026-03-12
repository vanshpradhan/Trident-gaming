package com.trident.cafe.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "loyalty",
    indexes = {
        @Index(name = "idx_loyalty_user", columnList = "user_id", unique = true)
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Loyalty {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "user_id", nullable = false, unique = true, length = 36)
    private String userId;

    @Column(name = "total_visits", nullable = false)
    private Integer totalVisits = 0;

    @Column(name = "total_xp", nullable = false)
    private Integer totalXp = 0;

    @Column(nullable = false, length = 20)
    private String tier = "Bronze"; // Bronze | Silver | Gold | Platinum | Diamond | Trident's Hero

    @Column(nullable = false, columnDefinition = "INTEGER DEFAULT 0")
    private Integer stars = 0;

    @Column(name = "active_boosters", nullable = false)
    private Integer activeBoosters = 0;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
