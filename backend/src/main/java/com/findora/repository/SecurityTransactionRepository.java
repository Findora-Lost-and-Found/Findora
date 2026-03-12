package com.findora.repository;

import com.findora.model.SecurityTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * SecurityTransactionRepository - Data access for SecurityTransaction entity.
 */
@Repository
public interface SecurityTransactionRepository extends JpaRepository<SecurityTransaction, Long> {
    Page<SecurityTransaction> findBySecurityOfficerId(Long officerId, Pageable pageable);
    Page<SecurityTransaction> findByTransactionType(SecurityTransaction.TransactionType type, Pageable pageable);
}
