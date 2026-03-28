package com.findora.service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.findora.dto.ItemDTO;
import com.findora.dto.PaginatedResponse;
import com.findora.model.Item;
import com.findora.model.ItemCategory;
import com.findora.model.ItemStatus;
import com.findora.model.ItemType;
import com.findora.repository.ItemRepository;
import com.findora.repository.UserRepository;
import com.findora.model.User;

/**
 * ItemService - Business logic for items (lost/found).
 * Handles pagination, filtering, and item management.
 */
@Service
@Transactional(readOnly = true)
public class ItemService {

    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private static final Logger log = LoggerFactory.getLogger(ItemService.class);
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final Pattern PRIVATE_BANK_MARKER_PATTERN =
        Pattern.compile("\\n?__PRIVATE_(?:CVV|CARD)__=\\d{3,16}");
    private static final Pattern WHITESPACE_PATTERN = Pattern.compile("\\s+");

    public ItemService(ItemRepository itemRepository, UserRepository userRepository) {
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
    }

    /**
     * Get paginated items with optional filters.
     * Query params: page (0-based), size (1-100), sort (e.g., "createdAt,desc"),
     * category, keyword, type, status.
     *
     * Returns JSON exactly matching Node API shape:
     * { content, pageNumber, pageSize, totalPages, totalElements }
     *
     * @param page 0-based page number (default 0)
     * @param size items per page, clamped to 1-100 (default 10)
     * @param sortParam sort spec like "createdAt,desc" (default "createdAt,desc")
     * @param category optional category filter
     * @param keyword optional keyword search
     * @param type optional type (LOST or FOUND)
     * @param status optional status (ACTIVE, CLAIMED, CLOSED)
     * @return PaginatedResponse with items DTO
     * @throws IllegalArgumentException if page or size is invalid
     */
    public PaginatedResponse<ItemDTO> getPaginatedItems(
            int page,
            int size,
            String sortParam,
            String category,
            String keyword,
            String type,
            String status) {

        // Validation
        if (page < 0) {
            throw new IllegalArgumentException("Page must be >= 0");
        }
        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("Size must be between 1 and 100");
        }

        // Parse sort param (e.g., "createdAt,desc" -> Sort by createdAt DESC)
        Sort sort = parseSort(sortParam);

        // Create Pageable with 0-based index
        Pageable pageable = PageRequest.of(page, size, sort);

        // Parse filters
        ItemCategory itemCategory = null;
        if (category != null && !category.isEmpty()) {
            try {
                itemCategory = parseCategory(category);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid category filter: {}", category);
            }
        }

        ItemType itemType = null;
        if (type != null && !type.isEmpty()) {
            try {
                itemType = ItemType.valueOf(type.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid type filter: {}", type);
            }
        }

        ItemStatus itemStatus = null;
        if (status != null && !status.isEmpty()) {
            try {
                itemStatus = ItemStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status filter: {}", status);
            }
        }

        // Fetch paginated results from repository
        String normalizedKeyword = normalizeKeywordForLike(keyword);

        Page<Item> itemPage = itemRepository.findPaginatedItems(
            itemCategory,
            normalizedKeyword,
            itemType,
            itemStatus,
            pageable
        );

        // Convert items to DTOs
        List<ItemDTO> dtos = itemPage.getContent().stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());

        // Return paginated response with exact field names for frontend
        return new PaginatedResponse<>(
            dtos,
            page,
            size,
            itemPage.getTotalPages(),
            (int) itemPage.getTotalElements()
        );
    }

    /**
     * Get single item by ID as DTO.
     */
    public Optional<ItemDTO> getItemById(Long id) {
        return itemRepository.findById(id).map(this::convertToDTO);
    }

    /**
     * Get items by user ID with pagination.
     */
    public PaginatedResponse<ItemDTO> getUserItems(Long userId, int page, int size) {
        return getUserItems(userId, page, size, null, null, null, null);
    }

    /**
     * Get items by user ID with optional type/status filters.
     */
    public PaginatedResponse<ItemDTO> getUserItems(Long userId, int page, int size, String type, String status) {
        return getUserItems(userId, page, size, type, status, null, null);
    }

    /**
     * Get items by user ID with optional type/status/category/keyword filters.
     */
    public PaginatedResponse<ItemDTO> getUserItems(
            Long userId,
            int page,
            int size,
            String type,
            String status,
            String category,
            String keyword) {
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Invalid page or size");
        }

        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        Pageable pageable = PageRequest.of(page, size, sort);

        ItemType itemType = null;
        if (type != null && !type.isBlank()) {
            itemType = ItemType.valueOf(type.trim().toUpperCase());
        }

        ItemStatus itemStatus = null;
        if (status != null && !status.isBlank()) {
            itemStatus = ItemStatus.valueOf(status.trim().toUpperCase());
        }

        ItemCategory itemCategory = null;
        if (category != null && !category.isBlank()) {
            try {
                itemCategory = parseCategory(category);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid category filter for user items: {}", category);
            }
        }

        String normalizedKeyword = normalizeKeywordForLike(keyword);

        Page<Item> itemPage = itemRepository.findUserItemsFiltered(
            userId,
            itemType,
            itemStatus,
            itemCategory,
            normalizedKeyword,
            pageable
        );

        List<ItemDTO> dtos = itemPage.getContent().stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());

        return new PaginatedResponse<>(
            dtos,
            page,
            size,
            itemPage.getTotalPages(),
            (int) itemPage.getTotalElements()
        );
    }

    /**
     * Create new item.
     */
    @Transactional
    public Item createItem(Item item) {
        log.info("Creating item: {} for user: {}", item.getItemName(), item.getUserId());
        return itemRepository.save(item);
    }

    /**
     * Update item status.
     */
    @Transactional
    public void updateItemStatus(Long itemId, ItemStatus newStatus) {
        Item item = itemRepository.findById(itemId)
            .orElseThrow(() -> new IllegalArgumentException("Item not found"));
        item.setStatus(newStatus);
        itemRepository.save(item);
        log.info("Item {} status updated to {}", itemId, newStatus);
    }

    /**
     * Delete item.
     */
    @Transactional
    public void deleteItem(Long itemId) {
        itemRepository.deleteById(itemId);
        log.info("Item {} deleted", itemId);
    }

    /**
     * Convert Item entity to ItemDTO.
     * Field mapping:
     * - itemName -> name
     * - imageUrl already correct
     * - createdAt -> ISO 8601 string
     */
    private ItemDTO convertToDTO(Item item) {
        User owner = item.getUser();
        if (owner == null && item.getUserId() != null) {
            owner = userRepository.findById(item.getUserId()).orElse(null);
        }

        ItemDTO dto = new ItemDTO(
            item.getId(),
            item.getItemName(),
            toApiCategory(item.getCategory()),
            item.getType() != null ? item.getType().toString().toLowerCase() : null,
            sanitizeDescriptionForClient(item.getDescription()),
            item.getLocation(),
            item.getDate() != null ? item.getDate().format(DATE_FORMATTER) : null,
            item.getTime() != null ? item.getTime().format(TIME_FORMATTER) : null,
            item.getStatus() != null ? item.getStatus().toString().toLowerCase() : null,
            item.getImageUrl(),
            item.getCreatedAt() != null ? item.getCreatedAt().format(ISO_FORMATTER) : null,
            item.getUserId(),
            owner != null ? owner.getFullName() : null,
            owner != null ? owner.getUsername() : null
        );
        dto.setUserId(item.getUserId());
        return dto;
    }

    private String sanitizeDescriptionForClient(String rawDescription) {
        if (rawDescription == null || rawDescription.isBlank()) {
            return rawDescription;
        }

        String sanitized = PRIVATE_BANK_MARKER_PATTERN.matcher(rawDescription).replaceAll("").trim();
        return sanitized;
    }

    private ItemCategory parseCategory(String category) {
        String normalized = category.trim().toUpperCase().replace(" ", "_");
        return ItemCategory.valueOf(normalized);
    }

    private String toApiCategory(ItemCategory category) {
        if (category == null) {
            return null;
        }
        return switch (category) {
            case NIC -> "NIC";
            case STUDENT_ID -> "Student ID";
            case BANK_CARD -> "Bank Card";
            case WALLET -> "Wallet";
            case OTHER -> "Other";
        };
    }

    private String normalizeKeywordForLike(String keyword) {
        if (keyword == null) {
            return null;
        }

        String trimmed = keyword.trim();
        if (trimmed.isEmpty()) {
            return null;
        }

        // Convert multi-word input to SQL LIKE-friendly pattern, e.g. "blue backpack" -> "blue%backpack".
        return WHITESPACE_PATTERN.matcher(trimmed).replaceAll("%");
    }

    /**
     * Parse sort parameter (e.g., "createdAt,desc" or "name,asc").
     * Defaults to created_at DESC if invalid.
     */
    private Sort parseSort(String sortParam) {
        if (sortParam == null || sortParam.isEmpty()) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }

        String[] parts = sortParam.split(",");
        if (parts.length != 2) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }

        String field = parts[0].trim();
        String direction = parts[1].trim().toUpperCase();

        // Map camelCase frontend names to entity field names
        String sortField = switch (field) {
            case "createdAt" -> "createdAt";
            case "itemName", "name" -> "itemName";
            case "category" -> "category";
            case "date" -> "date";
            default -> "createdAt";
        };

        Sort.Direction sortDir = "ASC".equals(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(sortDir, sortField);
    }

    /**
     * Get items by type and status (for matching algorithm).
     */
    public List<Item> getItemsByTypeAndStatus(ItemType type, ItemStatus status) {
        return itemRepository.findByTypeAndStatus(type, status);
    }
}
