package com.trident.cafe.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "sessions",
    indexes = {
        @Index(name = "idx_sessions_console", columnList = "console_id"),
        @Index(name = "idx_sessions_status", columnList = "status")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Session {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "booking_id", nullable = false, length = 36)
    private String bookingId;

    @Column(name = "console_id", nullable = false, length = 50)
    private String consoleId;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(name = "player_name", nullable = false, length = 100)
    private String playerName;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime = LocalDateTime.now();

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(nullable = false, length = 20)
    private String status = "active"; // 'active' | 'ending_soon' | 'time_up' | 'completed'

    @PrePersist
    protected void onCreate() {
        startTime = LocalDateTime.now();
    }
}
