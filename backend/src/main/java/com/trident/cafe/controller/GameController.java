package com.trident.cafe.controller;

import com.trident.cafe.entity.Game;
import com.trident.cafe.repository.GameRepository;
import com.trident.cafe.security.AuthGuard;
import com.trident.cafe.service.SseService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
public class GameController {

    @Autowired private GameRepository gameRepository;
    @Autowired private SseService sseService;

    // ─── Public ──────────────────────────────────────────────────────────

    // GET /api/games — returns all active games, ordered by display_order
    @GetMapping("/api/games")
    public ResponseEntity<?> listPublic() {
        List<Map<String, Object>> result = gameRepository
            .findByActiveTrueOrderByDisplayOrderAscIdAsc()
            .stream()
            .map(this::toMap)
            .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    // GET /api/admin/games — all games (including inactive)
    @GetMapping("/api/admin/games")
    public ResponseEntity<?> listAdmin(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireAdmin(req, res)) return null;
        List<Map<String, Object>> result = gameRepository
            .findAllByOrderByDisplayOrderAscIdAsc()
            .stream()
            .map(this::toMap)
            .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // POST /api/admin/games — add a game
    @PostMapping("/api/admin/games")
    public ResponseEntity<?> add(
            @RequestBody Map<String, Object> body,
            HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireAdmin(req, res)) return null;

        Game game = new Game();
        game.setTitle((String) body.get("title"));
        game.setImage((String) body.get("image"));
        game.setGenre((String) body.get("genre"));
        if (body.get("rating") != null) game.setRating((String) body.get("rating"));
        if (body.get("players") != null) game.setPlayers((String) body.get("players"));
        if (body.get("display_order") != null) game.setDisplayOrder(((Number) body.get("display_order")).intValue());
        if (body.get("active") != null) game.setActive((Boolean) body.get("active"));

        game = gameRepository.save(game);
        sseService.broadcast("game:added", Map.of("id", game.getId()));
        return ResponseEntity.ok(toMap(game));
    }

    // PUT /api/admin/games/:id — edit a game
    @PutMapping("/api/admin/games/{id}")
    public ResponseEntity<?> edit(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireAdmin(req, res)) return null;

        return gameRepository.findById(id).map(game -> {
            if (body.get("title") != null) game.setTitle((String) body.get("title"));
            if (body.get("image") != null) game.setImage((String) body.get("image"));
            if (body.get("genre") != null) game.setGenre((String) body.get("genre"));
            if (body.get("rating") != null) game.setRating((String) body.get("rating"));
            if (body.get("players") != null) game.setPlayers((String) body.get("players"));
            if (body.get("display_order") != null) game.setDisplayOrder(((Number) body.get("display_order")).intValue());
            if (body.get("active") != null) game.setActive((Boolean) body.get("active"));
            gameRepository.save(game);
            sseService.broadcast("game:updated", Map.of("id", game.getId()));
            return ResponseEntity.ok(toMap(game));
        }).orElse(ResponseEntity.notFound().build());
    }

    // DELETE /api/admin/games/:id — remove a game
    @DeleteMapping("/api/admin/games/{id}")
    public ResponseEntity<?> remove(
            @PathVariable Long id,
            HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireAdmin(req, res)) return null;

        if (!gameRepository.existsById(id)) return ResponseEntity.notFound().build();
        gameRepository.deleteById(id);
        sseService.broadcast("game:removed", Map.of("id", id));
        return ResponseEntity.ok(Map.of("message", "Game removed"));
    }

    // ─── Helper ──────────────────────────────────────────────────────────

    private Map<String, Object> toMap(Game g) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", g.getId());
        m.put("title", g.getTitle());
        m.put("image", g.getImage());
        m.put("genre", g.getGenre());
        m.put("rating", g.getRating());
        m.put("players", g.getPlayers());
        m.put("display_order", g.getDisplayOrder());
        m.put("active", g.getActive());
        m.put("created_at", g.getCreatedAt() != null ? g.getCreatedAt().toString() : null);
        return m;
    }
}
