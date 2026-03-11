package com.trident.cafe.repository;

import com.trident.cafe.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, String> {
    List<Order> findByUserIdOrderByCreatedAtDesc(String userId);

    @Query("SELECT o FROM Order o WHERE (:status IS NULL OR o.status = :status) ORDER BY o.createdAt DESC")
    List<Order> findAllWithStatusFilter(@Param("status") String status);

    @Query(value = "SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE CAST(created_at AS DATE) = CURRENT_DATE AND status != 'cancelled'", nativeQuery = true)
    Long sumTodayOrderRevenue();
}
