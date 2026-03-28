package com.findora.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.findora.dto.ItemDTO;
import com.findora.dto.PaginatedResponse;
import com.findora.model.Item;
import com.findora.model.ItemCategory;
import com.findora.model.ItemStatus;
import com.findora.model.ItemType;
import com.findora.repository.ItemRepository;
import com.findora.repository.UserRepository;
import com.findora.service.ItemService;

/**
 * ItemController - REST endpoints for items (lost/found).
 * 
 * CRITICAL: All responses must match Node API contract exactly for frontend compatibility.
 * Field names in JSON responses are case-sensitive and must match frontend expectations.
 */
@RestController
@RequestMapping("/api/items")
@SuppressWarnings("null")
public class ItemController {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("uuuu-MM-dd").withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm").withResolverStyle(ResolverStyle.STRICT);

    private final ItemService itemService;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private static final Logger log = LoggerFactory.getLogger(ItemController.class);
    private static final Pattern CARD_NUMBER_PATTERN = Pattern.compile("^\\d{16}$");

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public ItemController(ItemService itemService, ItemRepository itemRepository, UserRepository userRepository) {
        this.itemService = itemService;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
    }

    /**
     * GET /api/items - Get paginated items with optional filters.
     * 
     * Query params:
     * - page: 0-based page number (default: 0)
     * - size: items per page, 1-100 (default: 10)
     * - sort: "field,direction" e.g., "createdAt,desc" (default: "createdAt,desc")
     * - category: optional, e.g., "Wallet", "NIC"
     * - keyword: optional, search in name and description
     * - type: optional, "lost" or "found"
     * - status: optional, "active", "claimed", "closed"
     *
     * Response: matches Node API shape exactly
     * {
     *   "content": [ item DTOs ],
     *   "pageNumber": 0,
     *   "pageSize": 10,
     *   "totalPages": 5,
     *   "totalElements": 123
     * }
     *
     * Error (HTTP 400): { "success": false, "message": "..." }
     * Error (HTTP 500): { "success": false, "message": "Server error" }
     */
    @GetMapping
    public ResponseEntity<?> getAllItems(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {

        try {
            log.debug("GET /api/items: page={}, size={}, category={}, keyword={}", page, size, category, keyword);

            // Call service with validation
            PaginatedResponse<ItemDTO> response = itemService.getPaginatedItems(
                page, size, sort, category, keyword, type, status
            );

            return ResponseEntity.ok(toFrontendListResponse(response));

        } catch (IllegalArgumentException e) {
            log.warn("Invalid pagination params: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                Map.of("success", false, "message", e.getMessage())
            );
        } catch (Exception e) {
            log.error("Error fetching paginated items", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    /**
     * GET /api/items/:id - Get single item by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getItem(@PathVariable Long id) {
        try {
            Optional<ItemDTO> item = itemService.getItemById(id);

            if (item.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", "Item not found"));
            }

            return ResponseEntity.ok(Map.of("success", true, "item", item.get()));

        } catch (Exception e) {
            log.error("Error fetching item {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    /**
     * GET /api/items/my/items - Get current user's items with pagination.
     */
    @GetMapping("/my/items")
    public ResponseEntity<?> getMyItems(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword) {

        try {
            Long userId = getCurrentUserId();

            PaginatedResponse<ItemDTO> response = itemService.getUserItems(userId, page, size, type, status, category, keyword);

            return ResponseEntity.ok(toFrontendListResponse(response));

        } catch (Exception e) {
            log.error("Error fetching user items", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    /**
     * POST /api/items - Create new lost/found item.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createItem(
            @RequestParam("type") String type,
            @RequestParam("category") String category,
            @RequestParam("item_name") String itemName,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "private_card_number", required = false) String privateCardNumber,
            @RequestParam("location") String location,
            @RequestParam("date") String date,
            @RequestParam("time") String time,
            @RequestParam(value = "image", required = false) MultipartFile image) {
        try {
            Long userId = getCurrentUserId();

            Item item = new Item();
            item.setUserId(userId);
            item.setType(ItemType.valueOf(type.trim().toUpperCase(Locale.ROOT)));
            item.setCategory(parseCategory(category));
            item.setItemName(itemName.trim());

            String finalDescription = description;
            if (item.getCategory() == ItemCategory.BANK_CARD) {
                String normalizedCardNumber = privateCardNumber == null ? "" : privateCardNumber.replaceAll("\\s+", "");
                if (!CARD_NUMBER_PATTERN.matcher(normalizedCardNumber).matches()) {
                    throw new IllegalArgumentException("Full 16-digit card number is required for Bank Card posts");
                }
                finalDescription = appendPrivateCardMarker(description, normalizedCardNumber);
            }

            item.setDescription(finalDescription);
            item.setLocation(location.trim());
            item.setDate(parseAndValidateDate(date));
            item.setTime(parseAndValidateTime(time));
            item.setStatus(ItemStatus.ACTIVE);

            if (image != null && !image.isEmpty()) {
                String savedImageUrl = saveImage(image);
                item.setImageUrl(savedImageUrl);
                log.info("Image saved for item: {}", savedImageUrl);
            }

            Item saved = itemService.createItem(item);
            Optional<ItemDTO> savedDto = itemService.getItemById(saved.getId());

            if (savedDto.isPresent()) {
                log.info("Item created with ID: {}, image_url: {}", saved.getId(), savedDto.get().getImageUrl());
            }

            return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                    "success", true,
                    "message", "Item reported successfully",
                    "item", savedDto.orElse(null)
                ));
        } catch (IllegalArgumentException | IllegalStateException | IOException e) {
            log.error("Error creating item", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    private ItemCategory parseCategory(String rawCategory) {
        String normalized = rawCategory.trim().toUpperCase(Locale.ROOT).replace(" ", "_");
        return ItemCategory.valueOf(normalized);
    }

    private LocalDate parseAndValidateDate(String rawDate) {
        try {
            LocalDate parsedDate = LocalDate.parse(rawDate.trim(), DATE_FORMATTER);
            if (parsedDate.isAfter(LocalDate.now())) {
                throw new IllegalArgumentException("Invalid date. Please select today or a past date.");
            }
            return parsedDate;
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Invalid date. Please select today or a past date.");
        }
    }

    private LocalTime parseAndValidateTime(String rawTime) {
        try {
            return LocalTime.parse(rawTime.trim(), TIME_FORMATTER);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Invalid time. Please enter a valid time in HH:MM format");
        }
    }

    private String saveImage(MultipartFile image) throws IOException {
        String original = image.getOriginalFilename();
        String extension = "";
        if (original != null && StringUtils.hasText(original) && original.contains(".")) {
            extension = original.substring(original.lastIndexOf('.'));
        }

        String storedName = UUID.randomUUID() + extension;
        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);
        Files.copy(image.getInputStream(), uploadPath.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);

        String normalizedUploadDir = uploadDir.replace("\\", "/").replaceAll("/+$", "");
        return normalizedUploadDir + "/" + storedName;
    }

    private String appendPrivateCardMarker(String description, String cardNumber) {
        String base = description == null ? "" : description.trim();
        if (base.isEmpty()) {
            return "__PRIVATE_CARD__=" + cardNumber;
        }
        return base + "\n__PRIVATE_CARD__=" + cardNumber;
    }

    /**
     * PUT /api/items/:id/status - Update item status (admin only).
     * Allows admin to update item status to CLOSED (hidden from public view).
     */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateItemStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> statusUpdate) {
        try {
            Item item = itemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Item not found"));

            String newStatus = statusUpdate.get("status");
            if (newStatus == null || newStatus.isBlank()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "status is required"));
            }

            try {
                ItemStatus status = ItemStatus.valueOf(newStatus.toUpperCase());
                item.setStatus(status);
                itemRepository.save(item);
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Item status updated successfully",
                    "item", toItemPayload(item)
                ));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Invalid status value"));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * DELETE /api/items/:id - Delete item.
     * Requires authorization to delete item.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteItem(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement item deletion"));
    }

    /**
     * Get current authenticated user's ID from SecurityContext.
     */
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

    private Map<String, Object> toItemPayload(Item item) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", item.getId());
        payload.put("user_id", item.getUserId());
        payload.put("type", item.getType() == null ? null : item.getType().name().toLowerCase());
        payload.put("category", item.getCategory() == null ? null : item.getCategory().name().toLowerCase().replace("_", " "));
        payload.put("item_name", item.getItemName());
        payload.put("description", item.getDescription());
        payload.put("location", item.getLocation());
        payload.put("date", item.getDate() == null ? null : item.getDate().toString());
        payload.put("time", item.getTime() == null ? null : item.getTime().toString());
        payload.put("image_url", item.getImageUrl());
        payload.put("status", item.getStatus() == null ? null : item.getStatus().name().toLowerCase());
        payload.put("created_at", item.getCreatedAt() == null ? null : item.getCreatedAt().toString());
        payload.put("updated_at", item.getUpdatedAt() == null ? null : item.getUpdatedAt().toString());
        return payload;
    }

    private Map<String, Object> toFrontendListResponse(PaginatedResponse<ItemDTO> response) {
        List<ItemDTO> items = response.getContent();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("count", response.getTotalElements());

        // Keep current response contract too, so existing consumers remain unaffected.
        body.put("content", items);
        body.put("pageNumber", response.getPageNumber());
        body.put("pageSize", response.getPageSize());
        body.put("totalPages", response.getTotalPages());
        body.put("totalElements", response.getTotalElements());
        return body;
    }
}
