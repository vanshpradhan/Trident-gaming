package com.trident.cafe.repository;

import com.trident.cafe.entity.Snack;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SnackRepository extends JpaRepository<Snack, Long> {
    List<Snack> findByAvailableTrueOrderById();
    List<Snack> findAllByOrderById();
}
