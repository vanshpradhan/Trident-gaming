package com.trident.cafe.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings",
    indexes = {
        @Index(name = "idx_bookings_user", columnList = "user_id"),
        @Index(name = "idx_bookings_console", columnList = "console_id"),
        @Index(name = "idx_bookings_date", columnList = "date")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Booking {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(name = "console_id", nullable = false, length = 50)
    private String consoleId;

    @Column(name = "console_type", nullable = false, length = 10)
    private String consoleType; // 'ps5' | 'psvr2'

    @Column(nullable = false, length = 10)
    private String date; // YYYY-MM-DD

    @Column(name = "time_slot", nullable = false, length = 20)
    private String timeSlot;

    @Column(nullable = false)
    private Integer players = 1;

    @Column(name = "duration_hours", nullable = false)
    private Double durationHours = 1.0;

    @Column(name = "total_price", nullable = false)
    private Integer totalPrice;

    @Column(nullable = false, length = 20)
    private String status = "confirmed"; // 'confirmed' | 'active' | 'completed' | 'cancelled'

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
