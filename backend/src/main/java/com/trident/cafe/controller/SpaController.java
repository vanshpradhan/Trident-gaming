package com.trident.cafe.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/**
 * SPA fallback controller — returns index.html for any route that:
 *   - does NOT start with /api/
 *   - does NOT contain a dot (i.e. not a static asset like .js, .css, .png)
 *
 * Static assets in /assets/** are served by Spring Boot's default
 * ResourceHttpRequestHandler before this controller is ever reached,
 * because @RestController mappings have lower priority than the
 * ResourceHttpRequestHandler when the resource actually exists on the classpath.
 *
 * We use @GetMapping without `produces` so we don't rely on content negotiation
 * (which caused 406 / blank page when browsers sent Accept: text/html for JS).
 */
@RestController
public class SpaController {

    private static final Resource INDEX = new ClassPathResource("static/index.html");

    @GetMapping("/{*path}")
    public ResponseEntity<Resource> spa(HttpServletRequest request) throws IOException {
        String uri = request.getRequestURI();

        // Skip API routes — should never reach here but guard anyway
        if (uri.startsWith("/api/")) {
            return ResponseEntity.notFound().build();
        }

        // Skip requests that look like static asset files (.js, .css, .png, etc.)
        // Spring's ResourceHttpRequestHandler serves these; if they 404 there,
        // returning index.html would make things worse, not better.
        String lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
        if (lastSegment.contains(".")) {
            return ResponseEntity.notFound().build();
        }

        if (!INDEX.exists()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(INDEX);
    }
}
