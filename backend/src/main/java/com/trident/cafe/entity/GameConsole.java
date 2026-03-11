package com.trident.cafe.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "consoles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GameConsole {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 10)
    private String type; // 'ps5' | 'psvr2'

    @Column(nullable = false, length = 2000)
    private String image;

    @Column(nullable = false, length = 20)
    private String status = "available"; // 'available' | 'occupied' | 'maintenance'

    @Column(nullable = false, length = 20)
    private String players = "1-4";

    // Stored as JSON string e.g. ["4K 120Hz","DualSense"]
    @Column(nullable = false, columnDefinition = "TEXT")
    private String features = "[]";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
