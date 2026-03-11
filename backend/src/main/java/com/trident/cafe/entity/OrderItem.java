package com.trident.cafe.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false, length = 36)
    private String orderId;

    @Column(name = "snack_id", nullable = false)
    private Long snackId;

    @Column(nullable = false)
    private Integer quantity = 1;

    @Column(nullable = false)
    private Integer price;
}
