package com.findora.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
import com.findora.repository.ClaimRepository;
import com.findora.repository.ItemRepository;
import com.findora.repository.UserRepository;
import com.findora.service.ClaimCreationService;
import com.findora.service.MatchService;
import com.findora.util.NicUtils;

/**
 * ClaimController - Claim management endpoints (TODO: Full implementation).
 */
@RestController
@RequestMapping("/api/claims")
public class ClaimController {

    private static final Pattern ID_PATTERN = Pattern.compile("\\b[A-Z]{2,4}[- ]?\\d{4,10}\\b");

    private static final Collection<Claim.ClaimStatus> OPEN_STATUSES = List.of(
        Claim.ClaimStatus.PENDING,
        Claim.ClaimStatus.APPROVED
    );
    private static final double STRONG_MATCH_PERCENT = 80.0;

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
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF', 'SECURITY', 'ADMIN')")
    public ResponseEntity<?> createClaim(@RequestBody Map<String, Object> claimData) {
        try {
            String itemIdRaw = claimData != null
                ? String.valueOf(claimData.getOrDefault("item_id", claimData.get("itemId")))
                : null;

            if (itemIdRaw == null || itemIdRaw.isBlank() || "null".equalsIgnoreCase(itemIdRaw)) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "item_id is required"
                ));
            }

            Long itemId = Long.valueOf(itemIdRaw);
            Long currentUserId = getCurrentUserId();

            Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Item not found"));

            ClaimAssessment assessment = validateClaimRequest(claimData, item);

            Claim claim = claimCreationService.createClaimForItem(itemId, currentUserId);
            String otp = claim.getOtp();

            Map<String, Object> claimPayload = new LinkedHashMap<>();
            claimPayload.put("id", claim.getId());
            claimPayload.put("item_id", claim.getItemId());
            claimPayload.put("otp", claim.getOtp());
            claimPayload.put("otp_expiry", claim.getOtpExpiry());
            claimPayload.put("status", claim.getStatus().name().toLowerCase());
            claimPayload.put("claimed_at", claim.getClaimedAt());
            claimPayload.put("match_score", assessment.score());
            claimPayload.put("claim_mode", assessment.immediate() ? "immediate" : "after_waiting_period");

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "success", true,
                "message", assessment.immediate()
                    ? "Claim submitted successfully"
                    : "Claim submitted successfully after waiting-period validation",
                "otp", otp,
                "claim", claimPayload
            ));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid item_id"
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

    private ClaimAssessment validateClaimRequest(Map<String, Object> claimData, Item item) {
        if (item.getCategory() == null) {
            return new ClaimAssessment(100.0, true);
        }

        boolean exactIdentifierMatch = false;

        switch (item.getCategory()) {
            case NIC -> {
                validateNicClaim(claimData, item);
                exactIdentifierMatch = true;
            }
            case STUDENT_ID -> {
                validateStoredIdentifierClaim(claimData, item, "idNumber is required for ID claims");
                exactIdentifierMatch = true;
            }
            case WALLET -> exactIdentifierMatch = validateWalletClaim(claimData, item);
            case BANK_CARD, OTHER -> validateLocationClaim(claimData);
            default -> {
            }
        }

        Item claimItem = buildClaimAssessmentItem(claimData, item);
        double score = round(matchService.computeScore(claimItem, item));

        if (exactIdentifierMatch || score >= 100.0) {
            return new ClaimAssessment(score, true);
        }

        if (score < STRONG_MATCH_PERCENT) {
            throw new IllegalArgumentException("Claim details do not match this item closely enough");
        }

        if (!hasWaitedOneDay(item)) {
            throw new IllegalArgumentException("This claim is a strong match, but it becomes available 1 day after the item was posted");
        }

        return new ClaimAssessment(score, false);
    }

    private void validateNicClaim(Map<String, Object> claimData, Item item) {
        String nicNumber = claimData != null && claimData.get("nicNumber") != null
            ? String.valueOf(claimData.get("nicNumber"))
            : null;
        String normalizedNic = NicUtils.normalize(nicNumber);

        if (normalizedNic.isBlank()) {
            throw new IllegalArgumentException("nicNumber is required for NIC claims");
        }

        if (!NicUtils.isValid(normalizedNic)) {
            throw new IllegalArgumentException("NIC must be in 9-digit + V/X or 12-digit format");
        }

        String storedNic = NicUtils.extractFromText(item.getDescription())
            .or(() -> NicUtils.extractFromText(item.getItemName()))
            .orElseThrow(() -> new IllegalArgumentException("This NIC item does not have a valid NIC number recorded"));

        if (!storedNic.equals(normalizedNic)) {
            throw new IllegalArgumentException("Entered NIC number does not match this item");
        }
    }

    private void validateStoredIdentifierClaim(Map<String, Object> claimData, Item item, String missingMessage) {
        String idNumber = readFirst(claimData, "idNumber", "nicNumber");
        String normalizedIdentifier = normalizeIdentifier(idNumber);

        if (normalizedIdentifier.isBlank()) {
            throw new IllegalArgumentException(missingMessage);
        }

        Set<String> storedIdentifiers = extractIdentifiers(item);
        if (storedIdentifiers.isEmpty()) {
            throw new IllegalArgumentException("This item does not have a recorded identifier for verification");
        }

        if (!storedIdentifiers.contains(normalizedIdentifier)) {
            throw new IllegalArgumentException("Entered ID number does not match this item");
        }
    }

    private boolean validateWalletClaim(Map<String, Object> claimData, Item item) {
        String claimType = readFirst(claimData, "claimType").toLowerCase(Locale.ROOT);
        if ("with-id".equals(claimType)) {
            validateStoredIdentifierClaim(claimData, item, "idNumber is required for wallet claims with ID");
            return true;
        }

        String claimedItems = joinClaimFields(claimData, "items1", "items2", "items3");
        if (claimedItems.isBlank()) {
            throw new IllegalArgumentException("At least one item inside the wallet is required");
        }

        validateLocationClaim(claimData);
        return false;
    }

    private void validateLocationClaim(Map<String, Object> claimData) {
        String claimedLocation = joinClaimFields(claimData, "location1", "location2", "location3");
        if (claimedLocation.isBlank()) {
            throw new IllegalArgumentException("Location details are required");
        }

        validateTimeFields(claimData);
    }

    private void validateTimeFields(Map<String, Object> claimData) {
        String fromTime = readFirst(claimData, "fromTime");
        String toTime = readFirst(claimData, "toTime");

        if (fromTime.isBlank() || toTime.isBlank()) {
            return;
        }

        try {
            LocalTime from = LocalTime.parse(fromTime);
            LocalTime to = LocalTime.parse(toTime);
            if (to.isBefore(from)) {
                throw new IllegalArgumentException("To time must be after from time");
            }
        } catch (IllegalArgumentException ex) {
            if ("To time must be after from time".equals(ex.getMessage())) {
                throw ex;
            }
            throw new IllegalArgumentException("Invalid time range");
        }
    }

    private String joinClaimFields(Map<String, Object> claimData, String... keys) {
        StringBuilder builder = new StringBuilder();
        for (String key : keys) {
            String value = readFirst(claimData, key);
            if (!value.isBlank()) {
                if (builder.length() > 0) {
                    builder.append(' ');
                }
                builder.append(value);
            }
        }
        return builder.toString().trim();
    }

    private String readFirst(Map<String, Object> claimData, String... keys) {
        if (claimData == null) {
            return "";
        }

        for (String key : keys) {
            Object value = claimData.get(key);
            if (value != null) {
                String asString = String.valueOf(value).trim();
                if (!asString.isBlank() && !"null".equalsIgnoreCase(asString)) {
                    return asString;
                }
            }
        }

        return "";
    }

    private Item buildClaimAssessmentItem(Map<String, Object> claimData, Item item) {
        Item claimItem = new Item();
        claimItem.setCategory(item.getCategory());
        claimItem.setItemName(safeText(item.getItemName()));
        claimItem.setDescription(buildClaimDescription(claimData, item.getCategory()));
        claimItem.setLocation(joinClaimFields(claimData, "location1", "location2", "location3"));
        claimItem.setDate(resolveClaimDate(claimData, item));
        return claimItem;
    }

    private LocalDate resolveClaimDate(Map<String, Object> claimData, Item item) {
        String fromDateStr = readFirst(claimData, "foundFromDate");
        String toDateStr = readFirst(claimData, "foundToDate");
        if (!fromDateStr.isBlank()) {
            try {
                LocalDate fromDate = LocalDate.parse(fromDateStr);
                if (!toDateStr.isBlank()) {
                    LocalDate toDate = LocalDate.parse(toDateStr);
                    long midEpoch = (fromDate.toEpochDay() + toDate.toEpochDay()) / 2;
                    return LocalDate.ofEpochDay(midEpoch);
                }
                return fromDate;
            } catch (Exception ignored) {
                // fall through to use item date
            }
        }
        return item.getDate();
    }

    private String buildClaimDescription(Map<String, Object> claimData, ItemCategory category) {
        return switch (category) {
            case NIC -> readFirst(claimData, "nicNumber");
            case STUDENT_ID -> readFirst(claimData, "idNumber");
            case WALLET -> buildWalletClaimDescription(claimData);
            case BANK_CARD -> joinNonBlank("bank card", readFirst(claimData, "cvv"));
            case OTHER -> joinNonBlank(readFirst(claimData, "location1"), readFirst(claimData, "location2"), readFirst(claimData, "location3"));
        };
    }

    private String buildWalletClaimDescription(Map<String, Object> claimData) {
        String claimType = readFirst(claimData, "claimType").toLowerCase(Locale.ROOT);
        if ("with-id".equals(claimType)) {
            return readFirst(claimData, "idNumber", "nicNumber");
        }
        return joinNonBlank("items inside", joinClaimFields(claimData, "items1", "items2", "items3"));
    }

    private String joinNonBlank(String... values) {
        StringBuilder builder = new StringBuilder();
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                if (builder.length() > 0) {
                    builder.append(' ');
                }
                builder.append(value.trim());
            }
        }
        return builder.toString();
    }

    private boolean hasWaitedOneDay(Item item) {
        LocalDateTime postedAt = item.getCreatedAt() != null
            ? item.getCreatedAt()
            : item.getDate() != null ? item.getDate().atStartOfDay() : LocalDateTime.now(ZoneOffset.UTC);
        return !postedAt.plusDays(1).isAfter(LocalDateTime.now(ZoneOffset.UTC));
    }

    private Set<String> extractIdentifiers(Item item) {
        Set<String> identifiers = new HashSet<>();
        String searchable = (safeText(item.getItemName()) + " " + safeText(item.getDescription())).toUpperCase(Locale.ROOT);

        NicUtils.extractFromText(searchable).ifPresent(identifiers::add);

        Matcher matcher = ID_PATTERN.matcher(searchable);
        while (matcher.find()) {
            identifiers.add(normalizeIdentifier(matcher.group()));
        }

        return identifiers;
    }

    private String normalizeIdentifier(String value) {
        String normalized = safeText(value).toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        if (NicUtils.isValid(normalized)) {
            return NicUtils.normalize(normalized);
        }
        return normalized;
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record ClaimAssessment(double score, boolean immediate) {
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF', 'SECURITY', 'ADMIN')")
    public ResponseEntity<?> getMyClaims(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        try {
            Long currentUserId = getCurrentUserId();
            Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "claimedAt"));

            List<Map<String, Object>> claims = claimRepository.findByClaimerId(currentUserId, pageable)
                .getContent()
                .stream()
                .map(claim -> {
                    Item item = itemRepository.findById(claim.getItemId()).orElse(null);

                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", claim.getId());
                    row.put("item_id", claim.getItemId());
                    row.put("item_name", item != null ? item.getItemName() : "Unknown Item");
                    row.put("category", item != null && item.getCategory() != null ? item.getCategory().name() : null);
                    row.put("image_url", item != null ? item.getImageUrl() : null);
                    row.put("status", claim.getStatus() != null ? claim.getStatus().name().toLowerCase() : null);
                    row.put("otp", claim.getOtp());
                    row.put("otp_expiry", claim.getOtpExpiry());
                    row.put("claimed_at", claim.getClaimedAt());
                    row.put("collected_at", claim.getCollectedAt());
                    return row;
                })
                .toList();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "claims", claims,
                "count", claims.size()
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
