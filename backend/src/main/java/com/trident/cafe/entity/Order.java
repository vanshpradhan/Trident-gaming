package com.trident.cafe.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "orders",
    indexes = {
        @Index(name = "idx_orders_user", columnList = "user_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(name = "console_id", length = 50)
    private String consoleId;

    @Column(name = "total_price", nullable = false)
    private Integer totalPrice;

    @Column(nullable = false, length = 20)
    private String status = "pending"; // 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "orderId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<OrderItem> items;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
