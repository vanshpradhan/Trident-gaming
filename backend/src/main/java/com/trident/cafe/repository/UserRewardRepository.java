package com.trident.cafe.repository;

import com.trident.cafe.entity.UserReward;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRewardRepository extends JpaRepository<UserReward, String> {
    Optional<UserReward> findByUserIdAndRewardId(String userId, String rewardId);
    List<UserReward> findByUserId(String userId);
}
