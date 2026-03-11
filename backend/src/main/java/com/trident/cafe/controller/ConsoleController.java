package com.trident.cafe.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trident.cafe.entity.GameConsole;
import com.trident.cafe.repository.ConsoleRepository;
import com.trident.cafe.security.AuthGuard;
import com.trident.cafe.service.SseService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/consoles")
public class ConsoleController {

    private static final ObjectMapper mapper = new ObjectMapper();
    private static final List<String> VALID_STATUSES = List.of("available", "occupied", "maintenance");

    @Autowired private ConsoleRepository consoleRepository;
    @Autowired private SseService sseService;

    // GET /api/consoles - List all consoles (public)
    @GetMapping
    public ResponseEntity<?> list() {
        List<GameConsole> consoles = consoleRepository.findAllByOrderById();
        return ResponseEntity.ok(consoles.stream().map(this::toMap).toList());
    }

    // GET /api/consoles/grouped - Grouped by type for frontend display
    @GetMapping("/grouped")
    public ResponseEntity<?> grouped() {
        List<GameConsole> consoles = consoleRepository.findAll();
        consoles.sort(Comparator.comparing(GameConsole::getType).thenComparing(GameConsole::getId));

        Map<String, Map<String, Object>> typeMap = new LinkedHashMap<>();
        for (GameConsole c : consoles) {
            typeMap.computeIfAbsent(c.getType(), k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", c.getType());
                m.put("name", c.getName());
                m.put("type", c.getType());
                m.put("image", c.getImage());
                m.put("players", c.getPlayers());
                m.put("features", parseFeatures(c.getFeatures()));
                m.put("total", 0);
                m.put("available", 0);
                m.put("occupied", 0);
                m.put("status", "occupied");
                return m;
            });
            Map<String, Object> entry = typeMap.get(c.getType());
            entry.put("total", (int) entry.get("total") + 1);
            if ("available".equals(c.getStatus())) {
                entry.put("available", (int) entry.get("available") + 1);
                entry.put("status", "available");
            }
            if ("occupied".equals(c.getStatus())) {
                entry.put("occupied", (int) entry.get("occupied") + 1);
            }
        }

        return ResponseEntity.ok(new ArrayList<>(typeMap.values()));
    }

    // GET /api/consoles/:id - Get single console
    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id) {
        return consoleRepository.findById(id)
            .map(c -> ResponseEntity.ok(toMap(c)))
            .orElse(ResponseEntity.status(404).body(Map.of("error", "Console not found")));
    }

    // PATCH /api/consoles/:id/status - Update console status (admin only)
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id,
                                          @RequestBody Map<String, Object> body,
                                          HttpServletRequest req,
                                          HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireAdmin(req, res)) return null;

        String status = body.get("status") instanceof String s ? s : "";
        if (!VALID_STATUSES.contains(status))
            return ResponseEntity.status(400).body(Map.of("error", "Invalid status. Must be: available, occupied, or maintenance"));

        Optional<GameConsole> opt = consoleRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Console not found"));

        GameConsole c = opt.get();
        c.setStatus(status);
        consoleRepository.save(c);

        sseService.broadcast("console:updated", Map.of("consoleId", id, "status", status));

        return ResponseEntity.ok(Map.of("message", "Console status updated", "id", id, "status", status));
    }

    // --- Helpers ---

    private Map<String, Object> toMap(GameConsole c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("name", c.getName());
        m.put("type", c.getType());
        m.put("image", c.getImage());
        m.put("status", c.getStatus());
        m.put("players", c.getPlayers());
        m.put("features", parseFeatures(c.getFeatures()));
        m.put("created_at", c.getCreatedAt());
        return m;
    }

    @SuppressWarnings("unchecked")
    private List<String> parseFeatures(String json) {
        try {
            return mapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
