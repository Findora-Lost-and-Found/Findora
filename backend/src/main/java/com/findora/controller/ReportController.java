package com.findora.controller;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.findora.model.Item;
import com.findora.model.Report;
import com.findora.repository.ItemRepository;
import com.findora.repository.ReportRepository;
import com.findora.repository.UserRepository;

/**
 * ReportController - Report management.
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private static final Logger log = LoggerFactory.getLogger(ReportController.class);

    private final ReportRepository reportRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;

    public ReportController(ReportRepository reportRepository, ItemRepository itemRepository, UserRepository userRepository) {
        this.reportRepository = reportRepository;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createReport(@RequestBody Map<String, Object> reportData) {
        try {
            if (reportData == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Request body is required"));
            }

            Object itemIdRaw = reportData.getOrDefault("item_id", reportData.get("itemId"));
            if (itemIdRaw == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "itemId is required"));
            }

            Long itemId = Long.valueOf(String.valueOf(itemIdRaw));
            Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Item not found"));

            String reason = firstNonBlank(
                stringValue(reportData.get("reason")),
                stringValue(reportData.get("title"))
            );
            String description = stringValue(reportData.get("description"));
            if (reason == null || reason.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "reason is required"));
            }

            Long reporterId = getCurrentUserId();
            Report report = new Report();
            report.setReporterId(reporterId);
            report.setItemId(item.getId());
            // Store both the selected reason and free-text detail without changing the entity shape.
            report.setReason(composeReason(reason, description));
            report.setStatus(Report.ReportStatus.PENDING);
            report.setCreatedAt(LocalDateTime.ofInstant(Instant.now(), ZoneOffset.UTC));
            Report savedReport = reportRepository.save(report);

            log.info("report created reportId={} itemId={} reporterId={} at={}", savedReport.getId(), item.getId(), reporterId, Instant.now());

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "success", true,
                "message", "Report submitted successfully",
                "report", toReportPayload(savedReport)
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getMyReports(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        Long currentUserId = getCurrentUserId();
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Report> reportsPage = reportRepository.findByReporterId(currentUserId, pageable);

        List<Map<String, Object>> reports = reportsPage.getContent().stream()
            .map(this::toReportPayload)
            .toList();

        return ResponseEntity.ok(Map.of(
            "success", true,
            "reports", reports,
            "count", reportsPage.getTotalElements(),
            "page", reportsPage.getNumber(),
            "size", reportsPage.getSize()
        ));
    }

    private Map<String, Object> toReportPayload(Report report) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", report.getId());
        payload.put("reporter_id", report.getReporterId());
        payload.put("reporter_username", report.getReporter() == null ? null : report.getReporter().getUsername());
        payload.put("item_id", report.getItemId());
        payload.put("item_name", report.getItem() == null ? null : report.getItem().getItemName());
        payload.put("posted_by_user_id", report.getItem() == null ? null : report.getItem().getUserId());
        payload.put("posted_by_username", report.getItem() == null || report.getItem().getUser() == null ? null : report.getItem().getUser().getUsername());
        payload.put("reason", report.getReason());
        payload.put("status", report.getStatus() == null ? null : report.getStatus().name().toLowerCase());
        payload.put("admin_notes", report.getAdminNotes());
        payload.put("created_at", report.getCreatedAt() == null ? null : report.getCreatedAt().toString());
        payload.put("resolved_at", report.getResolvedAt() == null ? null : report.getResolvedAt().toString());
        return payload;
    }

    private String composeReason(String reason, String description) {
        if (description == null || description.isBlank()) {
            return reason.trim();
        }

        return reason.trim() + "\n\nDetails: " + description.trim();
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
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
