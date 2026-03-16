package com.findora.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.findora.model.Item;
import com.findora.model.ItemCategory;
import com.findora.model.ItemStatus;
import com.findora.model.ItemType;

/**
 * ItemRepository - Data access for Item entity.
 * Supports paginated queries and filtering for lost/found items.
 */
@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {

    /**
     * Find paginated items with optional filtering by category, keyword, type, status.
     * Uses Spring Data JPA Page for offset pagination: (page-1) * size offset.
     * 
     * @param category Optional category filter
     * @param keyword Optional keyword search (searches itemName and description)
     * @param type Optional type (LOST or FOUND)
     * @param status Optional status (ACTIVE, CLAIMED, CLOSED)
     * @param pageable Page info (page 0-based, size, Sort)
     * @return Page with content, totalPages, totalElements
     */
    @Query("SELECT i FROM Item i WHERE " +
           "(:category IS NULL OR i.category = :category) AND " +
           "(:keyword IS NULL OR LOWER(i.itemName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(i.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:type IS NULL OR i.type = :type) AND " +
           "(:status IS NULL OR i.status = :status)")
    Page<Item> findPaginatedItems(@Param("category") ItemCategory category,
                                  @Param("keyword") String keyword,
                                  @Param("type") ItemType type,
                                  @Param("status") ItemStatus status,
                                  Pageable pageable);

    /**
     * Find items by type with active status (common query for matching).
     */
    List<Item> findByTypeAndStatus(ItemType type, ItemStatus status);

    /**
     * Find items by user and optional type filter.
     */
    Page<Item> findByUserId(Long userId, Pageable pageable);

    @Query("SELECT i FROM Item i WHERE i.userId = :userId AND " +
           "(:type IS NULL OR i.type = :type) AND " +
           "(:status IS NULL OR i.status = :status)")
    Page<Item> findUserItemsFiltered(@Param("userId") Long userId,
                                     @Param("type") ItemType type,
                                     @Param("status") ItemStatus status,
                                     Pageable pageable);

    Optional<Item> findByIdAndUserId(Long id, Long userId);
}
