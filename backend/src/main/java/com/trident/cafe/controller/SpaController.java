package com.trident.cafe.controller;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import jakarta.servlet.http.HttpServletRequest;

/**
 * SPA fallback controller — implements ErrorController so it only handles
 * requests AFTER Spring's built-in ResourceHttpRequestHandler has already
 * tried (and failed) to find a matching static resource.
 *
 * For any 404 on a non-API, non-asset path, it returns index.html so that
 * React Router can handle client-side routing.
 *
 * Static assets in /assets/** are served by Spring Boot's default
 * ResourceHttpRequestHandler from classpath:/static/ — this controller
 * never intercepts them.
 */
@Controller
public class SpaController implements ErrorController {

    private static final Resource INDEX = new ClassPathResource("static/index.html");

    @RequestMapping("/error")
    public ResponseEntity<Resource> handleError(HttpServletRequest request) {
        // Get the original status code
        Integer statusCode = (Integer) request.getAttribute(
                "jakarta.servlet.error.status_code");

        // Only intercept 404s for SPA routing; let other errors pass through
        if (statusCode == null || statusCode != HttpStatus.NOT_FOUND.value()) {
            return ResponseEntity.status(statusCode != null ? statusCode : 500).build();
        }

        // Get the original request URI
        String originalUri = (String) request.getAttribute(
                "jakarta.servlet.error.request_uri");
        if (originalUri == null) {
            originalUri = request.getRequestURI();
        }

        // Don't serve index.html for API routes — return proper 404
        if (originalUri.startsWith("/api/")) {
            return ResponseEntity.notFound().build();
        }

        // Don't serve index.html for actual static asset requests that truly 404'd
        String lastSegment = originalUri.substring(originalUri.lastIndexOf('/') + 1);
        if (lastSegment.contains(".")) {
            return ResponseEntity.notFound().build();
        }

        // SPA fallback: serve index.html for client-side routes
        if (!INDEX.exists()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(INDEX);
    }
}
