package com.findora.repository;

import com.findora.model.Claim;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * ClaimRepository - Data access for Claim entity.
 */
@Repository
public interface ClaimRepository extends JpaRepository<Claim, Long> {
    Page<Claim> findByClaimerId(Long claimerId, Pageable pageable);
    Page<Claim> findByStatus(Claim.ClaimStatus status, Pageable pageable);
    Optional<Claim> findByIdAndClaimerId(Long id, Long claimerId);
    List<Claim> findByItemId(Long itemId);
}
