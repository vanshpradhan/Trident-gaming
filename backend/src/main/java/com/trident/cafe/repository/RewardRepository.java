package com.trident.cafe.repository;

import com.trident.cafe.entity.Reward;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RewardRepository extends JpaRepository<Reward, String> {
    List<Reward> findAllByOrderByVisitsRequiredAsc();
    long count();
}
