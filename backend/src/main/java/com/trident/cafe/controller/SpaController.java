package com.trident.cafe.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Catches all non-API, non-static routes and returns the React index.html
 * so that React Router can handle client-side navigation (SPA fallback).
 *
 * Spring Boot 3.x PathPatternParser does not allow patterns like
 * "/**\/{path:[^\.]*}" — use a single "/{*path}" wildcard instead and
 * delegate only when the path doesn't look like a static asset.
 */
@RestController
public class SpaController {

    @GetMapping(value = "/{*path}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<Resource> spa(HttpServletRequest request) {
        String path = request.getRequestURI();

        // Let the servlet container handle actual static files and API calls
        if (path.startsWith("/api/") || path.contains(".")) {
            return ResponseEntity.notFound().build();
        }

        Resource index = new ClassPathResource("static/index.html");
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(index);
    }
}
