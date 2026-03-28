package com.findora.controller;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.findora.model.Item;
import com.findora.model.ItemStatus;
import com.findora.model.ItemType;
import com.findora.model.Report;
import com.findora.model.SecurityTransaction;
import com.findora.model.User;
import com.findora.repository.ItemRepository;
import com.findora.repository.ReportRepository;
import com.findora.repository.SecurityTransactionRepository;
import com.findora.repository.UserRepository;
import com.findora.service.AccessControlService;

/**
 * AdminController - Administrative endpoints.
 * All endpoints require ADMIN role.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final ReportRepository reportRepository;
    private final SecurityTransactionRepository securityTransactionRepository;
    private final AccessControlService accessControlService;
    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    public AdminController(
            UserRepository userRepository,
            ItemRepository itemRepository,
            ReportRepository reportRepository,
            SecurityTransactionRepository securityTransactionRepository,
            AccessControlService accessControlService) {
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.reportRepository = reportRepository;
        this.securityTransactionRepository = securityTransactionRepository;
        this.accessControlService = accessControlService;
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "50") Integer size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"));

        List<Map<String, Object>> users = userRepository.findAll(pageable)
            .stream()
            .map(this::toUserPayload)
            .toList();

        return ResponseEntity.ok(Map.of(
            "success", true,
            "users", users
        ));
    }

    @GetMapping("/pending-approvals")
    public ResponseEntity<?> getPendingApprovals(
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "100") Integer size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"));

        List<Map<String, Object>> approvals = userRepository.findAll(pageable)
            .stream()
            .filter(user -> !Boolean.TRUE.equals(user.getIsApproved())
                && !Boolean.TRUE.equals(user.getIsSuspended())
                && user.getRole() != User.UserRole.STUDENT)
            .map(this::toUserPayload)
            .toList();

        return ResponseEntity.ok(Map.of(
            "success", true,
            "approvals", approvals
        ));
    }

    @PutMapping("/approve-user/{id}")
    public ResponseEntity<?> approveUser(@PathVariable("id") Long id) {
        User user = userRepository.findById(id)
            .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", "User not found"));
        }

        user.setIsApproved(true);
        user.setIsSuspended(false);
        user.setSuspensionUntil(null);
        user.setBadPostAttempts(0);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "message", "User approved"));
    }

    @PutMapping("/decline-user/{id}")
    public ResponseEntity<?> declineUser(@PathVariable("id") Long id) {
        User user = userRepository.findById(id)
            .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", "User not found"));
        }

        // Suspension acts as the persisted decline marker without introducing a schema change.
        user.setIsApproved(false);
        user.setIsSuspended(true);
        userRepository.save(user);

        log.info("admin declined user id={} username={}", user.getId(), user.getUsername());

        return ResponseEntity.ok(Map.of("success", true, "message", "User declined"));
    }

    @PutMapping("/ban-user/{id}")
    public ResponseEntity<?> banUser(@PathVariable("id") Long id, @RequestBody(required = false) Map<String, Object> body) {
        User user = userRepository.findById(id)
            .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", "User not found"));
        }

        boolean banned = parseBoolean(body != null ? body.get("banned") : null, true);
        user.setIsBanned(banned);
        if (banned) {
            user.setIsSuspended(false);
            user.setSuspensionUntil(null);
        }
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "message", banned ? "User banned" : "User unbanned"));
    }

    @PutMapping("/suspend-user/{id}")
    public ResponseEntity<?> suspendUser(@PathVariable("id") Long id, @RequestBody(required = false) Map<String, Object> body) {
        User user = userRepository.findById(id)
            .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", "User not found"));
        }

        boolean suspended = parseBoolean(body != null ? body.get("suspended") : null, true);
        user.setIsSuspended(suspended);
        if (suspended) {
            user.setSuspensionUntil(LocalDateTime.now().plusMonths(6));
        } else {
            user.setSuspensionUntil(null);
            user.setBadPostAttempts(0);
        }
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "message", suspended ? "User suspended" : "User unsuspended"));
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getReports(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "20") Integer size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"));

        List<Report> reportRows = status == null || status.isBlank()
            ? reportRepository.findAll(pageable).getContent()
            : reportRepository.findByStatus(Report.ReportStatus.valueOf(status.trim().toUpperCase(Locale.ROOT)), pageable).getContent();

        long pendingReports = reportRepository.countByStatus(Report.ReportStatus.PENDING);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "pendingReports", pendingReports,
            "reports", reportRows.stream().map(this::toReportPayload).toList(),
            "page", pageable.getPageNumber(),
            "size", pageable.getPageSize()
        ));
    }

    @PutMapping("/reports/{id}")
    public ResponseEntity<?> updateReport(@PathVariable("id") Long id, @RequestBody Map<String, String> updateData) {
        try {
            Report report = reportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Report not found"));

            String adminNotes = updateData.get("admin_notes");
            if (adminNotes != null && !adminNotes.isBlank()) {
                report.setAdminNotes(adminNotes);
            }

            String statusStr = updateData.get("status");
            if (statusStr != null && !statusStr.isBlank()) {
                report.setStatus(Report.ReportStatus.fromDatabaseValue(statusStr));
            }

            reportRepository.save(report);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Report updated successfully",
                "report", toReportPayload(report)
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/reports/{id}/hide-item")
    public ResponseEntity<?> hideReportedItem(@PathVariable("id") Long id) {
        try {
            Report report = reportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Report not found"));

            if (report.getItem() == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Item not found for this report"));
            }

            Item item = report.getItem();
            item.setStatus(ItemStatus.CLOSED);
            itemRepository.save(item);

            report.setStatus(Report.ReportStatus.REVIEWED);
            reportRepository.save(report);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Item hidden from public view",
                "report", toReportPayload(report)
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/items")
    public ResponseEntity<?> getItems(
            @RequestParam(name = "status", defaultValue = "found") String status,
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "100") Integer size) {
        String normalizedStatus = status == null ? "found" : status.trim().toLowerCase(Locale.ROOT);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"));

        List<Map<String, Object>> items = switch (normalizedStatus) {
            case "released", "release" -> itemRepository.findPaginatedItems(null, null, null, ItemStatus.CLOSED, pageable)
                .stream()
                .map(item -> toAdminItemPayload(item, "released"))
                .toList();
            case "received", "receive" -> itemRepository.findPaginatedItems(null, null, null, ItemStatus.CLAIMED, pageable)
                .stream()
                .map(item -> toAdminItemPayload(item, "received"))
                .toList();
            case "found" -> itemRepository.findPaginatedItems(null, null, ItemType.FOUND, null, pageable)
                .stream()
                .map(item -> toAdminItemPayload(item, "found"))
                .toList();
            default -> null;
        };

        if (items == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid status. Use one of: found, received, released"
            ));
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "items", items
        ));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getAdminStats() {
        long totalUsers = userRepository.count();
        long pendingApprovals = userRepository.countByIsApprovedFalseAndRoleNot(User.UserRole.STUDENT);

        long totalLostPosts = itemRepository.countByType(ItemType.LOST);
        long totalFoundPosts = itemRepository.countByType(ItemType.FOUND);
        long activeLostItems = itemRepository.countByTypeAndStatus(ItemType.LOST, ItemStatus.ACTIVE);
        long activeFoundItems = itemRepository.countByTypeAndStatus(ItemType.FOUND, ItemStatus.ACTIVE);
        long claimedItems = itemRepository.countByStatus(ItemStatus.CLAIMED);

        long totalReports = reportRepository.count();
        long pendingReports = reportRepository.countByStatus(Report.ReportStatus.PENDING);

        long receivedTransactions = securityTransactionRepository.countByTransactionType(SecurityTransaction.TransactionType.RECEIVE);
        long releasedTransactions = securityTransactionRepository.countByTransactionType(SecurityTransaction.TransactionType.RELEASE);

        Map<String, Object> users = new LinkedHashMap<>();
        users.put("total", totalUsers);
        users.put("pendingApprovals", pendingApprovals);

        Map<String, Object> items = new LinkedHashMap<>();
        items.put("lost", activeLostItems);
        items.put("found", activeFoundItems);
        items.put("claimed", claimedItems);
        items.put("lostPosted", totalLostPosts);
        items.put("foundPosted", totalFoundPosts);

        Map<String, Object> reports = new LinkedHashMap<>();
        reports.put("total", totalReports);
        reports.put("pending", pendingReports);

        Map<String, Object> transactions = new LinkedHashMap<>();
        transactions.put("received", receivedTransactions);
        transactions.put("released", releasedTransactions);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("users", users);
        stats.put("items", items);
        stats.put("reports", reports);
        stats.put("pendingReports", pendingReports);
        stats.put("pendingApprovals", pendingApprovals);
        stats.put("transactions", transactions);
        stats.put("generatedAt", LocalDateTime.now().toString());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "stats", stats
        ));
    }

    @GetMapping("/appeals")
    public ResponseEntity<?> getAppeals(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "20") Integer size) {
        try {
            Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"));

            var appealPage = accessControlService.getAppeals(status, pageable);
            List<Map<String, Object>> appeals = appealPage.getContent().stream()
                .map(accessControlService::toAppealPayload)
                .toList();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "appeals", appeals,
                "count", appealPage.getTotalElements(),
                "page", appealPage.getNumber(),
                "size", appealPage.getSize()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid appeal status"));
        }
    }

    @GetMapping("/appeals/{id}")
    public ResponseEntity<?> getAppealById(@PathVariable("id") Long id) {
        try {
            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", accessControlService.getAppealDetails(id)
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/appeals/{id}/approve")
    public ResponseEntity<?> approveAppeal(@PathVariable("id") Long id, @RequestBody(required = false) Map<String, Object> body) {
        try {
            String notes = body == null ? null : String.valueOf(body.getOrDefault("admin_notes", ""));
            Map<String, Object> result = accessControlService.reviewAppeal(id, true, notes);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Appeal approved",
                "appeal", result
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/appeals/{id}/decline")
    public ResponseEntity<?> declineAppeal(@PathVariable("id") Long id, @RequestBody(required = false) Map<String, Object> body) {
        try {
            String notes = body == null ? null : String.valueOf(body.getOrDefault("admin_notes", ""));
            Map<String, Object> result = accessControlService.reviewAppeal(id, false, notes);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Appeal declined",
                "appeal", result
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    private Map<String, Object> toUserPayload(User user) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", user.getId());
        payload.put("username", user.getUsername());
        payload.put("full_name", user.getFullName());
        payload.put("email", user.getEmail());
        payload.put("role", user.getRole() == null ? null : user.getRole().name().toLowerCase(Locale.ROOT));
        payload.put("is_verified", user.getIsVerified());
        payload.put("is_approved", user.getIsApproved());
        payload.put("is_banned", user.getIsBanned());
        payload.put("is_suspended", user.getIsSuspended());
        payload.put("bad_post_attempts", user.getBadPostAttempts());
        payload.put("suspension_until", user.getSuspensionUntil() == null ? null : user.getSuspensionUntil().toString());
        payload.put("created_at", user.getCreatedAt() == null ? null : user.getCreatedAt().toString());
        return payload;
    }

    private Map<String, Object> toAdminItemPayload(Item item, String status) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", item.getId());
        payload.put("status", status);
        payload.put("item_name", item.getItemName());
        payload.put("image_url", item.getImageUrl());
        payload.put("founder_username", item.getUser() == null ? null : item.getUser().getUsername());
        payload.put("security_username", null);
        payload.put("receiver_username", null);
        payload.put("date_found", item.getCreatedAt() == null ? null : item.getCreatedAt().toString());
        payload.put("date_received", item.getUpdatedAt() == null ? null : item.getUpdatedAt().toString());
        payload.put("date_released", item.getUpdatedAt() == null ? null : item.getUpdatedAt().toString());
        return payload;
    }

    private Map<String, Object> toReportPayload(Report report) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", report.getId());
        payload.put("reporter_id", report.getReporterId());
        payload.put("reporter_username", report.getReporter() == null ? null : report.getReporter().getUsername());
        payload.put("reporter_name", report.getReporter() == null ? null : report.getReporter().getFullName());
        payload.put("item_id", report.getItemId());
        payload.put("item_name", report.getItem() == null ? null : report.getItem().getItemName());
        payload.put("posted_by_user_id", report.getItem() == null ? null : report.getItem().getUserId());
        payload.put("posted_by_username", report.getItem() == null || report.getItem().getUser() == null ? null : report.getItem().getUser().getUsername());
        payload.put("posted_by_name", report.getItem() == null || report.getItem().getUser() == null ? null : report.getItem().getUser().getFullName());
        payload.put("reason", report.getReason());
        payload.put("status", report.getStatus() == null ? null : report.getStatus().name().toLowerCase(Locale.ROOT));
        payload.put("item_status", report.getItem() == null || report.getItem().getStatus() == null ? null : report.getItem().getStatus().name().toLowerCase(Locale.ROOT));
        payload.put("admin_notes", report.getAdminNotes());
        payload.put("created_at", report.getCreatedAt() == null ? null : report.getCreatedAt().toString());
        payload.put("resolved_at", report.getResolvedAt() == null ? null : report.getResolvedAt().toString());
        return payload;
    }

    private boolean parseBoolean(Object rawValue, boolean defaultValue) {
        if (rawValue == null) {
            return defaultValue;
        }
        if (rawValue instanceof Boolean boolValue) {
            return boolValue;
        }
        String value = String.valueOf(rawValue).trim().toLowerCase(Locale.ROOT);
        if ("true".equals(value) || "1".equals(value) || "yes".equals(value)) {
            return true;
        }
        if ("false".equals(value) || "0".equals(value) || "no".equals(value)) {
            return false;
        }
        return defaultValue;
    }
}
