package com.trident.cafe;

import com.trident.cafe.entity.*;
import com.trident.cafe.entity.GameConsole;
import com.trident.cafe.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired private UserRepository userRepository;
    @Autowired private ConsoleRepository consoleRepository;
    @Autowired private RewardRepository rewardRepository;

    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            seedAdmin();
        }
        if (consoleRepository.count() == 0) {
            seedConsoles();
        }
        if (rewardRepository.count() == 0) {
            seedRewards();
        }
    }

    private void seedAdmin() {
        User admin = new User();
        admin.setId(UUID.randomUUID().toString());
        admin.setName("Trident Admin");
        admin.setEmail("admin@tridentcafe.com");
        admin.setPasswordHash(bcrypt.encode("admin123"));
        admin.setRole("admin");
        admin.setPhone("");
        userRepository.save(admin);
        System.out.println("[DataSeeder] Admin user created: admin@tridentcafe.com");
    }

    private void seedConsoles() {
        List<GameConsole> consoles = List.of(
            makeConsole("PS5-01", "PlayStation 5 #1", "ps5",
                "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400",
                "1-4", List.of("4K Gaming", "120fps", "DualSense Controller", "Surround Sound")),
            makeConsole("PS5-02", "PlayStation 5 #2", "ps5",
                "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=400",
                "1-4", List.of("4K Gaming", "120fps", "DualSense Controller", "HDR Display")),
            makeConsole("PSVR-01", "PlayStation VR2 #1", "psvr2",
                "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=400",
                "1", List.of("VR Experience", "Eye Tracking", "Haptic Feedback", "4K OLED"))
        );
        consoleRepository.saveAll(consoles);
        System.out.println("[DataSeeder] 3 consoles seeded: PS5-01, PS5-02, PSVR-01");
    }

    private GameConsole makeConsole(String id, String name, String type, String image,
                                 String players, List<String> features) {
        GameConsole c = new GameConsole();
        c.setId(id);
        c.setName(name);
        c.setType(type);
        c.setImage(image);
        c.setStatus("available");
        c.setPlayers(players);
        try {
            c.setFeatures(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(features));
        } catch (Exception e) {
            c.setFeatures("[]");
        }
        return c;
    }

    private void seedRewards() {
        List<Reward> rewards = List.of(
            makeReward(UUID.randomUUID().toString(), "Free Snack", "Redeem for any snack item", 3,
                "free_snack", "50"),
            makeReward(UUID.randomUUID().toString(), "30 Min Free Gaming", "Get 30 minutes of free PS5 gaming", 5,
                "free_session", "30"),
            makeReward(UUID.randomUUID().toString(), "10% Off Booking", "10% discount on your next booking", 10,
                "discount", "10"),
            makeReward(UUID.randomUUID().toString(), "VR Experience Pass", "One free 30-min PSVR2 session", 20,
                "free_session", "30_vr")
        );
        rewardRepository.saveAll(rewards);
        System.out.println("[DataSeeder] 4 rewards seeded");
    }

    private Reward makeReward(String id, String name, String description, int visitsRequired,
                               String rewardType, String rewardValue) {
        Reward r = new Reward();
        r.setId(id);
        r.setName(name);
        r.setDescription(description);
        r.setVisitsRequired(visitsRequired);
        r.setRewardType(rewardType);
        r.setRewardValue(rewardValue);
        return r;
    }
}
