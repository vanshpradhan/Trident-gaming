package com.trident.cafe.repository;

import com.trident.cafe.entity.GameConsole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ConsoleRepository extends JpaRepository<GameConsole, String> {
    List<GameConsole> findAllByOrderById();

    @Query("SELECT COUNT(c) FROM GameConsole c WHERE c.type IN :types AND c.status != 'maintenance'")
    int countAvailableByTypes(@Param("types") List<String> types);

    @Query("SELECT COUNT(c) FROM GameConsole c WHERE c.status != 'maintenance'")
    int countAllNotMaintenance();

    @Query("SELECT c FROM GameConsole c WHERE c.type IN :types AND c.status = 'available' " +
           "AND c.id NOT IN (SELECT b.consoleId FROM Booking b WHERE b.date = :date AND b.timeSlot = :timeSlot AND b.status IN ('confirmed', 'active'))")
    List<GameConsole> findAvailableForSlot(@Param("types") List<String> types,
                                        @Param("date") String date,
                                        @Param("timeSlot") String timeSlot);
}
