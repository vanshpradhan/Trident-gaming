package com.trident.cafe.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Applies rate limiting and security headers to all /api/* requests.
 */
@Component
public class SecurityHeadersFilter implements Filter {

    @Autowired
    private RateLimitConfig rateLimitConfig;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        String path = req.getRequestURI();
        if (!path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        String ip = getClientIp(req);

        // Global rate limit
        if (!rateLimitConfig.getGlobalBucket(ip).tryConsume(1)) {
            res.setStatus(429);
            res.setContentType("application/json");
            res.getWriter().write("{\"error\":\"Too many requests.\"}");
            return;
        }

        // Auth rate limit
        if (path.startsWith("/api/auth/")) {
            if (!rateLimitConfig.getAuthBucket(ip).tryConsume(1)) {
                res.setStatus(429);
                res.setContentType("application/json");
                res.getWriter().write("{\"error\":\"Too many requests. Please try again later.\"}");
                return;
            }
        }

        // Mutation rate limit (POST, PUT, PATCH, DELETE on orders and admin)
        String method = req.getMethod();
        if ((path.startsWith("/api/orders") || path.startsWith("/api/admin") || path.startsWith("/api/bookings"))
                && (method.equals("POST") || method.equals("PUT") || method.equals("PATCH") || method.equals("DELETE"))) {
            if (!rateLimitConfig.getMutationBucket(ip).tryConsume(1)) {
                res.setStatus(429);
                res.setContentType("application/json");
                res.getWriter().write("{\"error\":\"Too many requests. Please slow down.\"}");
                return;
            }
        }

        // Security headers
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("X-XSS-Protection", "1; mode=block");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isEmpty()) {
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}
