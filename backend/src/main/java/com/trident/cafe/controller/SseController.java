package com.trident.cafe.controller;

import com.trident.cafe.service.SseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class SseController {

    @Autowired private SseService sseService;

    // GET /api/events - SSE connection endpoint
    // Token is passed as ?token= query param since EventSource can't set headers
    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events(
            @RequestParam(required = false) String token,
            jakarta.servlet.http.HttpServletRequest req) {

        // userId and role are set by AuthFilter (which handles ?token=)
        String userId = (String) req.getAttribute("userId");
        String role = (String) req.getAttribute("userRole");

        return sseService.addClient(userId, role);
    }

    // GET /api/health
    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
            "status", "ok",
            "timestamp", java.time.Instant.now().toString(),
            "sseClients", sseService.getClientCount()
        );
    }
}
