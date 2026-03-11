package com.trident.cafe.repository;

import com.trident.cafe.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SessionRepository extends JpaRepository<Session, String> {
    List<Session> findByStatusInOrderByEndTimeAsc(List<String> statuses);

    int countByConsoleIdAndStatusIn(String consoleId, List<String> statuses);
}
