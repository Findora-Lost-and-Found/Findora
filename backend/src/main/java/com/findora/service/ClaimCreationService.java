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
import com.findora.model.Notification;
import com.findora.repository.ClaimRepository;
import com.findora.repository.ItemRepository;
import com.findora.repository.NotificationRepository;

/**
 * Reusable claim creation service that preserves existing ClaimController behavior.
 */
@Service
@SuppressWarnings("null")
public class ClaimCreationService {

    private static final Collection<Claim.ClaimStatus> OPEN_STATUSES = List.of(
        Claim.ClaimStatus.PENDING,
        Claim.ClaimStatus.APPROVED
    );

    private final ClaimRepository claimRepository;
    private final ItemRepository itemRepository;
    private final NotificationRepository notificationRepository;

    public ClaimCreationService(
            ClaimRepository claimRepository,
            ItemRepository itemRepository,
            NotificationRepository notificationRepository) {
        this.claimRepository = claimRepository;
        this.itemRepository = itemRepository;
        this.notificationRepository = notificationRepository;
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
        Claim savedClaim = claimRepository.save(claim);

        if (item.getUserId() != null) {
            Notification notification = new Notification();
            notification.setUserId(item.getUserId());
            notification.setType(Notification.NotificationType.CLAIM);
            notification.setTitle("Claim Submitted - Submit Item Within 24 Hours");
            notification.setMessage("A claimant has submitted a claim for your found item. Please hand over the item to Security within 24 hours. Status: Not received by Security yet.");
            notification.setRelatedId(itemId);
            notification.setIsRead(false);
            notificationRepository.save(notification);
        }

        return savedClaim;
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
