package com.trident.cafe.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "pricing_plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PricingPlan {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private Integer price;

    @Column(nullable = false, length = 50)
    private String duration;

    @Column(nullable = false, length = 500)
    private String description;

    // Stored as JSON array string
    @Column(nullable = false, columnDefinition = "TEXT")
    private String features = "[]";

    @Column(name = "console_type", nullable = false, length = 20)
    private String consoleType;

    @Column(nullable = false)
    private Boolean popular = false;

    @Column(nullable = false, length = 50)
    private String color = "primary";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
