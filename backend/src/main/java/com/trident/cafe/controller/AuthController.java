package com.trident.cafe.controller;

import com.trident.cafe.entity.Loyalty;
import com.trident.cafe.entity.User;
import com.trident.cafe.repository.LoyaltyRepository;
import com.trident.cafe.repository.UserRepository;
import com.trident.cafe.security.AuthGuard;
import com.trident.cafe.security.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Pattern EMAIL_RE = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder(10);

    @Autowired private UserRepository userRepository;
    @Autowired private LoyaltyRepository loyaltyRepository;
    @Autowired private TokenService tokenService;

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> body) {
        String name = sanitize(body.get("name"));
        String email = body.get("email") instanceof String s ? s.trim().toLowerCase() : "";
        String phone = sanitize(body.get("phone"));
        String password = body.get("password") instanceof String s ? s : "";

        if (name.isBlank() || name.length() > 100)
            return err(400, "Name is required (max 100 characters)");
        if (!isValidEmail(email))
            return err(400, "A valid email is required");
        if (password.length() < 6 || password.length() > 128)
            return err(400, "Password must be 6-128 characters");
        if (!phone.isEmpty() && phone.length() > 20)
            return err(400, "Phone number is too long");

        if (userRepository.existsByEmail(email))
            return err(409, "Email already registered");

        String id = UUID.randomUUID().toString();
        User user = new User();
        user.setId(id);
        user.setName(name);
        user.setEmail(email);
        user.setPhone(phone.isEmpty() ? null : phone);
        user.setPasswordHash(bcrypt.encode(password));
        user.setRole("customer");
        userRepository.save(user);

        // Create loyalty record
        Loyalty loyalty = new Loyalty();
        loyalty.setId(UUID.randomUUID().toString());
        loyalty.setUserId(id);
        loyaltyRepository.save(loyalty);

        String token = tokenService.generateToken(id);
        return ResponseEntity.status(201).body(Map.of(
            "token", token,
            "user", userView(user)
        ));
    }

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> body) {
        String email = body.get("email") instanceof String s ? s.trim().toLowerCase() : "";
        String password = body.get("password") instanceof String s ? s : "";

        if (email.isEmpty() || password.isEmpty())
            return err(400, "Email and password are required");

        Optional<User> opt = userRepository.findByEmail(email);
        if (opt.isEmpty() || !bcrypt.matches(password, opt.get().getPasswordHash()))
            return err(401, "Invalid email or password");

        User user = opt.get();
        String token = tokenService.generateToken(user.getId());
        return ResponseEntity.ok(Map.of("token", token, "user", userView(user)));
    }

    // GET /api/auth/me
    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!AuthGuard.requireAuth(req, res)) return null;
        String userId = (String) req.getAttribute("userId");

        Optional<User> opt = userRepository.findById(userId);
        if (opt.isEmpty()) return err(404, "User not found");

        User user = opt.get();
        Optional<Loyalty> loyaltyOpt = loyaltyRepository.findByUserId(userId);
        Map<String, Object> loyaltyData;
        if (loyaltyOpt.isPresent()) {
            Loyalty l = loyaltyOpt.get();
            loyaltyData = new java.util.LinkedHashMap<>();
            loyaltyData.put("total_visits", l.getTotalVisits());
            loyaltyData.put("total_xp", l.getTotalXp());
            loyaltyData.put("tier", l.getTier());
            loyaltyData.put("active_boosters", l.getActiveBoosters());
        } else {
            loyaltyData = new java.util.LinkedHashMap<>();
            loyaltyData.put("total_visits", 0);
            loyaltyData.put("total_xp", 0);
            loyaltyData.put("tier", "Bronze");
            loyaltyData.put("active_boosters", 0);
        }

        Map<String, Object> userMap = new HashMap<>(userView(user));
        userMap.put("loyalty", loyaltyData);
        userMap.put("created_at", user.getCreatedAt());

        return ResponseEntity.ok(Map.of("user", userMap));
    }

    // --- Helpers ---

    private Map<String, Object> userView(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("name", u.getName());
        m.put("email", u.getEmail());
        m.put("phone", u.getPhone());
        m.put("role", u.getRole());
        return m;
    }

    private boolean isValidEmail(String email) {
        return email != null && email.length() <= 254 && EMAIL_RE.matcher(email).matches();
    }

    private String sanitize(Object input) {
        if (!(input instanceof String s)) return "";
        return s.replaceAll("<[^>]*>", "").replaceAll("[<>\"'`]", "").trim();
    }

    private ResponseEntity<Map<String, String>> err(int status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }
}
