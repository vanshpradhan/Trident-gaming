package com.trident.cafe.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Catches all non-API routes and returns the React index.html so that
 * React Router can handle client-side navigation (SPA fallback).
 */
@RestController
public class SpaController {

    @GetMapping(value = "/{path:[^\\.]*}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<Resource> spa(HttpServletRequest request) {
        Resource index = new ClassPathResource("static/index.html");
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(index);
    }

    // Also handle nested paths (e.g. /admin/dashboard)
    @GetMapping(value = "/**/{path:[^\\.]*}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<Resource> spaDeep(HttpServletRequest request) {
        Resource index = new ClassPathResource("static/index.html");
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(index);
    }
}
