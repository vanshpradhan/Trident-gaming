package com.trident.cafe.security;

import com.trident.cafe.entity.User;
import com.trident.cafe.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Extracts Bearer token from Authorization header (or ?token= query param for SSE),
 * validates it, and stores the authenticated user on the request as attributes.
 *
 * Downstream code reads:
 *   request.getAttribute("userId")   → String
 *   request.getAttribute("userRole") → String ("customer" | "admin")
 */
@Component
public class AuthFilter extends OncePerRequestFilter {

    @Autowired
    private TokenService tokenService;

    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String token = null;

        // 1. Try Authorization: Bearer <token>
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }

        // 2. Fallback: ?token= query param (for SSE — EventSource can't set headers)
        if (token == null) {
            token = request.getParameter("token");
        }

        if (token != null) {
            String userId = tokenService.parseToken(token);
            if (userId != null) {
                userRepository.findById(userId).ifPresent(user -> {
                    request.setAttribute("userId", user.getId());
                    request.setAttribute("userRole", user.getRole());
                    request.setAttribute("authenticatedUser", user);
                });
            }
        }

        chain.doFilter(request, response);
    }
}
