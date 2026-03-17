package com.findora.controller;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

/**
 * AdminController - Administrative endpoints.
 * All endpoints require ADMIN role.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final ReportRepository reportRepository;
    private final SecurityTransactionRepository securityTransactionRepository;

    public AdminController(
            UserRepository userRepository,
            ItemRepository itemRepository,
            ReportRepository reportRepository,
            SecurityTransactionRepository securityTransactionRepository) {
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.reportRepository = reportRepository;
        this.securityTransactionRepository = securityTransactionRepository;
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "50") Integer size) {
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
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "100") Integer size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"));

        List<Map<String, Object>> approvals = userRepository.findAll(pageable)
            .stream()
            .filter(user -> !Boolean.TRUE.equals(user.getIsApproved())
                && user.getRole() != User.UserRole.STUDENT)
            .map(this::toUserPayload)
            .toList();

        return ResponseEntity.ok(Map.of(
            "success", true,
            "approvals", approvals
        ));
    }

    @PutMapping("/approve-user/{id}")
    public ResponseEntity<?> approveUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
            .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", "User not found"));
        }

        user.setIsApproved(true);
        user.setIsSuspended(false);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "message", "User approved"));
    }

    @PutMapping("/ban-user/{id}")
    public ResponseEntity<?> banUser(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        User user = userRepository.findById(id)
            .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", "User not found"));
        }

        boolean banned = parseBoolean(body != null ? body.get("banned") : null, true);
        user.setIsBanned(banned);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "message", banned ? "User banned" : "User unbanned"));
    }

    @PutMapping("/suspend-user/{id}")
    public ResponseEntity<?> suspendUser(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        User user = userRepository.findById(id)
            .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", "User not found"));
        }

        boolean suspended = parseBoolean(body != null ? body.get("suspended") : null, true);
        user.setIsSuspended(suspended);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "message", suspended ? "User suspended" : "User unsuspended"));
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getReports(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"));

        long pendingReports = reportRepository.countByStatus(Report.ReportStatus.PENDING);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "pendingReports", pendingReports,
            "reports", new ArrayList<>(),
            "page", pageable.getPageNumber(),
            "size", pageable.getPageSize()
        ));
    }

    @PutMapping("/reports/{id}")
    public ResponseEntity<?> updateReport(@PathVariable Long id, @RequestBody Map<String, String> updateData) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("success", false, "message", "Report update is not implemented yet"));
    }

    @GetMapping("/items")
    public ResponseEntity<?> getItems(
            @RequestParam(defaultValue = "found") String status,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "100") Integer size) {
        String normalizedStatus = status == null ? "found" : status.trim().toLowerCase(Locale.ROOT);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"));

        List<Map<String, Object>> items = switch (normalizedStatus) {
            case "released" -> itemRepository.findPaginatedItems(null, null, null, ItemStatus.CLOSED, pageable)
                .stream()
                .map(item -> toAdminItemPayload(item, "released"))
                .toList();
            case "received" -> itemRepository.findPaginatedItems(null, null, null, ItemStatus.CLAIMED, pageable)
                .stream()
                .map(item -> toAdminItemPayload(item, "received"))
                .toList();
            default -> itemRepository.findPaginatedItems(null, null, ItemType.FOUND, null, pageable)
                .stream()
                .map(item -> toAdminItemPayload(item, "found"))
                .toList();
        };

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
