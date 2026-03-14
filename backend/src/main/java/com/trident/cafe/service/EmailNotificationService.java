package com.trident.cafe.service;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import com.trident.cafe.entity.Booking;
import com.trident.cafe.entity.Order;
import com.trident.cafe.entity.OrderItem;
import com.trident.cafe.repository.SnackRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class EmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, h:mm a");

    @Value("${sendgrid.api.key:}")
    private String apiKey;

    @Value("${admin.email:tridentcafe.official@gmail.com}")
    private String adminEmail;

    @Autowired
    private SnackRepository snackRepository;

    @Async
    public void sendOrderNotification(Order order, List<OrderItem> items, String customerEmail) {
        if (apiKey == null || apiKey.isBlank()) {
            log.info("[EmailNotification] SENDGRID_API_KEY not set — skipping order email for order {}", order.getId());
            return;
        }

        StringBuilder body = new StringBuilder();
        body.append("New snack order received at Trident Gaming Cafe.\n\n");
        body.append("Customer:  ").append(customerEmail).append("\n");
        if (order.getConsoleId() != null && !order.getConsoleId().isBlank()) {
            body.append("Console:   ").append(order.getConsoleId()).append("\n");
        }
        body.append("\nItems:\n");
        for (OrderItem item : items) {
            String snackName = snackRepository.findById(item.getSnackId())
                .map(s -> s.getName())
                .orElse("Unknown item");
            body.append("  • ").append(snackName)
                .append(" x").append(item.getQuantity())
                .append("  —  Rs.").append(item.getPrice() * item.getQuantity()).append("\n");
        }
        body.append("\nTotal:     Rs.").append(order.getTotalPrice()).append("\n");
        body.append("Placed:    ").append(order.getCreatedAt().format(FMT)).append("\n");
        body.append("Order ID:  ").append(order.getId()).append("\n");

        String subject = "New Snack Order — Rs." + order.getTotalPrice() + " | Trident Gaming Cafe";
        sendEmail(subject, body.toString());
    }

    @Async
    public void sendBookingNotification(Booking booking, String customerEmail, String consoleName) {
        if (apiKey == null || apiKey.isBlank()) {
            log.info("[EmailNotification] SENDGRID_API_KEY not set — skipping booking email for booking {}", booking.getId());
            return;
        }

        String consoleLabel = consoleName != null ? consoleName : booking.getConsoleId();
        String consoleType = "psvr2".equals(booking.getConsoleType()) ? "PSVR2" : "PS5";

        StringBuilder body = new StringBuilder();
        body.append("New console booking at Trident Gaming Cafe.\n\n");
        body.append("Customer:  ").append(customerEmail).append("\n");
        body.append("Console:   ").append(consoleLabel).append(" (").append(consoleType).append(")\n");
        body.append("Date:      ").append(booking.getDate()).append("\n");
        body.append("Time:      ").append(booking.getTimeSlot()).append("\n");
        body.append("Players:   ").append(booking.getPlayers()).append("\n");
        body.append("Duration:  ").append(booking.getDurationHours().intValue()).append(" hour(s)\n");
        body.append("Total:     Rs.").append(booking.getTotalPrice()).append("\n");
        body.append("Booked:    ").append(booking.getCreatedAt().format(FMT)).append("\n");
        body.append("Booking ID: ").append(booking.getId()).append("\n");

        String subject = "New Booking — " + consoleType + " | " + booking.getDate() + " | Trident Gaming Cafe";
        sendEmail(subject, body.toString());
    }

    private void sendEmail(String subject, String body) {
        try {
            Email from = new Email(adminEmail, "Trident Gaming Cafe");
            Email to = new Email(adminEmail);
            Content content = new Content("text/plain", body);
            Mail mail = new Mail(from, subject, to, content);

            SendGrid sg = new SendGrid(apiKey);
            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            Response response = sg.api(request);
            if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
                log.info("[EmailNotification] Email sent: {}", subject);
            } else {
                log.warn("[EmailNotification] SendGrid returned {}: {}", response.getStatusCode(), response.getBody());
            }
        } catch (Exception e) {
            log.error("[EmailNotification] Failed to send email: {}", e.getMessage());
        }
    }
}
