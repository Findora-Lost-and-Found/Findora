package com.findora.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * NotificationController - Notification management (TODO: Full implementation).
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @GetMapping
    public ResponseEntity<?> getNotifications(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement get notifications"));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement unread count"));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement mark notification as read"));
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement mark all as read"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement delete notification"));
    }
}
