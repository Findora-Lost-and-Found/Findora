package com.findora.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

import com.findora.dto.ItemDTO;
import com.findora.dto.PaginatedResponse;
import com.findora.dto.SecurityItemActionRequest;
import com.findora.dto.SecurityPendingClaimDTO;
import com.findora.dto.SecurityReceiveItemDTO;
import com.findora.dto.SecurityTransactionDTO;
import com.findora.model.User;
import com.findora.repository.UserRepository;
import com.findora.service.ItemService;
import com.findora.service.SecurityService;

/**
 * SecurityController - Security officer endpoints.
 */
@RestController
@RequestMapping("/api/security")
public class SecurityController {

    private static final Logger log = LoggerFactory.getLogger(SecurityController.class);

    private final ItemService itemService;
    private final SecurityService securityService;
    private final UserRepository userRepository;

    public SecurityController(ItemService itemService, SecurityService securityService, UserRepository userRepository) {
        this.itemService = itemService;
        this.securityService = securityService;
        this.userRepository = userRepository;
    }

    @PostMapping("/verify-claim")
    @PreAuthorize("hasAnyRole('SECURITY', 'ADMIN')")
    public ResponseEntity<?> verifyClaim(@RequestBody Map<String, Object> verifyData) {
        try {
            String claimIdRaw = verifyData != null
                ? String.valueOf(verifyData.getOrDefault("claim_id", verifyData.get("claimId")))
                : null;
            String itemIdRaw = verifyData != null
                ? String.valueOf(verifyData.getOrDefault("item_id", verifyData.get("itemId")))
                : null;
            String otp = verifyData != null && verifyData.get("otp") != null
                ? String.valueOf(verifyData.get("otp"))
                : null;

            if ("null".equalsIgnoreCase(claimIdRaw)) {
                claimIdRaw = null;
            }
            if ("null".equalsIgnoreCase(itemIdRaw)) {
                itemIdRaw = null;
            }

            if (claimIdRaw == null || claimIdRaw.isBlank()
                    || itemIdRaw == null || itemIdRaw.isBlank()
                    || otp == null || otp.isBlank()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "claimId, itemId and otp are required"));
            }

            Long claimId = Long.valueOf(claimIdRaw);
            Long itemId = Long.valueOf(itemIdRaw);
            Long userId = getCurrentUserId();
            securityService.verifyClaim(claimId, itemId, otp, userId);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Claim verified and item released"
            ));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "message", "Invalid claimId or itemId"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    @PostMapping("/handover-request")
    public ResponseEntity<?> handoverRequest(@RequestBody SecurityItemActionRequest request) {
        try {
            if (request == null || request.getItemId() == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "itemId is required"));
            }

            Long userId = getCurrentUserId();
            securityService.requestHandover(request.getItemId(), userId);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Handover request submitted successfully"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    @PostMapping("/receive-item")
    @PreAuthorize("hasAnyRole('SECURITY', 'ADMIN')")
    public ResponseEntity<?> receiveItem(@RequestBody SecurityItemActionRequest request) {
        try {
            if (request == null || request.getItemId() == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "itemId is required"));
            }

            Long userId = getCurrentUserId();
            securityService.confirmReceive(request.getItemId(), userId);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Item received successfully"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    @GetMapping("/receive-items")
    @PreAuthorize("hasAnyRole('SECURITY', 'ADMIN')")
    public ResponseEntity<?> getReceiveItems() {
        try {
            List<SecurityReceiveItemDTO> items = securityService.getReceiveItems();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "items", items
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    @GetMapping("/pending-claims")
    @PreAuthorize("hasAnyRole('SECURITY', 'ADMIN')")
    public ResponseEntity<?> getPendingClaims() {
        try {
            List<SecurityPendingClaimDTO> claims = securityService.getPendingClaims();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "claims", claims,
                "count", claims.size()
            ));
        } catch (Exception e) {
            log.error("Failed to fetch pending claims", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error: " + e.getMessage()));
        }
    }

    @GetMapping("/transactions")
    @PreAuthorize("hasAnyRole('SECURITY', 'ADMIN')")
    public ResponseEntity<?> getTransactions(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        try {
            Long userId = getCurrentUserId();
            User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));

            boolean includeAll = currentUser.getRole() == User.UserRole.ADMIN || currentUser.getRole() == User.UserRole.SECURITY;

            PaginatedResponse<SecurityTransactionDTO> response = securityService.getTransactions(
                userId,
                includeAll,
                Math.max(page, 0),
                Math.max(size, 1)
            );

            return ResponseEntity.ok(toFrontendTransactionResponse(response));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getSecurityStats() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "Security stats endpoint not yet implemented"));
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

    private Map<String, Object> toFrontendTransactionResponse(PaginatedResponse<SecurityTransactionDTO> response) {
        List<SecurityTransactionDTO> transactions = response.getContent();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("transactions", transactions);
        body.put("content", transactions);
        body.put("pageNumber", response.getPageNumber());
        body.put("pageSize", response.getPageSize());
        body.put("totalPages", response.getTotalPages());
        body.put("totalElements", response.getTotalElements());
        return body;
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
