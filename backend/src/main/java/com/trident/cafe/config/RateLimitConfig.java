package com.trident.cafe.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting using Bucket4j (token-bucket algorithm).
 * Tiers per IP:
 *  - auth:     30 requests / 15 minutes  (prevents brute-force login)
 *  - mutation: 300 requests / 1 minute   (POST/PUT/PATCH/DELETE on bookings, orders, admin)
 *  - global:   600 requests / 1 minute   (all /api/* requests)
 */
@Component
public class RateLimitConfig {

    private final ConcurrentHashMap<String, Bucket> authBuckets     = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> mutationBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> globalBuckets   = new ConcurrentHashMap<>();

    public Bucket getAuthBucket(String ip) {
        return authBuckets.computeIfAbsent(ip, k ->
            Bucket.builder()
                .addLimit(Bandwidth.classic(30, Refill.intervally(30, Duration.ofMinutes(15))))
                .build()
        );
    }

    public Bucket getMutationBucket(String ip) {
        return mutationBuckets.computeIfAbsent(ip, k ->
            Bucket.builder()
                .addLimit(Bandwidth.classic(300, Refill.intervally(300, Duration.ofMinutes(1))))
                .build()
        );
    }

    public Bucket getGlobalBucket(String ip) {
        return globalBuckets.computeIfAbsent(ip, k ->
            Bucket.builder()
                .addLimit(Bandwidth.classic(600, Refill.intervally(600, Duration.ofMinutes(1))))
                .build()
        );
    }
}
