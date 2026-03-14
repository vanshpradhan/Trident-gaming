package com.trident.cafe.controller;

import com.trident.cafe.entity.Booking;
import com.trident.cafe.entity.GameConsole;
import com.trident.cafe.entity.Loyalty;
import com.trident.cafe.repository.BookingRepository;
import com.trident.cafe.repository.ConsoleRepository;
import com.trident.cafe.repository.LoyaltyRepository;
import com.trident.cafe.repository.UserRepository;
import com.trident.cafe.security.AuthGuard;
import com.trident.cafe.service.EmailNotificationService;
import com.trident.cafe.service.SseService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.*;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private static final List<String> VALID_CONSOLE_TYPES = List.of("ps5", "psvr2");
    private static final Pattern DATE_RE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");
    private static final Pattern TIME_RE = Pattern.compile("^(1[0-2]|0?[1-9]):[0-5][0-9] (AM|PM)$");

    @Autowired private BookingRepository bookingRepository;
    @Autowired private ConsoleRepository consoleRepository;
    @Autowired private LoyaltyRepository loyaltyRepository;
    @Autowired private SseService sseService;
    @Autowired private UserRepository userRepository;
    @Autowired private EmailNotificationService emailNotificationService;

    // GET /api/bookings - List user's bookings
    @GetMapping
    public ResponseEntity<?> list(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireAuth(req, res)) return null;
        String userId = (String) req.getAttribute("userId");

        List<Booking> bookings = bookingRepository.findByUserIdOrderByDateDescTimeSlotDesc(userId);
        // Enrich with console_name via join query
        List<Map<String, Object>> result = bookings.stream().map(b -> {
            Map<String, Object> m = bookingToMap(b);
            consoleRepository.findById(b.getConsoleId()).ifPresent(c -> m.put("console_name", c.getName()));
            return m;
        }).toList();

        return ResponseEntity.ok(result);
    }

    // GET /api/bookings/availability - Check available time slots for a date
    @GetMapping("/availability")
    public ResponseEntity<?> availability(@RequestParam String date,
                                          @RequestParam(required = false) String console_type) {
        if (!isValidDate(date))
            return ResponseEntity.status(400).body(Map.of("error", "A valid date (YYYY-MM-DD) is required"));
        if (console_type != null && !VALID_CONSOLE_TYPES.contains(console_type))
            return ResponseEntity.status(400).body(Map.of("error", "Invalid console type"));

        // Count booked slots per time
        List<Object[]> rawSlots = console_type != null
            ? bookingRepository.countBookedSlotsByDateAndType(date, console_type)
            : bookingRepository.countBookedSlotsByDate(date);

        // Count total available consoles of the requested type
        int totalConsoles;
        if (console_type != null) {
            List<String> types = "ps5".equals(console_type) ? List.of("ps5") : List.of(console_type);
            totalConsoles = consoleRepository.countAvailableByTypes(types);
        } else {
            totalConsoles = consoleRepository.countAllNotMaintenance();
        }

        List<Map<String, Object>> availability = rawSlots.stream().map(row -> {
            String slot = (String) row[0];
            long booked = ((Number) row[1]).longValue();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("time", slot);
            m.put("available", (int) (totalConsoles - booked));
            m.put("total", totalConsoles);
            m.put("booked", (int) booked);
            return m;
        }).toList();

        return ResponseEntity.ok(availability);
    }

    // POST /api/bookings - Create a new booking (customers only)
    // SERIALIZABLE isolation prevents two concurrent requests from booking the same console/slot
    @PostMapping
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public synchronized ResponseEntity<?> create(@RequestBody Map<String, Object> body,
                                                  HttpServletRequest req,
                                                  HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireCustomer(req, res)) return null;
        String userId = (String) req.getAttribute("userId");

        String consoleType = body.get("console_type") instanceof String s ? s : "";
        String date = body.get("date") instanceof String s ? s : "";
        String timeSlot = body.get("time_slot") instanceof String s ? s : "";
        int players = body.get("players") instanceof Number n ? n.intValue() : 1;
        int hours = body.get("duration_hours") instanceof Number n ? n.intValue() : 1;

        if (!VALID_CONSOLE_TYPES.contains(consoleType))
            return ResponseEntity.status(400).body(Map.of("error", "Invalid console type. Must be 'ps5' or 'psvr2'"));
        if (!isValidDate(date))
            return ResponseEntity.status(400).body(Map.of("error", "A valid date (YYYY-MM-DD) is required"));
        if (!isValidTimeSlot(timeSlot))
            return ResponseEntity.status(400).body(Map.of("error", "Invalid time slot. Use format like '2:30 PM'"));
        if (players < 1 || players > 8)
            return ResponseEntity.status(400).body(Map.of("error", "Players must be 1-8"));
        if (hours < 1 || hours > 12)
            return ResponseEntity.status(400).body(Map.of("error", "Duration must be 1-12 hours"));

        // Find an available console of the requested type for this slot
        List<String> types = "ps5".equals(consoleType) ? List.of("ps5") : List.of(consoleType);
        List<GameConsole> available = consoleRepository.findAvailableForSlot(types, date, timeSlot);

        if (available.isEmpty())
            return ResponseEntity.status(409).body(Map.of("error", "No consoles available for the selected time slot"));

        GameConsole console = available.get(0);

        // Double-check for collision (prevents race condition when two requests arrive simultaneously)
        int conflicts = bookingRepository.countConflicting(console.getId(), date, timeSlot);
        if (conflicts > 0)
            return ResponseEntity.status(409).body(Map.of("error", "No consoles available for the selected time slot"));

        // Calculate price
        int pricePerHour;
        if ("psvr2".equals(consoleType)) {
            pricePerHour = 500;
        } else if (players == 1) {
            pricePerHour = 100;
        } else if (players == 2) {
            pricePerHour = 150;
        } else {
            pricePerHour = 150 + (players - 2) * 50;
        }
        int totalPrice = pricePerHour * hours;

        String bookingId = UUID.randomUUID().toString();
        Booking booking = new Booking();
        booking.setId(bookingId);
        booking.setUserId(userId);
        booking.setConsoleId(console.getId());
        booking.setConsoleType(consoleType);
        booking.setDate(date);
        booking.setTimeSlot(timeSlot);
        booking.setPlayers(players);
        booking.setDurationHours((double) hours);
        booking.setTotalPrice(totalPrice);
        booking.setStatus("pending");
        bookingRepository.save(booking);

        // Send email notification to admin
        userRepository.findById(userId).ifPresent(user ->
            emailNotificationService.sendBookingNotification(booking, user.getEmail(), console.getName())
        );

        // Update loyalty XP and visits
        loyaltyRepository.findByUserId(userId).ifPresent(loyalty -> {
            int newVisits = loyalty.getTotalVisits() + 1;
            loyalty.setTotalVisits(newVisits);
            loyalty.setTotalXp(loyalty.getTotalXp() + (int) Math.floor(totalPrice * 1.5));

            // 6-tier system: upgrade every 10 visits
            if (newVisits >= 60) {
                loyalty.setTier("Trident's Hero");
                loyalty.setStars((newVisits - 60) / 10);
            } else if (newVisits >= 50) {
                loyalty.setTier("Diamond");
                loyalty.setStars(0);
            } else if (newVisits >= 40) {
                loyalty.setTier("Platinum");
                loyalty.setStars(0);
            } else if (newVisits >= 30) {
                loyalty.setTier("Gold");
                loyalty.setStars(0);
            } else if (newVisits >= 20) {
                loyalty.setTier("Silver");
                loyalty.setStars(0);
            } else {
                loyalty.setTier("Bronze");
                loyalty.setStars(0);
            }

            loyaltyRepository.save(loyalty);
        });

        Map<String, Object> result = bookingToMap(booking);
        result.put("console_name", console.getName());

        sseService.broadcast("booking:created", Map.of("booking", result));
        return ResponseEntity.status(201).body(result);
    }

    // PATCH /api/bookings/:id/cancel
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable String id,
                                    HttpServletRequest req,
                                    HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireCustomer(req, res)) return null;
        String userId = (String) req.getAttribute("userId");

        Optional<Booking> opt = bookingRepository.findById(id);
        if (opt.isEmpty() || !opt.get().getUserId().equals(userId))
            return ResponseEntity.status(404).body(Map.of("error", "Booking not found"));

        Booking booking = opt.get();
        if ("cancelled".equals(booking.getStatus()) || "completed".equals(booking.getStatus()))
            return ResponseEntity.status(400).body(Map.of("error", "Cannot cancel a " + booking.getStatus() + " booking"));

        booking.setStatus("cancelled");
        bookingRepository.save(booking);

        sseService.broadcast("booking:cancelled", Map.of(
            "bookingId", id,
            "console_type", booking.getConsoleType(),
            "date", booking.getDate(),
            "time_slot", booking.getTimeSlot()
        ));

        return ResponseEntity.ok(Map.of("message", "Booking cancelled", "id", id));
    }

    // --- Helpers ---

    private boolean isValidDate(String date) {
        if (date == null || !DATE_RE.matcher(date).matches()) return false;
        try { java.time.LocalDate.parse(date); return true; } catch (Exception e) { return false; }
    }

    private boolean isValidTimeSlot(String time) {
        return time != null && TIME_RE.matcher(time).matches();
    }

    private Map<String, Object> bookingToMap(Booking b) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", b.getId());
        m.put("user_id", b.getUserId());
        m.put("console_id", b.getConsoleId());
        m.put("console_type", b.getConsoleType());
        m.put("date", b.getDate());
        m.put("time_slot", b.getTimeSlot());
        m.put("players", b.getPlayers());
        m.put("duration_hours", b.getDurationHours());
        m.put("total_price", b.getTotalPrice());
        m.put("status", b.getStatus());
        m.put("created_at", b.getCreatedAt());
        return m;
    }
}
