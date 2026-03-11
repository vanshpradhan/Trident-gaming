package com.trident.cafe.repository;

import com.trident.cafe.entity.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GameRepository extends JpaRepository<Game, Long> {
    List<Game> findByActiveTrueOrderByDisplayOrderAscIdAsc();
    List<Game> findAllByOrderByDisplayOrderAscIdAsc();
}
