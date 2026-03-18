package com.findora.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.findora.model.Claim;

/**
 * ClaimRepository - Data access for Claim entity.
 */
@Repository
public interface ClaimRepository extends JpaRepository<Claim, Long> {
    Page<Claim> findByClaimerId(Long claimerId, Pageable pageable);
    Page<Claim> findByStatus(Claim.ClaimStatus status, Pageable pageable);
    List<Claim> findByStatusInOrderByClaimedAtDesc(Collection<Claim.ClaimStatus> statuses);
    Optional<Claim> findFirstByItemIdAndClaimerIdAndStatusInOrderByClaimedAtDesc(Long itemId, Long claimerId, Collection<Claim.ClaimStatus> statuses);
    Optional<Claim> findByIdAndClaimerId(Long id, Long claimerId);
    List<Claim> findByItemId(Long itemId);
    List<Claim> findByItemIdAndClaimerId(Long itemId, Long claimerId);
}
