package com.trident.cafe.repository;

import com.trident.cafe.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, String> {

    List<Booking> findByUserIdOrderByDateDescTimeSlotDesc(String userId);

    @Query("SELECT b.timeSlot, COUNT(b) FROM Booking b WHERE b.date = :date AND b.status IN ('pending','confirmed','active') GROUP BY b.timeSlot")
    List<Object[]> countBookedSlotsByDate(@Param("date") String date);

    @Query("SELECT b.timeSlot, COUNT(b) FROM Booking b WHERE b.date = :date AND b.consoleType = :type AND b.status IN ('pending','confirmed','active') GROUP BY b.timeSlot")
    List<Object[]> countBookedSlotsByDateAndType(@Param("date") String date, @Param("type") String type);

    // Used for collision check with pessimistic lock
    @Query(value = "SELECT COUNT(*) FROM bookings WHERE console_id = :consoleId AND date = :date AND time_slot = :timeSlot AND status IN ('pending','confirmed','active')", nativeQuery = true)
    int countConflicting(@Param("consoleId") String consoleId, @Param("date") String date, @Param("timeSlot") String timeSlot);

    List<Booking> findByDateOrderByTimeSlotAsc(String date);

    List<Booking> findAllByOrderByDateDescTimeSlotAsc();
}
