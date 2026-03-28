package com.findora.controller;

import com.findora.model.Item;
import com.findora.model.Notification;
import com.findora.model.Report;
import com.findora.model.User;
import com.findora.repository.ItemRepository;
import com.findora.repository.NotificationRepository;
import com.findora.repository.ReportRepository;
import com.findora.repository.UserRepository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * NotificationController - Notification management.
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final ReportRepository reportRepository;
    private static final Pattern PETITION_TYPE_PATTERN = Pattern.compile("submitted a\\s+(ban|suspend)\\s+petition", Pattern.CASE_INSENSITIVE);
    private static final Pattern PETITION_REASON_PATTERN = Pattern.compile("Reason:\\s*(.+)$", Pattern.CASE_INSENSITIVE);

    public NotificationController(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            ItemRepository itemRepository,
            ReportRepository reportRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.reportRepository = reportRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getNotifications(
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "10") Integer size) {
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
    public ResponseEntity<?> markAsRead(@PathVariable("id") Long id) {
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
    public ResponseEntity<?> deleteNotification(@PathVariable("id") Long id) {
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

    @GetMapping("/{id}/petition-details")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getPetitionDetails(@PathVariable("id") Long id) {
        try {
            User currentUser = getCurrentUser();
            if (currentUser.getRole() != User.UserRole.ADMIN) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "message", "Only admins can review petitions"));
            }

            Notification notification = notificationRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

            PetitionInfo petitionInfo = extractPetitionInfo(notification.getMessage());
            Long petitionerId = notification.getRelatedId();
            if (petitionerId == null) {
                throw new IllegalArgumentException("Petition notification is missing related user id");
            }

            User petitioner = userRepository.findById(petitionerId)
                .orElseThrow(() -> new IllegalArgumentException("Petitioner not found"));

            // Fetch only posts that have been reported by others
            List<Map<String, Object>> posts = reportRepository.findReportsByItemOwerId(
                    petitioner.getId(),
                    PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt"))
                )
                .getContent()
                .stream()
                .map(report -> toPostPayloadWithReportDetails(report.getItem(), report))
                .toList();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "petition", Map.of(
                    "type", petitionInfo.type,
                    "reason", petitionInfo.reason,
                    "notification_id", notification.getId(),
                    "created_at", notification.getCreatedAt() == null ? null : notification.getCreatedAt().toString()
                ),
                "user", toUserPayload(petitioner),
                "posts", posts
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Failed to load petition details"));
        }
    }

    @PutMapping("/{id}/petition-review")
    @Transactional
    public ResponseEntity<?> reviewPetition(@PathVariable("id") Long id, @RequestParam(name = "decision") String decision) {
        try {
            User currentUser = getCurrentUser();
            if (currentUser.getRole() != User.UserRole.ADMIN) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "message", "Only admins can review petitions"));
            }

            Notification notification = notificationRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

            String normalizedDecision = decision == null ? "" : decision.trim().toLowerCase(Locale.ROOT);
            if (!"accept".equals(normalizedDecision) && !"decline".equals(normalizedDecision)) {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Decision must be accept or decline"));
            }

            PetitionInfo petitionInfo = extractPetitionInfo(notification.getMessage());
            Long petitionerId = notification.getRelatedId();
            if (petitionerId == null) {
                throw new IllegalArgumentException("Petition notification is missing related user id");
            }

            User petitioner = userRepository.findById(petitionerId)
                .orElseThrow(() -> new IllegalArgumentException("Petitioner not found"));

            if ("accept".equals(normalizedDecision)) {
                if ("ban".equals(petitionInfo.type)) {
                    petitioner.setIsBanned(false);
                } else {
                    petitioner.setIsSuspended(false);
                    petitioner.setOtpExpiry(null);
                }
                userRepository.save(petitioner);
            }

            Notification resultNotification = new Notification();
            resultNotification.setUserId(petitioner.getId());
            resultNotification.setType(Notification.NotificationType.SYSTEM);
            resultNotification.setTitle("Petition " + ("accept".equals(normalizedDecision) ? "accepted" : "declined"));
            resultNotification.setMessage(
                "Your " + petitionInfo.type + " petition was " + normalizedDecision +
                ("accept".equals(normalizedDecision)
                    ? ". Your account restrictions have been updated."
                    : ". You may submit another petition later with additional details.")
            );
            resultNotification.setRelatedId(petitioner.getId());
            notificationRepository.save(resultNotification);

            notification.setIsRead(true);
            notificationRepository.save(notification);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Petition " + normalizedDecision + "ed successfully"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Failed to review petition"));
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

        return mapped;
    }

    private Long getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("User not authenticated");
        }
        String username = auth.getName();
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }

    private PetitionInfo extractPetitionInfo(String message) {
        String petitionType = "suspend";
        String petitionReason = "-";

        if (message != null) {
            Matcher typeMatcher = PETITION_TYPE_PATTERN.matcher(message);
            if (typeMatcher.find()) {
                petitionType = typeMatcher.group(1).toLowerCase(Locale.ROOT);
            }

            Matcher reasonMatcher = PETITION_REASON_PATTERN.matcher(message);
            if (reasonMatcher.find()) {
                petitionReason = reasonMatcher.group(1).trim();
            }
        }

        return new PetitionInfo(petitionType, petitionReason);
    }

    private Map<String, Object> toUserPayload(User user) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", user.getId());
        payload.put("username", user.getUsername());
        payload.put("full_name", user.getFullName());
        payload.put("email", user.getEmail());
        payload.put("role", user.getRole() == null ? null : user.getRole().name().toLowerCase(Locale.ROOT));
        payload.put("is_banned", Boolean.TRUE.equals(user.getIsBanned()));
        payload.put("is_suspended", Boolean.TRUE.equals(user.getIsSuspended()));
        payload.put("suspended_until", Boolean.TRUE.equals(user.getIsSuspended()) && user.getOtpExpiry() != null ? user.getOtpExpiry().toString() : null);
        payload.put("is_verified", Boolean.TRUE.equals(user.getIsVerified()));
        payload.put("is_approved", Boolean.TRUE.equals(user.getIsApproved()));
        return payload;
    }

    private Map<String, Object> toPostPayload(Item item) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", item.getId());
        payload.put("type", item.getType() == null ? null : item.getType().name().toLowerCase(Locale.ROOT));
        payload.put("category", item.getCategory() == null ? null : item.getCategory().name());
        payload.put("item_name", item.getItemName());
        payload.put("status", item.getStatus() == null ? null : item.getStatus().name().toLowerCase(Locale.ROOT));
        payload.put("description", item.getDescription());
        payload.put("image_url", item.getImageUrl());
        payload.put("created_at", item.getCreatedAt() == null ? null : item.getCreatedAt().toString());
        return payload;
    }

    private Map<String, Object> toPostPayloadWithReportDetails(Item item, Report report) {
        Map<String, Object> payload = toPostPayload(item);
        payload.put("report_id", report.getId());
        payload.put("report_reason", report.getReason());
        payload.put("reporter_id", report.getReporterId());
        payload.put("report_status", report.getStatus() == null ? null : report.getStatus().name().toLowerCase(Locale.ROOT));
        payload.put("report_created_at", report.getCreatedAt() == null ? null : report.getCreatedAt().toString());
        return payload;
    }

    private record PetitionInfo(String type, String reason) {
    }
}
