package com.trident.cafe.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trident.cafe.entity.PricingPlan;
import com.trident.cafe.repository.PricingPlanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/pricing")
public class PricingController {

    private static final ObjectMapper mapper = new ObjectMapper();

    @Autowired private PricingPlanRepository pricingPlanRepository;

    // GET /api/pricing - List all pricing plans (public)
    @GetMapping
    public ResponseEntity<?> list() {
        List<PricingPlan> plans = pricingPlanRepository.findAllByOrderByPriceAsc();
        return ResponseEntity.ok(plans.stream().map(this::toMap).toList());
    }

    public Map<String, Object> toMap(PricingPlan p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("name", p.getName());
        m.put("price", p.getPrice());
        m.put("duration", p.getDuration());
        m.put("description", p.getDescription());
        m.put("features", parseFeatures(p.getFeatures()));
        m.put("console_type", p.getConsoleType());
        m.put("popular", p.getPopular());
        m.put("color", p.getColor());
        m.put("created_at", p.getCreatedAt());
        return m;
    }

    @SuppressWarnings("unchecked")
    public List<String> parseFeatures(String json) {
        try {
            return mapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
