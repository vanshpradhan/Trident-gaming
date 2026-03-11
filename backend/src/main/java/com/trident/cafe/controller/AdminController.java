package com.trident.cafe.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trident.cafe.entity.*;
import com.trident.cafe.entity.GameConsole;
import com.trident.cafe.repository.*;
import com.trident.cafe.security.AuthGuard;
import com.trident.cafe.service.SseService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final ObjectMapper mapper = new ObjectMapper();

    @Autowired private UserRepository userRepository;
    @Autowired private ConsoleRepository consoleRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private OrderItemRepository orderItemRepository;
    @Autowired private SessionRepository sessionRepository;
    @Autowired private SnackRepository snackRepository;
    @Autowired private PricingPlanRepository pricingPlanRepository;
    @Autowired private SseService sseService;
    @Autowired private PricingController pricingController;

    // ─── AUTH CHECK (applied to all below) ─────────────────────────────

    private boolean isAdmin(HttpServletRequest req, HttpServletResponse res) throws IOException {
        return AuthGuard.requireAdmin(req, res);
    }

    // GET /api/admin/stats
    @GetMapping("/stats")
    public ResponseEntity<?> stats(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;

        long totalConsoles = consoleRepository.count();
        long activeConsoles = consoleRepository.findAll().stream().filter(c -> "occupied".equals(c.getStatus())).count();
        long availableConsoles = consoleRepository.findAll().stream().filter(c -> "available".equals(c.getStatus())).count();

        long pendingOrders = orderRepository.findAll().stream()
            .filter(o -> "pending".equals(o.getStatus()) || "preparing".equals(o.getStatus())).count();

        // Today's booking revenue
        String today = java.time.LocalDate.now().toString();
        long todayRevenue = bookingRepository.findAll().stream()
            .filter(b -> today.equals(b.getDate()) && !b.getStatus().equals("cancelled"))
            .mapToLong(Booking::getTotalPrice).sum();

        // Today's order revenue
        Long orderRevenueLong = orderRepository.sumTodayOrderRevenue();
        long orderRevenue = orderRevenueLong != null ? orderRevenueLong : 0L;

        long totalCustomers = userRepository.countByRole("customer");

        long todayBookings = bookingRepository.findAll().stream()
            .filter(b -> today.equals(b.getDate())).count();

        long total = todayRevenue + orderRevenue;

        return ResponseEntity.ok(Map.of(
            "consoles", Map.of(
                "total", totalConsoles, "active", activeConsoles,
                "available", availableConsoles, "display", activeConsoles + "/" + totalConsoles),
            "orders", Map.of("pending", pendingOrders),
            "revenue", Map.of(
                "today", total, "bookings", todayRevenue, "orders", orderRevenue,
                "display", "₹" + String.format("%,d", total).replace(",", ",")),
            "customers", Map.of("total", totalCustomers),
            "bookings", Map.of("today", todayBookings)
        ));
    }

    // GET /api/admin/sessions
    @GetMapping("/sessions")
    public ResponseEntity<?> sessions(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;

        List<Session> sessions = sessionRepository.findByStatusInOrderByEndTimeAsc(
            List.of("active", "ending_soon", "time_up"));

        LocalDateTime now = LocalDateTime.now();
        List<Map<String, Object>> result = sessions.stream().map(s -> {
            long diffMs = ChronoUnit.MILLIS.between(now, s.getEndTime());
            long minsRemaining = Math.max(0, (long) Math.ceil(diffMs / 60000.0));
            String computedStatus = minsRemaining <= 0 ? "time_up" : minsRemaining <= 15 ? "ending_soon" : "active";

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("booking_id", s.getBookingId());
            m.put("console_id", s.getConsoleId());
            m.put("user_id", s.getUserId());
            m.put("player_name", s.getPlayerName());
            m.put("start_time", s.getStartTime());
            m.put("end_time", s.getEndTime());
            m.put("status", s.getStatus());
            m.put("time_remaining_mins", minsRemaining);
            m.put("time_remaining_display", minsRemaining > 0 ? minsRemaining + " mins" : "0 mins");
            m.put("computed_status", computedStatus);

            consoleRepository.findById(s.getConsoleId()).ifPresent(c -> {
                m.put("console_name", c.getName());
                m.put("console_type", c.getType());
            });
            userRepository.findById(s.getUserId()).ifPresent(u -> {
                m.put("user_name", u.getName());
                m.put("user_email", u.getEmail());
            });
            return m;
        }).toList();

        return ResponseEntity.ok(result);
    }

    // GET /api/admin/orders
    @GetMapping("/orders")
    public ResponseEntity<?> orders(@RequestParam(required = false) String status,
                                     HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;

        List<Order> orders = orderRepository.findAllWithStatusFilter(status);
        List<Map<String, Object>> result = orders.stream().limit(50).map(o -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", o.getId());
            m.put("user_id", o.getUserId());
            m.put("console_id", o.getConsoleId());
            m.put("total_price", o.getTotalPrice());
            m.put("status", o.getStatus());
            m.put("created_at", o.getCreatedAt());
            userRepository.findById(o.getUserId()).ifPresent(u -> {
                m.put("user_name", u.getName());
                m.put("user_email", u.getEmail());
            });
            List<OrderItem> items = orderItemRepository.findByOrderId(o.getId());
            m.put("items", items.stream().map(oi -> {
                Map<String, Object> im = new LinkedHashMap<>();
                im.put("id", oi.getId());
                im.put("snack_id", oi.getSnackId());
                im.put("quantity", oi.getQuantity());
                im.put("price", oi.getPrice());
                snackRepository.findById(oi.getSnackId()).ifPresent(s -> im.put("snack_name", s.getName()));
                return im;
            }).toList());
            return m;
        }).toList();

        return ResponseEntity.ok(result);
    }

    // GET /api/admin/bookings
    @GetMapping("/bookings")
    public ResponseEntity<?> bookings(@RequestParam(required = false) String date,
                                       @RequestParam(required = false) String status,
                                       HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;

        List<Booking> all = bookingRepository.findAllByOrderByDateDescTimeSlotAsc();
        List<Map<String, Object>> result = all.stream()
            .filter(b -> (date == null || date.equals(b.getDate())))
            .filter(b -> (status == null || status.equals(b.getStatus())))
            .limit(100)
            .map(b -> {
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
                userRepository.findById(b.getUserId()).ifPresent(u -> {
                    m.put("user_name", u.getName());
                    m.put("user_email", u.getEmail());
                });
                consoleRepository.findById(b.getConsoleId()).ifPresent(c -> m.put("console_name", c.getName()));
                return m;
            }).toList();

        return ResponseEntity.ok(result);
    }

    @Autowired private com.trident.cafe.repository.LoyaltyRepository loyaltyRepository;

    // GET /api/admin/customers
    @GetMapping("/customers")
    public ResponseEntity<?> customers(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;
        List<User> users = userRepository.findAll().stream()
            .filter(u -> "customer".equals(u.getRole())).toList();
        return ResponseEntity.ok(buildCustomersResponse(users));
    }

    private List<Map<String, Object>> buildCustomersResponse(List<User> users) {
        return users.stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("name", u.getName());
            m.put("email", u.getEmail());
            m.put("phone", u.getPhone());
            m.put("created_at", u.getCreatedAt());
            loyaltyRepository.findByUserId(u.getId()).ifPresentOrElse(
                l -> {
                    m.put("total_visits", l.getTotalVisits());
                    m.put("total_xp", l.getTotalXp());
                    m.put("tier", l.getTier());
                    m.put("stars", l.getStars());
                },
                () -> { m.put("total_visits", 0); m.put("total_xp", 0); m.put("tier", "Bronze"); m.put("stars", 0); }
            );
            List<Booking> userBookings = bookingRepository.findByUserIdOrderByDateDescTimeSlotDesc(u.getId());
            m.put("total_bookings", userBookings.size());
            long spent = userBookings.stream().filter(b -> !"cancelled".equals(b.getStatus()))
                .mapToLong(Booking::getTotalPrice).sum();
            m.put("total_spent", spent);
            return m;
        }).sorted(Comparator.comparingLong(m -> -((Long) m.get("total_spent"))))
          .toList();
    }

    // PATCH /api/admin/customers/:id/visits
    @PatchMapping("/customers/{id}/visits")
    public ResponseEntity<?> updateVisits(@PathVariable String id,
                                           @RequestBody Map<String, Object> body,
                                           HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;

        int delta = body.get("delta") instanceof Number ? ((Number) body.get("delta")).intValue() : 0;
        if (delta == 0)
            return ResponseEntity.badRequest().body(Map.of("error", "delta must be non-zero"));

        Optional<Loyalty> opt = loyaltyRepository.findByUserId(id);
        if (opt.isEmpty())
            return ResponseEntity.status(404).body(Map.of("error", "Loyalty record not found"));

        Loyalty loyalty = opt.get();
        int newVisits = Math.max(0, loyalty.getTotalVisits() + delta);
        loyalty.setTotalVisits(newVisits);

        // Recalculate tier and stars
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

        sseService.broadcast("loyalty:updated", Map.of("user_id", id, "total_visits", newVisits, "tier", loyalty.getTier(), "stars", loyalty.getStars()));

        return ResponseEntity.ok(Map.of("total_visits", newVisits, "tier", loyalty.getTier(), "stars", loyalty.getStars()));
    }

    // POST /api/admin/sessions/:id/end
    @PostMapping("/sessions/{id}/end")
    @Transactional
    public ResponseEntity<?> endSession(@PathVariable String id,
                                         HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;

        Optional<Session> opt = sessionRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Session not found"));

        Session session = opt.get();
        session.setStatus("completed");
        sessionRepository.save(session);

        bookingRepository.findById(session.getBookingId()).ifPresent(b -> {
            b.setStatus("completed");
            bookingRepository.save(b);
        });

        consoleRepository.findById(session.getConsoleId()).ifPresent(c -> {
            c.setStatus("available");
            consoleRepository.save(c);
        });

        sseService.broadcast("console:updated", Map.of("consoleId", session.getConsoleId(), "status", "available"));
        sseService.broadcast("session:ended", Map.of("sessionId", id));

        return ResponseEntity.ok(Map.of("message", "Session ended successfully"));
    }

    // ─── CONSOLE CRUD ────────────────────────────────────────────────────

    @PostMapping("/consoles")
    public ResponseEntity<?> addConsole(@RequestBody Map<String, Object> body,
                                         HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;

        String id = sanitize(body.get("id"));
        String name = sanitize(body.get("name"));
        String type = body.get("type") instanceof String s ? s.trim() : "";
        String image = body.get("image") instanceof String s ? s.trim() : "";
        String players = sanitize(body.get("players"));
        if (players.isEmpty()) players = "1-4";
        List<String> features = body.get("features") instanceof List<?> l
            ? l.stream().map(Object::toString).limit(20).toList() : List.of();

        if (id.isBlank() || id.length() > 50)
            return ResponseEntity.status(400).body(Map.of("error", "Console ID is required (max 50 chars)"));
        if (name.isBlank() || name.length() > 100)
            return ResponseEntity.status(400).body(Map.of("error", "Console name is required (max 100 chars)"));
        if (!List.of("ps5", "psvr2").contains(type))
            return ResponseEntity.status(400).body(Map.of("error", "type must be 'ps5' or 'psvr2'"));
        if (image.isBlank() || image.length() > 2000)
            return ResponseEntity.status(400).body(Map.of("error", "Image URL is required"));

        if (consoleRepository.existsById(id))
            return ResponseEntity.status(409).body(Map.of("error", "Console with this ID already exists"));

        GameConsole console = new GameConsole();
        console.setId(id);
        console.setName(name);
        console.setType(type);
        console.setImage(image);
        console.setStatus("available");
        console.setPlayers(players);
        try { console.setFeatures(mapper.writeValueAsString(features)); } catch (Exception e) { console.setFeatures("[]"); }
        consoleRepository.save(console);

        Map<String, Object> result = consoleToMap(console);
        sseService.broadcast("console:added", Map.of("console", result));
        return ResponseEntity.status(201).body(result);
    }

    @DeleteMapping("/consoles/{id}")
    public ResponseEntity<?> removeConsole(@PathVariable String id,
                                            HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;

        int activeSessions = sessionRepository.countByConsoleIdAndStatusIn(id, List.of("active", "ending_soon", "time_up"));
        if (activeSessions > 0)
            return ResponseEntity.status(409).body(Map.of("error", "Cannot remove console with active sessions"));

        if (!consoleRepository.existsById(id))
            return ResponseEntity.status(404).body(Map.of("error", "Console not found"));

        consoleRepository.deleteById(id);
        sseService.broadcast("console:removed", Map.of("consoleId", id));
        return ResponseEntity.ok(Map.of("message", "Console removed successfully", "id", id));
    }

    // ─── SNACK CRUD ──────────────────────────────────────────────────────

    @GetMapping("/snacks")
    public ResponseEntity<?> listSnacks(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;
        return ResponseEntity.ok(snackRepository.findAllByOrderById());
    }

    @PostMapping("/snacks")
    public ResponseEntity<?> addSnack(@RequestBody Map<String, Object> body,
                                       HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;

        String name = sanitize(body.get("name"));
        Object priceObj = body.get("price");
        String image = body.get("image") instanceof String s ? s.trim() : "";
        String category = body.get("category") instanceof String s ? s.trim() : "snack";

        if (name.isBlank() || name.length() > 100)
            return ResponseEntity.status(400).body(Map.of("error", "Snack name is required (max 100 chars)"));
        if (!(priceObj instanceof Number) || ((Number) priceObj).doubleValue() <= 0 || ((Number) priceObj).doubleValue() > 100000)
            return ResponseEntity.status(400).body(Map.of("error", "A valid positive price is required"));
        if (image.isBlank() || image.length() > 2000)
            return ResponseEntity.status(400).body(Map.of("error", "Image URL is required"));
        if (!List.of("snack", "drink", "combo").contains(category))
            return ResponseEntity.status(400).body(Map.of("error", "category must be 'snack', 'drink', or 'combo'"));

        Snack snack = new Snack();
        snack.setName(name);
        snack.setPrice(((Number) priceObj).intValue());
        snack.setImage(image);
        snack.setCategory(category);
        snack.setAvailable(true);
        snackRepository.save(snack);

        sseService.broadcast("snack:added", Map.of("snack", snack));
        return ResponseEntity.status(201).body(snack);
    }

    @PutMapping("/snacks/{id}")
    public ResponseEntity<?> editSnack(@PathVariable Long id,
                                        @RequestBody Map<String, Object> body,
                                        HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;

        Optional<Snack> opt = snackRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Snack not found"));

        Snack snack = opt.get();
        if (body.containsKey("name")) {
            String name = sanitize(body.get("name"));
            if (name.isBlank() || name.length() > 100)
                return ResponseEntity.status(400).body(Map.of("error", "Snack name must be 1-100 characters"));
            snack.setName(name);
        }
        if (body.containsKey("price")) {
            Object p = body.get("price");
            if (!(p instanceof Number) || ((Number) p).doubleValue() <= 0)
                return ResponseEntity.status(400).body(Map.of("error", "Price must be a positive number"));
            snack.setPrice(((Number) p).intValue());
        }
        if (body.containsKey("image") && body.get("image") instanceof String img) snack.setImage(img.trim());
        if (body.containsKey("category")) {
            String cat = body.get("category").toString().trim();
            if (!List.of("snack", "drink", "combo").contains(cat))
                return ResponseEntity.status(400).body(Map.of("error", "category must be 'snack', 'drink', or 'combo'"));
            snack.setCategory(cat);
        }
        if (body.containsKey("available")) snack.setAvailable(Boolean.TRUE.equals(body.get("available")));

        snackRepository.save(snack);
        sseService.broadcast("snack:updated", Map.of("snack", snack));
        return ResponseEntity.ok(snack);
    }

    @DeleteMapping("/snacks/{id}")
    public ResponseEntity<?> removeSnack(@PathVariable Long id,
                                          HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;
        if (!snackRepository.existsById(id)) return ResponseEntity.status(404).body(Map.of("error", "Snack not found"));
        snackRepository.deleteById(id);
        sseService.broadcast("snack:removed", Map.of("snackId", id));
        return ResponseEntity.ok(Map.of("message", "Snack removed successfully", "id", id));
    }

    // ─── PRICING CRUD ────────────────────────────────────────────────────

    @GetMapping("/pricing")
    public ResponseEntity<?> listPricing(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;
        return pricingController.list();
    }

    @PostMapping("/pricing")
    public ResponseEntity<?> addPricing(@RequestBody Map<String, Object> body,
                                         HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;

        String name = sanitize(body.get("name"));
        Object priceObj = body.get("price");
        String duration = sanitize(body.get("duration"));
        String description = sanitize(body.get("description"));
        List<String> features = body.get("features") instanceof List<?> l
            ? l.stream().map(Object::toString).limit(20).toList() : List.of();
        String consoleType = body.get("console_type") instanceof String s ? s.trim() : "";
        boolean popular = Boolean.TRUE.equals(body.get("popular"));
        String color = sanitize(body.get("color"));
        if (color.isEmpty()) color = "primary";

        if (name.isBlank() || name.length() > 100)
            return ResponseEntity.status(400).body(Map.of("error", "Plan name is required (max 100 chars)"));
        if (!(priceObj instanceof Number) || ((Number) priceObj).doubleValue() <= 0)
            return ResponseEntity.status(400).body(Map.of("error", "A valid positive price is required"));
        if (duration.isBlank()) return ResponseEntity.status(400).body(Map.of("error", "Duration is required"));
        if (description.isBlank()) return ResponseEntity.status(400).body(Map.of("error", "Description is required (max 500 chars)"));
        if (consoleType.isBlank()) return ResponseEntity.status(400).body(Map.of("error", "Console type is required"));

        PricingPlan plan = new PricingPlan();
        plan.setId(UUID.randomUUID().toString());
        plan.setName(name);
        plan.setPrice(((Number) priceObj).intValue());
        plan.setDuration(duration);
        plan.setDescription(description);
        try { plan.setFeatures(mapper.writeValueAsString(features)); } catch (Exception e) { plan.setFeatures("[]"); }
        plan.setConsoleType(consoleType);
        plan.setPopular(popular);
        plan.setColor(color);
        pricingPlanRepository.save(plan);

        Map<String, Object> result = pricingController.toMap(plan);
        sseService.broadcast("pricing:added", Map.of("plan", result));
        return ResponseEntity.status(201).body(result);
    }

    @PutMapping("/pricing/{id}")
    public ResponseEntity<?> editPricing(@PathVariable String id,
                                          @RequestBody Map<String, Object> body,
                                          HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;

        Optional<PricingPlan> opt = pricingPlanRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Pricing plan not found"));

        PricingPlan plan = opt.get();
        if (body.containsKey("name")) {
            String n = sanitize(body.get("name"));
            if (n.isBlank() || n.length() > 100) return ResponseEntity.status(400).body(Map.of("error", "Plan name must be 1-100 characters"));
            plan.setName(n);
        }
        if (body.containsKey("price")) {
            Object p = body.get("price");
            if (!(p instanceof Number) || ((Number) p).doubleValue() <= 0) return ResponseEntity.status(400).body(Map.of("error", "Price must be a positive number"));
            plan.setPrice(((Number) p).intValue());
        }
        if (body.containsKey("duration") && body.get("duration") instanceof String d) plan.setDuration(sanitize(d));
        if (body.containsKey("description") && body.get("description") instanceof String d) plan.setDescription(sanitize(d));
        if (body.containsKey("features") && body.get("features") instanceof List<?> f) {
            try { plan.setFeatures(mapper.writeValueAsString(f.stream().map(Object::toString).limit(20).toList())); } catch (Exception ignored) {}
        }
        if (body.containsKey("console_type") && body.get("console_type") instanceof String ct) plan.setConsoleType(ct.trim());
        if (body.containsKey("popular")) plan.setPopular(Boolean.TRUE.equals(body.get("popular")));
        if (body.containsKey("color") && body.get("color") instanceof String c) plan.setColor(sanitize(c));

        pricingPlanRepository.save(plan);
        Map<String, Object> result = pricingController.toMap(plan);
        sseService.broadcast("pricing:updated", Map.of("plan", result));
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/pricing/{id}")
    public ResponseEntity<?> removePricing(@PathVariable String id,
                                            HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!isAdmin(req, res)) return null;
        if (!pricingPlanRepository.existsById(id)) return ResponseEntity.status(404).body(Map.of("error", "Pricing plan not found"));
        pricingPlanRepository.deleteById(id);
        sseService.broadcast("pricing:removed", Map.of("planId", id));
        return ResponseEntity.ok(Map.of("message", "Pricing plan removed successfully", "id", id));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    private String sanitize(Object input) {
        if (!(input instanceof String s)) return "";
        return s.replaceAll("<[^>]*>", "").replaceAll("[<>\"'`]", "").trim();
    }

    private Map<String, Object> consoleToMap(GameConsole c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("name", c.getName());
        m.put("type", c.getType());
        m.put("image", c.getImage());
        m.put("status", c.getStatus());
        m.put("players", c.getPlayers());
        try {
            m.put("features", mapper.readValue(c.getFeatures(), new TypeReference<List<String>>() {}));
        } catch (Exception e) { m.put("features", List.of()); }
        m.put("created_at", c.getCreatedAt());
        return m;
    }
}
