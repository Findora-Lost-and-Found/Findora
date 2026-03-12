package com.findora.service;

import com.findora.dto.ItemDTO;
import com.findora.dto.PaginatedResponse;
import com.findora.model.Item;
import com.findora.model.ItemCategory;
import com.findora.model.ItemStatus;
import com.findora.model.ItemType;
import com.findora.repository.ItemRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * ItemService - Business logic for items (lost/found).
 * Handles pagination, filtering, and item management.
 */
@Service
@Transactional(readOnly = true)
public class ItemService {

    private final ItemRepository itemRepository;
    private static final Logger log = LoggerFactory.getLogger(ItemService.class);
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;

    public ItemService(ItemRepository itemRepository) {
        this.itemRepository = itemRepository;
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
        Page<Item> itemPage = itemRepository.findPaginatedItems(
            itemCategory,
            keyword,
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
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Invalid page or size");
        }

        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Item> itemPage = itemRepository.findByUserId(userId, pageable);

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
        return new ItemDTO(
            item.getId(),
            item.getItemName(),
            toApiCategory(item.getCategory()),
            item.getDescription(),
            item.getLocation(),
            item.getStatus() != null ? item.getStatus().toString().toLowerCase() : null,
            item.getImageUrl(),
            item.getCreatedAt() != null ? item.getCreatedAt().format(ISO_FORMATTER) : null
        );
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
