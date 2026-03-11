package com.trident.cafe.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting using Bucket4j (token-bucket algorithm).
 * Three tiers matching the Node.js implementation:
 *  - auth:     20 requests / 15 minutes per IP
 *  - mutation: 60 requests / 1 minute per IP
 *  - global:   200 requests / 1 minute per IP
 */
@Component
public class RateLimitConfig {

    private final ConcurrentHashMap<String, Bucket> authBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> mutationBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> globalBuckets = new ConcurrentHashMap<>();

    public Bucket getAuthBucket(String ip) {
        return authBuckets.computeIfAbsent(ip, k ->
            Bucket.builder()
                .addLimit(Bandwidth.classic(20, Refill.intervally(20, Duration.ofMinutes(15))))
                .build()
        );
    }

    public Bucket getMutationBucket(String ip) {
        return mutationBuckets.computeIfAbsent(ip, k ->
            Bucket.builder()
                .addLimit(Bandwidth.classic(60, Refill.intervally(60, Duration.ofMinutes(1))))
                .build()
        );
    }

    public Bucket getGlobalBucket(String ip) {
        return globalBuckets.computeIfAbsent(ip, k ->
            Bucket.builder()
                .addLimit(Bandwidth.classic(200, Refill.intervally(200, Duration.ofMinutes(1))))
                .build()
        );
    }
}
