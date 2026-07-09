package com.findora.service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
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

import jakarta.annotation.PostConstruct;

@Service
@SuppressWarnings("null")
public class SecurityService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final Logger log = LoggerFactory.getLogger(SecurityService.class);

    private final ClaimRepository claimRepository;
    private final ItemRepository itemRepository;
    private final SecurityTransactionRepository securityTransactionRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    public SecurityService(
            ClaimRepository claimRepository,
            ItemRepository itemRepository,
            SecurityTransactionRepository securityTransactionRepository,
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            JdbcTemplate jdbcTemplate) {
        this.claimRepository = claimRepository;
        this.itemRepository = itemRepository;
        this.securityTransactionRepository = securityTransactionRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void initializeSchemaCompatibility() {
        try {
            ensureItemStatusSupportsSecurityStates();
            log.info("Verified items.status enum compatibility for security workflow");
        } catch (Exception e) {
            log.error("Unable to auto-patch items.status enum compatibility: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public void requestHandover(Long itemId, Long currentUserId) {
        Item item = itemRepository.findById(itemId)
            .orElseThrow(() -> new IllegalArgumentException("Item not found"));

        if (!Objects.equals(item.getUserId(), currentUserId)) {
            throw new IllegalArgumentException("Only the item creator can request handover");
        }

        if (item.getStatus() == ItemStatus.HANDOVER_REQUESTED) {
            throw new IllegalArgumentException("Handover is already waiting for approval");
        }

        if (item.getStatus() == ItemStatus.HELD_BY_SECURITY
            || item.getStatus() == ItemStatus.HANDED_TO_SECURITY) {
            throw new IllegalArgumentException("Item is already handed over to security");
        }

        // Ensure legacy schemas support security workflow statuses before updating.
        ensureItemStatusSupportsSecurityStates();

        item.setStatus(ItemStatus.HANDOVER_REQUESTED);
        try {
            itemRepository.saveAndFlush(item);
        } catch (DataIntegrityViolationException e) {
            log.warn("Detected outdated items.status enum during flush. Retrying after compatibility patch.");
            ensureItemStatusSupportsSecurityStates();
            itemRepository.saveAndFlush(item);
        }

        // Track the handover request even before a security officer accepts it.
        if (supportsSecurityTransactionWorkflowColumns()) {
            SecurityTransaction handoverTx = new SecurityTransaction();
            handoverTx.setItemId(itemId);
            handoverTx.setTransactionType(SecurityTransaction.TransactionType.RECEIVE);
            handoverTx.setStatus(SecurityTransaction.TransactionStatus.REQUESTED);
            handoverTx.setReceivedFrom(item.getUser() != null ? item.getUser().getFullName() : "Unknown Finder");
            securityTransactionRepository.save(handoverTx);
        }

        log.info("Handover requested for item {} by user {}", itemId, currentUserId);

        List<User> securityUsers = userRepository.findByRole(User.UserRole.SECURITY);
        for (User securityUser : securityUsers) {
            try {
                Notification notification = new Notification();
                notification.setUserId(securityUser.getId());
                notification.setType(Notification.NotificationType.SYSTEM);
                notification.setTitle("New Handover Request");
                notification.setMessage("New item handover request received");
                notification.setRelatedId(itemId);
                notification.setIsRead(false);
                notificationRepository.save(notification);
            } catch (RuntimeException e) {
                // Do not roll back a successful handover status transition because of notification persistence.
                log.warn("Skipping handover notification for security user {} due to persistence issue: {}",
                    securityUser.getId(), e.getMessage());
            }
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

        if (claim.getOtpExpiry() != null && LocalDateTime.now(ZoneOffset.UTC).isAfter(claim.getOtpExpiry())) {
            throw new IllegalArgumentException("OTP has expired");
        }

        Item item = itemRepository.findById(claim.getItemId())
            .orElseThrow(() -> new IllegalArgumentException("Item not found for claim"));

        if (item.getStatus() != ItemStatus.HELD_BY_SECURITY) {
            throw new IllegalArgumentException("Item must be held by security before release");
        }

        claim.setStatus(Claim.ClaimStatus.COLLECTED);
        claim.setSecurityOfficerId(securityOfficerId);
        claim.setCollectedAt(LocalDateTime.now(ZoneOffset.UTC));
        claimRepository.save(claim);

        item.setStatus(ItemStatus.CLAIMED);
        itemRepository.save(item);

        if (supportsSecurityTransactionWorkflowColumns()) {
            SecurityTransaction releaseTx = new SecurityTransaction();
            releaseTx.setSecurityOfficerId(securityOfficerId);
            releaseTx.setItemId(item.getId());
            releaseTx.setClaimId(claim.getId());
            releaseTx.setTransactionType(SecurityTransaction.TransactionType.RELEASE);
            releaseTx.setStatus(SecurityTransaction.TransactionStatus.RECEIVED);
            releaseTx.setReleasedTo(resolveClaimerName(claim));
            securityTransactionRepository.save(releaseTx);
        } else {
            log.warn("Skipping release security transaction write due to legacy schema (missing status/transaction_type columns)");
        }

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

    @Transactional
    public void confirmReceive(Long itemId, Long securityOfficerId) {
        Item item = itemRepository.findById(itemId)
            .orElseThrow(() -> new IllegalArgumentException("Item not found"));

        // Ensure legacy schemas support security workflow statuses before updating item state.
        ensureItemStatusSupportsSecurityStates();

        if (supportsSecurityTransactionWorkflowColumns()) {
            // Try to find existing security transaction, or create one if it doesn't exist
            var existingTx = securityTransactionRepository.findFirstByItemIdOrderByCreatedAtDesc(itemId);
            
            SecurityTransaction tx;
            if (existingTx.isPresent()) {
                tx = existingTx.get();
                if (tx.getStatus() == SecurityTransaction.TransactionStatus.RECEIVED) {
                    throw new IllegalArgumentException("Handover request already processed");
                }
            } else {
                // Create transaction for backwards compatibility with existing items
                tx = new SecurityTransaction();
                tx.setItemId(itemId);
                tx.setTransactionType(SecurityTransaction.TransactionType.RECEIVE);
                tx.setReceivedFrom(item.getUser() != null ? item.getUser().getFullName() : "Unknown Finder");
            }
            
            tx.setStatus(SecurityTransaction.TransactionStatus.RECEIVED);
            tx.setSecurityOfficerId(securityOfficerId);
            securityTransactionRepository.save(tx);
        } else {
            log.warn("Skipping security transaction update due to legacy schema (missing status/transaction_type columns)");
        }

        item.setStatus(ItemStatus.HELD_BY_SECURITY);
        try {
            itemRepository.saveAndFlush(item);
        } catch (DataIntegrityViolationException e) {
            log.warn("Detected outdated items.status enum during receive-item. Retrying after compatibility patch.");
            ensureItemStatusSupportsSecurityStates();
            itemRepository.saveAndFlush(item);
        }

        try {
            if (item.getUserId() != null) {
                Notification notification = new Notification();
                notification.setUserId(item.getUserId());
                notification.setType(Notification.NotificationType.SYSTEM);
                notification.setTitle("Handover Completed");
                notification.setMessage("You successfully handed over the item to Security");
                notification.setRelatedId(itemId);
                notification.setIsRead(false);
                notificationRepository.save(notification);
            } else {
                log.warn("Skipping handover notification for item {} because finder userId is null", itemId);
            }
        } catch (RuntimeException e) {
            log.warn("Skipping handover notification due to persistence issue for item {}: {}", itemId, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<SecurityPendingClaimDTO> getPendingClaims() {
        return claimRepository
            .findByStatusInOrderByClaimedAtDesc(EnumSet.of(Claim.ClaimStatus.PENDING, Claim.ClaimStatus.APPROVED))
            .stream()
            .filter(this::isEligibleForPendingClaims)
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
        ItemStatus itemStatus = item != null ? item.getStatus() : null;
        boolean receivedBySecurity = itemStatus == ItemStatus.HELD_BY_SECURITY
            || itemStatus == ItemStatus.HANDED_TO_SECURITY;

        return new SecurityPendingClaimDTO(
            claim.getId(),
            claim.getItemId(),
            itemName,
            imageUrl,
            category,
            location,
            fullName,
            phone,
            claim.getClaimedAt(),
            itemStatus != null ? itemStatus.name() : null,
            receivedBySecurity
        );
    }

    private boolean isEligibleForPendingClaims(Claim claim) {
        Item item = claim.getItem();
        if (item == null && claim.getItemId() != null) {
            item = itemRepository.findById(claim.getItemId()).orElse(null);
        }

        if (item == null || item.getType() != ItemType.FOUND || item.getStatus() == null) {
            return false;
        }

        return item.getStatus() != ItemStatus.CLAIMED && item.getStatus() != ItemStatus.CLOSED;
    }

    private void ensureItemStatusSupportsSecurityStates() {
        try {
            String columnType = jdbcTemplate.queryForObject(
                "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
                    + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'items' AND COLUMN_NAME = 'status'",
                String.class
            );

            if (columnType == null || columnType.isBlank()) {
                log.warn("Could not inspect items.status column - database may be unavailable");
                return;
            }

            log.info("items.status column type before compatibility check: {}", columnType);

            Set<String> values = new LinkedHashSet<>();
            Matcher matcher = Pattern.compile("'([^']*)'").matcher(columnType.toLowerCase());
            while (matcher.find()) {
                values.add(matcher.group(1));
            }

            boolean changed = false;
            for (String required : List.of("active", "handover_requested", "held_by_security", "handed_to_security", "claimed", "closed")) {
                if (values.add(required)) {
                    changed = true;
                }
            }

            if (!changed) {
                log.info("items.status already supports all required security states");
                return;
            }

            List<String> escapedValues = new ArrayList<>();
            for (String value : values) {
                escapedValues.add("'" + value.replace("'", "''") + "'");
            }

            String alterSql = "ALTER TABLE items MODIFY COLUMN status ENUM("
                + String.join(",", escapedValues)
                + ") DEFAULT 'active'";
            log.info("Applying items.status compatibility patch: {}", alterSql);
            jdbcTemplate.execute(alterSql);
            log.info("Patched items.status enum values for handover compatibility");
        } catch (DataAccessException e) {
            log.warn("Schema compatibility check skipped (database may be unavailable): {}", e.getMessage());
        }
    }

    private boolean supportsSecurityTransactionWorkflowColumns() {
        Integer presentColumns = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
                + "WHERE TABLE_SCHEMA = DATABASE() "
                + "AND TABLE_NAME = 'security_transactions' "
                + "AND COLUMN_NAME IN ('status', 'transaction_type')",
            Integer.class
        );

        return presentColumns != null && presentColumns >= 2;
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