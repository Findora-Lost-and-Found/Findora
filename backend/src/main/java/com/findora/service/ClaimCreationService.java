package com.findora.service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.findora.model.Claim;
import com.findora.model.Item;
import com.findora.model.ItemType;
import com.findora.repository.ClaimRepository;
import com.findora.repository.ItemRepository;

/**
 * Reusable claim creation service that preserves existing ClaimController behavior.
 */
@Service
public class ClaimCreationService {

    private static final Collection<Claim.ClaimStatus> OPEN_STATUSES = List.of(
        Claim.ClaimStatus.PENDING,
        Claim.ClaimStatus.APPROVED
    );

    private final ClaimRepository claimRepository;
    private final ItemRepository itemRepository;

    public ClaimCreationService(ClaimRepository claimRepository, ItemRepository itemRepository) {
        this.claimRepository = claimRepository;
        this.itemRepository = itemRepository;
    }

    @Transactional
    public Claim createClaimForItem(Long itemId, Long currentUserId) {
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

        Claim claim = new Claim();
        claim.setItemId(itemId);
        claim.setClaimerId(currentUserId);
        // OTP is generated on-demand from My Claims page.
        claim.setOtp("");
        claim.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC));
        claim.setStatus(Claim.ClaimStatus.PENDING);
        return claimRepository.save(claim);
    }

    @Transactional
    public Claim generateOtpForClaim(Long claimId, Long currentUserId) {
        Claim claim = claimRepository.findByIdAndClaimerId(claimId, currentUserId)
            .orElseThrow(() -> new IllegalArgumentException("Claim not found"));

        if (claim.getStatus() == Claim.ClaimStatus.REJECTED || claim.getStatus() == Claim.ClaimStatus.COLLECTED) {
            throw new IllegalArgumentException("OTP cannot be generated for this claim status");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        boolean hasActiveOtp = claim.getOtp() != null
            && !claim.getOtp().isBlank()
            && claim.getOtpExpiry() != null
            && claim.getOtpExpiry().isAfter(now);

        if (hasActiveOtp) {
            return claim;
        }

        String otp = String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1_000_000));
        LocalDateTime otpExpiry = now.plusHours(1);
        claim.setOtp(otp);
        claim.setOtpExpiry(otpExpiry);
        return claimRepository.save(claim);
    }
}
