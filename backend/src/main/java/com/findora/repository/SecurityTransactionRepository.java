package com.findora.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.findora.model.SecurityTransaction;

/**
 * SecurityTransactionRepository - Data access for SecurityTransaction entity.
 */
@Repository
public interface SecurityTransactionRepository extends JpaRepository<SecurityTransaction, Long> {
    Page<SecurityTransaction> findBySecurityOfficerId(Long officerId, Pageable pageable);
    Page<SecurityTransaction> findByTransactionType(SecurityTransaction.TransactionType type, Pageable pageable);
    Optional<SecurityTransaction> findFirstByItemIdOrderByCreatedAtDesc(Long itemId);

    @Query("SELECT st FROM SecurityTransaction st WHERE st.status = :status ORDER BY st.createdAt DESC")
    List<SecurityTransaction> findByStatusOrderByCreatedAtDesc(@Param("status") SecurityTransaction.TransactionStatus status);
}
