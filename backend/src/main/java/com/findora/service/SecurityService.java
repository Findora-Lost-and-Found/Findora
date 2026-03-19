package com.findora.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.findora.dto.PaginatedResponse;
import com.findora.dto.SecurityPendingClaimDTO;
import com.findora.dto.SecurityReceiveItemDTO;
import com.findora.dto.SecurityTransactionDTO;
import com.findora.model.Claim;
import com.findora.model.Item;
import com.findora.model.ItemStatus;
import com.findora.model.ItemType;
import com.findora.model.Notification;
import com.findora.model.SecurityTransaction;
import com.findora.model.User;
import com.findora.repository.ClaimRepository;
import com.findora.repository.ItemRepository;
import com.findora.repository.NotificationRepository;
import com.findora.repository.SecurityTransactionRepository;
import com.findora.repository.UserRepository;

@Service
public class SecurityService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final Logger log = LoggerFactory.getLogger(SecurityService.class);

    private final ClaimRepository claimRepository;
    private final ItemRepository itemRepository;
    private final SecurityTransactionRepository securityTransactionRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public SecurityService(
            ClaimRepository claimRepository,
            ItemRepository itemRepository,
            SecurityTransactionRepository securityTransactionRepository,
            NotificationRepository notificationRepository,
            UserRepository userRepository) {
        this.claimRepository = claimRepository;
        this.itemRepository = itemRepository;
        this.securityTransactionRepository = securityTransactionRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void requestHandover(Long itemId, Long currentUserId) {
        Item item = itemRepository.findById(itemId)
            .orElseThrow(() -> new IllegalArgumentException("Item not found"));

        if (!Objects.equals(item.getUserId(), currentUserId)) {
            throw new IllegalArgumentException("Only the item creator can request handover");
        }

        if (item.getStatus() == ItemStatus.HELD_BY_SECURITY
            || item.getStatus() == ItemStatus.HANDED_TO_SECURITY) {
            throw new IllegalArgumentException("Item is already handed over to security");
        }

        // Transaction-table persistence is intentionally skipped here because
        // deployments may have inconsistent legacy schemas for security_transactions.
        // Item status update is also skipped because legacy DBs may not support
        // the HANDOVER_REQUESTED enum value in items.status.
        log.info("Handover requested for item {} by user {}", itemId, currentUserId);

        List<User> securityUsers = userRepository.findByRole(User.UserRole.SECURITY);
        for (User securityUser : securityUsers) {
            Notification notification = new Notification();
            notification.setUserId(securityUser.getId());
            notification.setType(Notification.NotificationType.SYSTEM);
            notification.setTitle("New Handover Request");
            notification.setMessage("New item handover request received");
            notification.setRelatedId(itemId);
            notificationRepository.save(notification);
        }
    }

    @Transactional
    public void verifyClaim(Long claimId, Long itemId, String otp, Long securityOfficerId) {
        Claim claim = claimRepository.findById(claimId)
            .orElseThrow(() -> new IllegalArgumentException("Claim not found"));

        if (claim.getStatus() != Claim.ClaimStatus.PENDING && claim.getStatus() != Claim.ClaimStatus.APPROVED) {
            throw new IllegalArgumentException("Claim is not pending verification");
        }

        if (!Objects.equals(claim.getItemId(), itemId)) {
            throw new IllegalArgumentException("Claim does not belong to the provided item");
        }

        if (claim.getOtp() == null || !claim.getOtp().equals(otp)) {
            throw new IllegalArgumentException("Invalid OTP");
        }

        if (claim.getOtpExpiry() != null && LocalDateTime.now().isAfter(claim.getOtpExpiry())) {
            throw new IllegalArgumentException("OTP has expired");
        }

        Item item = itemRepository.findById(claim.getItemId())
            .orElseThrow(() -> new IllegalArgumentException("Item not found for claim"));

        if (item.getStatus() != ItemStatus.HELD_BY_SECURITY) {
            throw new IllegalArgumentException("Item must be held by security before release");
        }

        claim.setStatus(Claim.ClaimStatus.COLLECTED);
        claim.setSecurityOfficerId(securityOfficerId);
        claim.setCollectedAt(LocalDateTime.now());
        claimRepository.save(claim);

        item.setStatus(ItemStatus.CLAIMED);
        itemRepository.save(item);

        SecurityTransaction releaseTx = new SecurityTransaction();
        releaseTx.setSecurityOfficerId(securityOfficerId);
        releaseTx.setItemId(item.getId());
        releaseTx.setClaimId(claim.getId());
        releaseTx.setTransactionType(SecurityTransaction.TransactionType.RELEASE);
        releaseTx.setStatus(SecurityTransaction.TransactionStatus.RECEIVED);
        releaseTx.setReleasedTo(resolveClaimerName(claim));
        securityTransactionRepository.save(releaseTx);

        Notification notification = new Notification();
        notification.setUserId(claim.getClaimerId());
        notification.setType(Notification.NotificationType.CLAIM);
        notification.setTitle("Claim Update: Collected");
        notification.setMessage("Your claim was verified and marked as collected by Security.");
        notification.setRelatedId(claim.getId());
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<SecurityReceiveItemDTO> getReceiveItems() {
        try {
            List<SecurityTransaction> requestedTx = securityTransactionRepository
                .findByStatusOrderByCreatedAtDesc(SecurityTransaction.TransactionStatus.REQUESTED);

            return requestedTx.stream()
                .map(tx -> itemRepository.findById(tx.getItemId()).orElse(null))
                .filter(Objects::nonNull)
                .map(item -> new SecurityReceiveItemDTO(
                    item.getId(),
                    item.getItemName(),
                    item.getImageUrl(),
                    item.getUser() != null ? item.getUser().getFullName() : "Unknown Finder",
                    item.getLocation(),
                    item.getDate() != null ? item.getDate().format(DATE_FORMATTER) : null
                ))
                .toList();
        } catch (RuntimeException e) {
            log.warn("Falling back to items table for receive-items due to transaction schema mismatch: {}", e.getMessage());

            return itemRepository.findByTypeAndStatus(ItemType.FOUND, ItemStatus.HANDOVER_REQUESTED)
                .stream()
                .map(item -> new SecurityReceiveItemDTO(
                    item.getId(),
                    item.getItemName(),
                    item.getImageUrl(),
                    item.getUser() != null ? item.getUser().getFullName() : "Unknown Finder",
                    item.getLocation(),
                    item.getDate() != null ? item.getDate().format(DATE_FORMATTER) : null
                ))
                .toList();
        }
    }

    @Transactional
    public void confirmReceive(Long itemId, Long securityOfficerId) {
        Item item = itemRepository.findById(itemId)
            .orElseThrow(() -> new IllegalArgumentException("Item not found"));

        try {
            SecurityTransaction tx = securityTransactionRepository.findFirstByItemIdOrderByCreatedAtDesc(itemId)
                .orElseThrow(() -> new IllegalArgumentException("No handover request found for item"));

            if (tx.getStatus() != SecurityTransaction.TransactionStatus.REQUESTED) {
                throw new IllegalArgumentException("Handover request already processed");
            }

            tx.setStatus(SecurityTransaction.TransactionStatus.RECEIVED);
            tx.setSecurityOfficerId(securityOfficerId);
            securityTransactionRepository.save(tx);
        } catch (RuntimeException e) {
            log.warn("Skipping security transaction update due to schema mismatch: {}", e.getMessage());
        }

        item.setStatus(ItemStatus.HELD_BY_SECURITY);
        itemRepository.save(item);

        Notification notification = new Notification();
        notification.setUserId(item.getUserId());
        notification.setType(Notification.NotificationType.SYSTEM);
        notification.setTitle("Handover Completed");
        notification.setMessage("You successfully handed over the item to Security");
        notification.setRelatedId(itemId);
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<SecurityPendingClaimDTO> getPendingClaims() {
        return claimRepository
            .findByStatusInOrderByClaimedAtDesc(EnumSet.of(Claim.ClaimStatus.PENDING, Claim.ClaimStatus.APPROVED))
            .stream()
            .map(this::toPendingClaimDto)
            .toList();
    }

    @Transactional(readOnly = true)
    public PaginatedResponse<SecurityTransactionDTO> getTransactions(Long userId, boolean includeAll, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<SecurityTransaction> txPage = securityTransactionRepository.findAll(pageable);

        List<SecurityTransactionDTO> content = txPage.getContent().stream()
            .map(this::toTransactionDto)
            .toList();

        return new PaginatedResponse<>(
            content,
            txPage.getNumber(),
            txPage.getSize(),
            txPage.getTotalPages(),
            safeLongToInteger(txPage.getTotalElements())
        );
    }

    private SecurityTransactionDTO toTransactionDto(SecurityTransaction tx) {
        Item item = tx.getItemId() != null
            ? itemRepository.findById(tx.getItemId()).orElse(null)
            : null;

        String itemName = item != null && item.getItemName() != null ? item.getItemName() : "Unknown Item";
        String location = item != null && item.getLocation() != null ? item.getLocation() : "Unknown location";

        String ownerName = "Unknown user";
        if (item != null) {
            if (item.getUser() != null && item.getUser().getFullName() != null) {
                ownerName = item.getUser().getFullName();
            } else if (item.getUserId() != null) {
                ownerName = userRepository.findById(item.getUserId())
                    .map(User::getFullName)
                    .orElse("Unknown user");
            }
        }

        return new SecurityTransactionDTO(
            tx.getId(),
            tx.getItemId(),
            itemName,
            location,
            ownerName,
            tx.getStatus() != null ? tx.getStatus().name() : null,
            tx.getTransactionType() != null ? tx.getTransactionType().name() : null,
            tx.getCreatedAt()
        );
    }

    private SecurityPendingClaimDTO toPendingClaimDto(Claim claim) {
        Item item = claim.getItem();
        if (item == null && claim.getItemId() != null) {
            item = itemRepository.findById(claim.getItemId()).orElse(null);
        }

        User claimer = claim.getClaimer();
        if (claimer == null && claim.getClaimerId() != null) {
            claimer = userRepository.findById(claim.getClaimerId()).orElse(null);
        }

        String itemName = item != null && item.getItemName() != null ? item.getItemName() : "Unknown Item";
        String imageUrl = item != null ? item.getImageUrl() : null;
        String category = item != null && item.getCategory() != null ? item.getCategory().name() : "UNKNOWN";
        String location = item != null && item.getLocation() != null ? item.getLocation() : "Unknown location";
        String fullName = claimer != null && claimer.getFullName() != null ? claimer.getFullName() : "Unknown claimer";
        String phone = claimer != null && claimer.getPhone() != null ? claimer.getPhone() : "N/A";

        return new SecurityPendingClaimDTO(
            claim.getId(),
            claim.getItemId(),
            itemName,
            imageUrl,
            category,
            location,
            fullName,
            phone,
            claim.getClaimedAt()
        );
    }

    private Integer safeLongToInteger(long value) {
        return value > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) value;
    }

    private String resolveClaimerName(Claim claim) {
        if (claim.getClaimer() != null && claim.getClaimer().getFullName() != null) {
            return claim.getClaimer().getFullName();
        }

        return userRepository.findById(claim.getClaimerId())
            .map(User::getFullName)
            .orElse("Unknown user");
    }
}