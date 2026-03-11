package com.trident.cafe.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * SSE infrastructure — mirrors the Node.js sse.ts implementation.
 * Manages connected clients, broadcasts events, sends to specific users.
 */
@Service
public class SseService {

    private static final Logger log = LoggerFactory.getLogger(SseService.class);
    private static final ObjectMapper mapper = new ObjectMapper();
    private static final long SSE_TIMEOUT = Long.MAX_VALUE; // never time out — we manage lifecycle

    private final AtomicLong counter = new AtomicLong();

    private record SseClient(String id, SseEmitter emitter, String userId, String role) {}

    private final ConcurrentHashMap<String, SseClient> clients = new ConcurrentHashMap<>();

    /**
     * Register a new SSE client. Returns the SseEmitter to hand to Spring.
     */
    public SseEmitter addClient(String userId, String role) {
        String clientId = "sse_" + counter.incrementAndGet() + "_" + System.currentTimeMillis();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        SseClient client = new SseClient(clientId, emitter, userId, role);
        clients.put(clientId, client);

        // Send initial connected event
        try {
            emitter.send(SseEmitter.event()
                .name("connected")
                .data(mapper.writeValueAsString(Map.of("clientId", clientId))));
        } catch (IOException e) {
            clients.remove(clientId);
        }

        // Clean up on completion / timeout / error
        Runnable cleanup = () -> clients.remove(clientId);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(t -> cleanup.run());

        log.debug("[SSE] Client connected: {} (userId={}, role={})", clientId, userId, role);
        return emitter;
    }

    /**
     * Broadcast an event to all connected clients.
     * If targetRole is non-null, only clients with that role (or no role) receive it.
     */
    public void broadcast(String event, Object data) {
        broadcast(event, data, null);
    }

    public void broadcast(String event, Object data, String targetRole) {
        String json;
        try {
            json = mapper.writeValueAsString(data);
        } catch (Exception e) {
            log.error("[SSE] Failed to serialize event data", e);
            return;
        }

        for (SseClient client : clients.values()) {
            if (targetRole != null && client.role() != null && !targetRole.equals(client.role())) {
                continue;
            }
            sendToClient(client, event, json);
        }
    }

    /**
     * Send an event to a specific user's SSE connection(s).
     */
    public void sendToUser(String userId, String event, Object data) {
        String json;
        try {
            json = mapper.writeValueAsString(data);
        } catch (Exception e) {
            log.error("[SSE] Failed to serialize event data", e);
            return;
        }

        for (SseClient client : clients.values()) {
            if (userId.equals(client.userId())) {
                sendToClient(client, event, json);
            }
        }
    }

    private void sendToClient(SseClient client, String event, String json) {
        try {
            client.emitter().send(SseEmitter.event().name(event).data(json));
        } catch (Exception e) {
            // Client disconnected — remove and let the emitter lifecycle handle cleanup
            clients.remove(client.id());
        }
    }

    /** Heartbeat every 30 seconds to keep connections alive through proxies */
    @Scheduled(fixedDelay = 30000)
    public void heartbeat() {
        for (SseClient client : clients.values()) {
            try {
                client.emitter().send(SseEmitter.event().comment("heartbeat"));
            } catch (Exception e) {
                clients.remove(client.id());
            }
        }
    }

    public int getClientCount() {
        return clients.size();
    }
}
