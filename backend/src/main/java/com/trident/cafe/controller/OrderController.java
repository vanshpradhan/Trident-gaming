package com.trident.cafe.controller;

import com.trident.cafe.entity.Order;
import com.trident.cafe.entity.OrderItem;
import com.trident.cafe.entity.Snack;
import com.trident.cafe.repository.OrderItemRepository;
import com.trident.cafe.repository.OrderRepository;
import com.trident.cafe.repository.SnackRepository;
import com.trident.cafe.repository.UserRepository;
import com.trident.cafe.security.AuthGuard;
import com.trident.cafe.service.EmailNotificationService;
import com.trident.cafe.service.SseService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final List<String> VALID_STATUSES =
        List.of("pending", "preparing", "ready", "delivered", "cancelled");

    @Autowired private OrderRepository orderRepository;
    @Autowired private OrderItemRepository orderItemRepository;
    @Autowired private SnackRepository snackRepository;
    @Autowired private SseService sseService;
    @Autowired private UserRepository userRepository;
    @Autowired private EmailNotificationService emailNotificationService;

    // POST /api/orders - Create a new order (customers only)
    @PostMapping
    @Transactional
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body,
                                    HttpServletRequest req,
                                    HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireCustomer(req, res)) return null;
        String userId = (String) req.getAttribute("userId");

        List<?> rawItems = body.get("items") instanceof List<?> l ? l : null;
        if (rawItems == null || rawItems.isEmpty() || rawItems.size() > 50)
            return ResponseEntity.status(400).body(Map.of("error", "Order must contain 1-50 items"));

        String consoleId = body.get("console_id") instanceof String s ? s : null;

        int totalPrice = 0;
        List<OrderItem> itemsToSave = new ArrayList<>();
        String orderId = UUID.randomUUID().toString();

        for (Object raw : rawItems) {
            if (!(raw instanceof Map<?, ?> itemMap))
                return ResponseEntity.status(400).body(Map.of("error", "Invalid item format"));

            Object idObj = itemMap.get("id");
            Object qtyObj = itemMap.get("quantity");

            if (!(idObj instanceof Number) || ((Number) idObj).longValue() <= 0)
                return ResponseEntity.status(400).body(Map.of("error", "Each item must have a valid id"));

            if (!(qtyObj instanceof Number) || ((Number) qtyObj).intValue() < 1 || ((Number) qtyObj).intValue() > 20)
                return ResponseEntity.status(400).body(Map.of("error", "Each item quantity must be 1-20"));

            long snackId = ((Number) idObj).longValue();
            int qty = ((Number) qtyObj).intValue();

            Optional<Snack> snackOpt = snackRepository.findById(snackId);
            if (snackOpt.isEmpty() || !snackOpt.get().getAvailable())
                return ResponseEntity.status(400).body(Map.of("error", "Snack with id " + snackId + " not found or unavailable"));

            Snack snack = snackOpt.get();
            totalPrice += snack.getPrice() * qty;

            OrderItem oi = new OrderItem();
            oi.setOrderId(orderId);
            oi.setSnackId(snack.getId());
            oi.setQuantity(qty);
            oi.setPrice(snack.getPrice());
            itemsToSave.add(oi);
        }

        Order order = new Order();
        order.setId(orderId);
        order.setUserId(userId);
        order.setConsoleId(consoleId);
        order.setTotalPrice(totalPrice);
        order.setStatus("pending");
        orderRepository.save(order);
        orderItemRepository.saveAll(itemsToSave);

        // Send email notification to admin
        userRepository.findById(userId).ifPresent(user ->
            emailNotificationService.sendOrderNotification(order, itemsToSave, user.getEmail())
        );

        Map<String, Object> fullOrder = orderToMap(order, itemsToSave);

        sseService.broadcast("order:created", Map.of("order", fullOrder), "admin");
        return ResponseEntity.status(201).body(fullOrder);
    }

    // GET /api/orders - List user's orders
    @GetMapping
    public ResponseEntity<?> list(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireAuth(req, res)) return null;
        String userId = (String) req.getAttribute("userId");

        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Map<String, Object>> result = orders.stream().map(o -> {
            List<OrderItem> items = orderItemRepository.findByOrderId(o.getId());
            return orderToMap(o, items);
        }).toList();

        return ResponseEntity.ok(result);
    }

    // PATCH /api/orders/:id/status - Update order status (admin only)
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id,
                                           @RequestBody Map<String, Object> body,
                                           HttpServletRequest req,
                                           HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireAdmin(req, res)) return null;

        String status = body.get("status") instanceof String s ? s : "";
        if (!VALID_STATUSES.contains(status))
            return ResponseEntity.status(400).body(Map.of("error", "Invalid status"));

        Optional<Order> opt = orderRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Order not found"));

        Order order = opt.get();
        order.setStatus(status);
        orderRepository.save(order);

        // Notify the customer
        sseService.sendToUser(order.getUserId(), "order:updated", Map.of("orderId", id, "status", status));
        // Also broadcast to admin tabs
        sseService.broadcast("order:updated", Map.of("orderId", id, "status", status), "admin");

        return ResponseEntity.ok(Map.of("message", "Order status updated", "id", id, "status", status));
    }

    // --- Helpers ---

    private Map<String, Object> orderToMap(Order o, List<OrderItem> items) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("user_id", o.getUserId());
        m.put("console_id", o.getConsoleId());
        m.put("total_price", o.getTotalPrice());
        m.put("status", o.getStatus());
        m.put("created_at", o.getCreatedAt());
        m.put("items", items.stream().map(oi -> {
            Map<String, Object> im = new LinkedHashMap<>();
            im.put("id", oi.getId());
            im.put("order_id", oi.getOrderId());
            im.put("snack_id", oi.getSnackId());
            im.put("quantity", oi.getQuantity());
            im.put("price", oi.getPrice());
            snackRepository.findById(oi.getSnackId()).ifPresent(s -> {
                im.put("snack_name", s.getName());
                im.put("snack_image", s.getImage());
            });
            return im;
        }).toList());
        return m;
    }
}
