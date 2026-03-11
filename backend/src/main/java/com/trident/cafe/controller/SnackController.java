package com.trident.cafe.controller;

import com.trident.cafe.entity.Snack;
import com.trident.cafe.repository.SnackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/snacks")
public class SnackController {

    @Autowired private SnackRepository snackRepository;

    // GET /api/snacks - List all available snacks (public)
    @GetMapping
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(snackRepository.findByAvailableTrueOrderById());
    }
}
