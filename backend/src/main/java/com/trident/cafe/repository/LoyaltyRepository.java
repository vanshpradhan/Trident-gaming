package com.trident.cafe.repository;

import com.trident.cafe.entity.Loyalty;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LoyaltyRepository extends JpaRepository<Loyalty, String> {
    Optional<Loyalty> findByUserId(String userId);
    List<Loyalty> findTop5ByOrderByTotalVisitsDesc();
}
