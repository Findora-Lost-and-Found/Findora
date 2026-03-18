package com.findora.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

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
import com.findora.model.ItemCategory;
import com.findora.model.ItemType;
import com.findora.repository.ClaimRepository;
import com.findora.repository.ItemRepository;
import com.findora.repository.UserRepository;
import com.findora.service.ClaimCreationService;
import com.findora.service.MatchService;

/**
 * ClaimController - Claim management endpoints.
 */
@RestController
@RequestMapping("/api/claims")
public class ClaimController {

    private static final Logger log = LoggerFactory.getLogger(ClaimController.class);
    private static final double STRONG_THRESHOLD_PERCENT = 80.0;
    private static final double POSSIBLE_THRESHOLD_PERCENT = 60.0;
    private static final Pattern NIC_PATTERN = Pattern.compile("^(?:\\d{9}[VvXx]|\\d{12})$");

    private static final Collection<Claim.ClaimStatus> OPEN_STATUSES = List.of(
        Claim.ClaimStatus.PENDING,
        Claim.ClaimStatus.APPROVED
    );

    private final ClaimRepository claimRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final ClaimCreationService claimCreationService;
    private final MatchService matchService;

    public ClaimController(
            ClaimRepository claimRepository,
            ItemRepository itemRepository,
            UserRepository userRepository,
            ClaimCreationService claimCreationService,
            MatchService matchService) {
        this.claimRepository = claimRepository;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.claimCreationService = claimCreationService;
        this.matchService = matchService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF')")
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

            boolean immediateIdMatch = validateCategorySpecificCredentials(claimData, item);
            Item claimProfile = buildClaimProfile(claimData, item);
            double score = immediateIdMatch ? 100.0 : matchService.computeScore(claimProfile, item);

            if (score < POSSIBLE_THRESHOLD_PERCENT) {
                throw new IllegalArgumentException("Claim details do not match this item closely enough");
            }

            LocalDateTime now = LocalDateTime.now();
            String claimMode;
            if (immediateIdMatch) {
                claimMode = "immediate";
            } else if (score >= STRONG_THRESHOLD_PERCENT) {
                LocalDateTime availableAt = Optional.ofNullable(item.getCreatedAt()).orElse(now).plusDays(1);
                if (availableAt.isAfter(now)) {
                    throw new IllegalArgumentException(
                        "This claim is a strong match, but it becomes available 1 day after the item was posted");
                }
                claimMode = "after_waiting_period";
            } else {
                throw new IllegalArgumentException(
                    "Possible match detected (60-79%). OTP is not issued at this stage.");
            }

            Claim claim = claimCreationService.createClaimForItem(itemId, currentUserId);

            Map<String, Object> claimPayload = new LinkedHashMap<>();
            claimPayload.put("id", claim.getId());
            claimPayload.put("item_id", claim.getItemId());
            claimPayload.put("claimer_id", claim.getClaimerId());
            claimPayload.put("otp", claim.getOtp());
            claimPayload.put("otp_expiry", claim.getOtpExpiry() != null ? claim.getOtpExpiry().toString() : null);
            claimPayload.put("status", claim.getStatus().name().toLowerCase());
            claimPayload.put("claimed_at", claim.getClaimedAt());
            claimPayload.put("claim_mode", claimMode);
            claimPayload.put("match_score", Math.round(score * 100.0) / 100.0);

            log.info("claim created itemId={} claimerId={} claimId={} score={} mode={}",
                itemId, currentUserId, claim.getId(), score, claimMode);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "success", true,
                "message", "Claim submitted successfully. OTP sent.",
                "otp", claim.getOtp(),
                "claim", claimPayload
            ));
        } catch (IllegalArgumentException e) {
            log.info("generic claim creation rejected reason={}", e.getMessage());
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

    private boolean validateCategorySpecificCredentials(Map<String, Object> claimData, Item item) {
        ItemCategory category = item.getCategory();
        if (category == null) {
            return false;
        }

        return switch (category) {
            case NIC -> validateNic(claimData, item);
            case STUDENT_ID, BANK_CARD -> validateIdNumber(claimData, item);
            case WALLET -> validateWalletIdentity(claimData, item);
            default -> false;
        };
    }

    private boolean validateNic(Map<String, Object> claimData, Item item) {
        String rawNic = stringValue(claimData.get("nicNumber"));
        if (rawNic.isBlank()) {
            throw new IllegalArgumentException("nicNumber is required for NIC claims");
        }

        String normalizedNic = normalizeNic(rawNic);
        if (!NIC_PATTERN.matcher(normalizedNic).matches()) {
            throw new IllegalArgumentException("NIC must be in 9-digit + V/X or 12-digit format");
        }

        if (!itemContainsNormalizedValue(item, normalizedNic)) {
            throw new IllegalArgumentException("Entered NIC number does not match this item");
        }
        return true;
    }

    private boolean validateIdNumber(Map<String, Object> claimData, Item item) {
        String rawId = stringValue(claimData.get("idNumber"));
        if (rawId.isBlank()) {
            throw new IllegalArgumentException("idNumber is required for this claim");
        }

        String normalized = normalizeGeneralId(rawId);
        if (!itemContainsNormalizedValue(item, normalized)) {
            throw new IllegalArgumentException("Entered ID number does not match this item");
        }
        return true;
    }

    private boolean validateWalletIdentity(Map<String, Object> claimData, Item item) {
        String claimType = stringValue(claimData.get("claimType")).toLowerCase(Locale.ROOT);
        if (!"with-id".equals(claimType)) {
            return false;
        }

        String rawId = stringValue(claimData.get("idNumber"));
        if (rawId.isBlank()) {
            throw new IllegalArgumentException("idNumber is required when claimType is with-id");
        }

        String normalized = normalizeGeneralId(rawId);
        if (!itemContainsNormalizedValue(item, normalized)) {
            throw new IllegalArgumentException("Entered ID number does not match this item");
        }
        return true;
    }

    private Item buildClaimProfile(Map<String, Object> claimData, Item foundItem) {
        Item claimProfile = new Item();
        claimProfile.setType(ItemType.LOST);
        claimProfile.setCategory(foundItem.getCategory());
        claimProfile.setItemName(stringValue(claimData.get("itemName")));

        String description = String.join(" ",
            stringValue(claimData.get("claimType")),
            stringValue(claimData.get("idNumber")),
            stringValue(claimData.get("nicNumber")),
            stringValue(claimData.get("items1")),
            stringValue(claimData.get("items2")),
            stringValue(claimData.get("items3")),
            stringValue(claimData.get("additionalDetails"))
        ).trim();
        claimProfile.setDescription(description);

        String location = String.join(" ",
            stringValue(claimData.get("location1")),
            stringValue(claimData.get("location2")),
            stringValue(claimData.get("location3"))
        ).trim();
        claimProfile.setLocation(location);

        claimProfile.setDate(parseDateOrDefault(claimData.get("foundFromDate"), foundItem.getDate()));
        return claimProfile;
    }

    private java.time.LocalDate parseDateOrDefault(Object dateRaw, java.time.LocalDate fallback) {
        if (dateRaw == null) {
            return fallback;
        }

        try {
            return java.time.LocalDate.parse(String.valueOf(dateRaw));
        } catch (DateTimeParseException e) {
            return fallback;
        }
    }

    private String normalizeNic(String value) {
        return value == null ? "" : value.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
    }

    private String normalizeGeneralId(String value) {
        return value == null ? "" : value.replaceAll("[\\s-]+", "").toUpperCase(Locale.ROOT);
    }

    private boolean itemContainsNormalizedValue(Item item, String normalizedValue) {
        String corpus = (stringValue(item.getItemName()) + " " + stringValue(item.getDescription()));
        String normalizedCorpus = normalizeGeneralId(corpus);
        return !normalizedValue.isBlank() && normalizedCorpus.contains(normalizeGeneralId(normalizedValue));
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }
}
