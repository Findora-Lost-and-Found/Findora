package com.findora.controller;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.findora.model.Claim;
import com.findora.model.Item;
import com.findora.model.ItemType;
import com.findora.repository.ClaimRepository;
import com.findora.repository.ItemRepository;
import com.findora.repository.UserRepository;

/**
 * ClaimController - Claim management endpoints.
 */
@RestController
@RequestMapping("/api/claims")
public class ClaimController {

    private static final Collection<Claim.ClaimStatus> OPEN_STATUSES = List.of(
        Claim.ClaimStatus.PENDING,
        Claim.ClaimStatus.APPROVED
    );

    private final ClaimRepository claimRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;

    public ClaimController(ClaimRepository claimRepository, ItemRepository itemRepository, UserRepository userRepository) {
        this.claimRepository = claimRepository;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF', 'SECURITY', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> createClaim(@RequestBody Map<String, Object> claimData) {
        try {
            if (claimData == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Request body is required"
                ));
            }

            Object itemIdRaw = claimData.getOrDefault("item_id", claimData.get("itemId"));
            if (itemIdRaw == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "item_id is required"
                ));
            }

            Long itemId;
            try {
                itemId = Long.valueOf(String.valueOf(itemIdRaw));
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid item_id"
                ));
            }

            Long currentUserId = getCurrentUserId();

            Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Item not found"));

            if (item.getType() != ItemType.FOUND) {
                throw new IllegalArgumentException("Only found items can be claimed");
            }

            if (item.getUserId() != null && item.getUserId().equals(currentUserId)) {
                throw new IllegalArgumentException("You cannot claim your own item");
            }

            claimRepository
                .findFirstByItemIdAndClaimerIdAndStatusInOrderByClaimedAtDesc(itemId, currentUserId, OPEN_STATUSES)
                .ifPresent(existingClaim -> {
                    throw new IllegalArgumentException("You already have an active claim for this item");
                });

            String otp = String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1_000_000));
            LocalDateTime otpExpiry = LocalDateTime.now().plusHours(24);

            Claim claim = new Claim();
            claim.setItemId(itemId);
            claim.setClaimerId(currentUserId);
            claim.setOtp(otp);
            claim.setOtpExpiry(otpExpiry);
            claim.setStatus(Claim.ClaimStatus.PENDING);
            claim = claimRepository.save(claim);

            Map<String, Object> claimPayload = new LinkedHashMap<>();
            claimPayload.put("id", claim.getId());
            claimPayload.put("item_id", claim.getItemId());
            claimPayload.put("claimer_id", claim.getClaimerId());
            claimPayload.put("otp", claim.getOtp());
            claimPayload.put("otp_expiry", claim.getOtpExpiry() != null ? claim.getOtpExpiry().toString() : null);
            claimPayload.put("status", claim.getStatus().name().toLowerCase());
            claimPayload.put("claimed_at", claim.getClaimedAt());

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "success", true,
                "message", "Claim submitted successfully. OTP sent.",
                "otp", otp,
                "claim", claimPayload
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Server error"
            ));
        }
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF', 'SECURITY', 'ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyClaims(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        try {
            Long currentUserId = getCurrentUserId();
            Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "claimedAt"));

            Page<Claim> claimsPage = claimRepository.findByClaimerId(currentUserId, pageable);

            List<Map<String, Object>> claims = claimsPage.getContent().stream()
                .map(claim -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", claim.getId());
                    row.put("item_id", claim.getItemId());
                    row.put("status", claim.getStatus() != null ? claim.getStatus().name().toLowerCase() : "pending");
                    row.put("otp", claim.getOtp());
                    row.put("otp_expiry", claim.getOtpExpiry() != null ? claim.getOtpExpiry().toString() : null);
                    row.put("claimed_at", claim.getClaimedAt() != null ? claim.getClaimedAt().toString() : null);
                    row.put("collected_at", claim.getCollectedAt() != null ? claim.getCollectedAt().toString() : null);

                    Item item = claim.getItem();
                    if (item == null && claim.getItemId() != null) {
                        item = itemRepository.findById(claim.getItemId()).orElse(null);
                    }

                    if (item != null) {
                        row.put("item_name", item.getItemName());
                        row.put("category", item.getCategory() != null ? item.getCategory().name() : null);
                        row.put("image_url", item.getImageUrl());
                    } else {
                        row.put("item_name", null);
                        row.put("category", null);
                        row.put("image_url", null);
                    }

                    return row;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "claims", claims,
                "count", claimsPage.getTotalElements(),
                "page", page,
                "size", size
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getClaimById(@PathVariable Long id) {
        return claimRepository.findById(id)
            .<ResponseEntity<?>>map(claim -> ResponseEntity.ok(Map.of(
                "success", true,
                "claim", Map.of(
                    "id", claim.getId(),
                    "item_id", claim.getItemId(),
                    "claimer_id", claim.getClaimerId(),
                    "status", claim.getStatus() != null ? claim.getStatus().name().toLowerCase() : null,
                    "otp", claim.getOtp(),
                    "otp_expiry", claim.getOtpExpiry(),
                    "claimed_at", claim.getClaimedAt(),
                    "collected_at", claim.getCollectedAt()
                )
            )))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", "Claim not found")));
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingClaims(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        List<Claim> claims = claimRepository.findByStatusInOrderByClaimedAtDesc(OPEN_STATUSES);

        List<Map<String, Object>> rows = claims.stream().map(claim -> {
            Item item = itemRepository.findById(claim.getItemId()).orElse(null);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", claim.getId());
            row.put("item_id", claim.getItemId());
            row.put("item_name", item != null ? item.getItemName() : "Unknown Item");
            row.put("location", item != null ? item.getLocation() : "Unknown location");
            row.put("claimed_at", claim.getClaimedAt());
            return row;
        }).toList();

        return ResponseEntity.ok(Map.of(
            "success", true,
            "claims", rows,
            "count", rows.size()
        ));
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
