package com.trident.cafe.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;

import java.io.IOException;

/**
 * Static helper to guard routes — mirrors Express middleware pattern.
 * Returns false and writes 401/403 JSON if the check fails.
 */
public class AuthGuard {

    private AuthGuard() {}

    /** Requires a valid token (any role). Returns false + 401 if not authenticated. */
    public static boolean requireAuth(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (req.getAttribute("userId") == null) {
            sendError(res, HttpStatus.UNAUTHORIZED, "Authentication required");
            return false;
        }
        return true;
    }

    /** Requires admin role. Returns false + 403 if not admin. */
    public static boolean requireAdmin(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!requireAuth(req, res)) return false;
        if (!"admin".equals(req.getAttribute("userRole"))) {
            sendError(res, HttpStatus.FORBIDDEN, "Admin access required");
            return false;
        }
        return true;
    }

    /** Requires customer role. Returns false + 403 if not customer. */
    public static boolean requireCustomer(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!requireAuth(req, res)) return false;
        if (!"customer".equals(req.getAttribute("userRole"))) {
            sendError(res, HttpStatus.FORBIDDEN, "This action is only available to customers");
            return false;
        }
        return true;
    }

    private static void sendError(HttpServletResponse res, HttpStatus status, String message) throws IOException {
        res.setStatus(status.value());
        res.setContentType("application/json");
        res.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
