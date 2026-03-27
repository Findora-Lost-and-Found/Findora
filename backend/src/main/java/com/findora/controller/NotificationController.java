package com.findora.controller;

import com.findora.model.Notification;
import com.findora.repository.NotificationRepository;
import com.findora.repository.UserRepository;

import java.util.LinkedHashMap;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Map;

/**
 * NotificationController - Notification management.
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationController(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getNotifications(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        try {
            Long userId = getCurrentUserId();
            Page<Notification> notificationPage = notificationRepository.findByUserId(
                userId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
            );

            List<Map<String, Object>> notifications = new ArrayList<>();
            for (Notification notification : notificationPage.getContent()) {
                notifications.add(toFrontendNotification(notification));
            }

            return ResponseEntity.ok(Map.of(
                "notifications", notifications,
                "count", notificationPage.getTotalElements(),
                "page", page,
                "size", size
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to load notifications: " + e.getMessage()));
        }
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount() {
        try {
            Long userId = getCurrentUserId();
            long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(userId);
            return ResponseEntity.ok(Map.of("count", unreadCount));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to load unread count: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/read")
    @Transactional
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        try {
            Long userId = getCurrentUserId();
            Notification notification = notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

            if (!Boolean.TRUE.equals(notification.getIsRead())) {
                notification.setIsRead(true);
                notificationRepository.save(notification);
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Notification marked as read"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Failed to mark notification as read"));
        }
    }

    @PutMapping("/read-all")
    @Transactional
    public ResponseEntity<?> markAllAsRead() {
        try {
            Long userId = getCurrentUserId();
            List<Notification> unreadNotifications = notificationRepository.findByUserIdAndIsReadFalse(userId);
            for (Notification notification : unreadNotifications) {
                notification.setIsRead(true);
            }
            notificationRepository.saveAll(unreadNotifications);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "All notifications marked as read",
                "updated", unreadNotifications.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Failed to mark all notifications as read"));
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteNotification(@PathVariable Long id) {
        try {
            Long userId = getCurrentUserId();
            Notification notification = notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

            notificationRepository.delete(notification);
            return ResponseEntity.ok(Map.of("success", true, "message", "Notification deleted"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Failed to delete notification"));
        }
    }

    private Map<String, Object> toFrontendNotification(Notification notification) {
        Map<String, Object> mapped = new LinkedHashMap<>();
        mapped.put("id", notification.getId());
        mapped.put("type", notification.getType() != null ? notification.getType().name().toLowerCase() : "system");
        mapped.put("title", notification.getTitle());
        mapped.put("message", notification.getMessage());
        mapped.put("is_read", Boolean.TRUE.equals(notification.getIsRead()));
        mapped.put("related_id", notification.getRelatedId());
        mapped.put("created_at", notification.getCreatedAt() != null ? notification.getCreatedAt().toString() : null);

        if (notification.getType() == Notification.NotificationType.MATCH) {
            mapped.put("found_item_id", notification.getRelatedId());
        }

        if (notification.getType() == Notification.NotificationType.CLAIM) {
            mapped.put("claim_id", notification.getRelatedId());
        }

        return mapped;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("User not authenticated");
        }
        String username = auth.getName();
        return userRepository.findByUsername(username)
            .map(user -> user.getId())
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
