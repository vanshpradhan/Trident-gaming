package com.trident.cafe.repository;

import com.trident.cafe.entity.PricingPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PricingPlanRepository extends JpaRepository<PricingPlan, String> {
    List<PricingPlan> findAllByOrderByPriceAsc();
}
