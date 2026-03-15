package com.findora.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.findora.dto.ItemDTO;
import com.findora.dto.PaginatedResponse;
import com.findora.service.ItemService;

/**
 * SecurityController - Security officer endpoints (TODO: Full implementation).
 */
@RestController
@RequestMapping("/api/security")
public class SecurityController {

    private final ItemService itemService;

    public SecurityController(ItemService itemService) {
        this.itemService = itemService;
    }

    @PostMapping("/verify-claim")
    public ResponseEntity<?> verifyClaim(@RequestBody Map<String, String> verifyData) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement verify claim OTP"));
    }

    @PostMapping("/receive-item")
    public ResponseEntity<?> receiveItem(@RequestBody Map<String, Object> itemData) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement item receipt"));
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement get transactions"));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getSecurityStats() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement security stats"));
    }

    /**
     * GET /api/security/found-items
     * Security/Admin view for found active items with pagination.
     */
    @GetMapping("/found-items")
    @PreAuthorize("hasAnyRole('SECURITY', 'ADMIN')")
    public ResponseEntity<?> getFoundItemsForSecurity(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword) {
        try {
            PaginatedResponse<ItemDTO> response = itemService.getPaginatedItems(
                page,
                size,
                sort,
                category,
                keyword,
                "found",
                "active"
            );

            return ResponseEntity.ok(toFrontendListResponse(response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                Map.of("success", false, "message", e.getMessage())
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    private Map<String, Object> toFrontendListResponse(PaginatedResponse<ItemDTO> response) {
        List<ItemDTO> items = response.getContent();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("count", response.getTotalElements());
        body.put("content", items);
        body.put("pageNumber", response.getPageNumber());
        body.put("pageSize", response.getPageSize());
        body.put("totalPages", response.getTotalPages());
        body.put("totalElements", response.getTotalElements());
        return body;
    }
}
