package com.trident.cafe.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

/**
 * HMAC-SHA256 token system — mirrors the Node.js implementation exactly.
 * Format: base64url(payload).base64url(signature)
 * Payload JSON: { uid, iat, exp }
 */
@Service
public class TokenService {

    @Value("${app.token.secret}")
    private String secret;

    @Value("${app.token.expiry-ms}")
    private long expiryMs;

    public String generateToken(String userId) {
        long now = System.currentTimeMillis();
        String payloadJson = String.format("{\"uid\":\"%s\",\"iat\":%d,\"exp\":%d}", userId, now, now + expiryMs);
        String encodedPayload = base64urlEncode(payloadJson.getBytes(StandardCharsets.UTF_8));
        String signature = sign(encodedPayload);
        return encodedPayload + "." + signature;
    }

    /**
     * Returns userId if token is valid and not expired, null otherwise.
     */
    public String parseToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 2) return null;

            String encodedPayload = parts[0];
            String providedSignature = parts[1];

            // Constant-time comparison
            String expectedSignature = sign(encodedPayload);
            if (!constantTimeEquals(providedSignature, expectedSignature)) return null;

            // Decode payload
            String payloadJson = new String(base64urlDecode(encodedPayload), StandardCharsets.UTF_8);
            Map<?, ?> payload = parseSimpleJson(payloadJson);

            String uid = (String) payload.get("uid");
            Object expObj = payload.get("exp");
            if (uid == null || expObj == null) return null;

            long exp = ((Number) expObj).longValue();
            if (System.currentTimeMillis() > exp) return null; // expired

            return uid;
        } catch (Exception e) {
            return null;
        }
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return base64urlEncode(raw);
        } catch (Exception e) {
            throw new RuntimeException("Signing failed", e);
        }
    }

    private String base64urlEncode(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    private byte[] base64urlDecode(String data) {
        return Base64.getUrlDecoder().decode(data);
    }

    private boolean constantTimeEquals(String a, String b) {
        byte[] ab = a.getBytes(StandardCharsets.UTF_8);
        byte[] bb = b.getBytes(StandardCharsets.UTF_8);
        if (ab.length != bb.length) return false;
        int result = 0;
        for (int i = 0; i < ab.length; i++) {
            result |= ab[i] ^ bb[i];
        }
        return result == 0;
    }

    /**
     * Minimal JSON parser for our known payload format.
     * Avoids a full Jackson dependency just for token parsing.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> parseSimpleJson(String json) {
        // Use Jackson ObjectMapper via Spring context — it's always available
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(json, Map.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse token payload", e);
        }
    }
}
