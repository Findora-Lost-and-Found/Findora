package com.findora.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import com.findora.model.AccessAppeal;
import com.findora.model.Notification;
import com.findora.model.Report;
import com.findora.model.User;
import com.findora.repository.AccessAppealRepository;
import com.findora.repository.NotificationRepository;
import com.findora.repository.ReportRepository;
import com.findora.repository.UserRepository;

@Service
public class AccessControlService {

    private static final int MAX_BAD_ATTEMPTS_ALLOWED = 5;
    private static final long APPEAL_BAD_LANGUAGE_COOLDOWN_HOURS = 24;
    private static final String APPEAL_AUTO_DECLINE_BAD_LANGUAGE_NOTE = "AUTO_DECLINED_BAD_LANGUAGE_24H";
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private static final Set<String> BLOCKED_TERMS = Set.of(
        "fuck",
        "bitch",
        "shit",
        "asshole",
        "bastard",
        "slut",
        "whore",
        "nigger",
        "nigga",
        "faggot",
        "motherfucker"
    );

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final AccessAppealRepository accessAppealRepository;
    private final ReportRepository reportRepository;
    private final TransactionTemplate requiresNewTransaction;

    public AccessControlService(
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            AccessAppealRepository accessAppealRepository,
            ReportRepository reportRepository,
            PlatformTransactionManager transactionManager) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.accessAppealRepository = accessAppealRepository;
        this.reportRepository = reportRepository;
        this.requiresNewTransaction = new TransactionTemplate(transactionManager);
        this.requiresNewTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @SuppressWarnings("null")
    public void validatePostLanguage(Long userId, String... textSegments) {
        String joined = String.join(" ", sanitizeSegments(textSegments));
        if (!containsBlockedLanguage(joined)) {
            return;
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        AccessState accessState = refreshAndGetAccessState(user);
        if (accessState != AccessState.ALLOWED) {
            throw new IllegalArgumentException(accessBlockedMessage(user, accessState));
        }

        int nextAttempts = (user.getBadPostAttempts() == null ? 0 : user.getBadPostAttempts()) + 1;
        user.setBadPostAttempts(nextAttempts);

        if (nextAttempts >= MAX_BAD_ATTEMPTS_ALLOWED) {
            user.setIsSuspended(true);
            user.setSuspensionUntil(LocalDateTime.now().plusMonths(6));
            // Save with separate transaction to ensure it commits
            saveUserSuspension(user, nextAttempts);
            notifyAdminsAboutAutoSuspension(user, nextAttempts);
            throw new IllegalArgumentException(
                "Repeated inappropriate language detected. Your account is suspended for 6 months. You can submit an appeal."
            );
        }

        // Save with separate transaction to ensure it commits
        saveUserBadAttempt(user, nextAttempts);
        throw new IllegalArgumentException(
            "Inappropriate language is not allowed. Attempt " + nextAttempts + " of " + MAX_BAD_ATTEMPTS_ALLOWED + " before suspension."
        );
    }

    public boolean containsBlockedLanguageInText(String... textSegments) {
        String joined = String.join(" ", sanitizeSegments(textSegments));
        return containsBlockedLanguage(joined);
    }

    public void saveUserBadAttempt(User user, int attempts) {
        requiresNewTransaction.executeWithoutResult(status -> {
            User managedUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
            managedUser.setBadPostAttempts(attempts);
            userRepository.save(managedUser);
        });
    }

    public void saveUserSuspension(User user, int attempts) {
        requiresNewTransaction.executeWithoutResult(status -> {
            User managedUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
            managedUser.setBadPostAttempts(attempts);
            managedUser.setIsSuspended(true);
            managedUser.setSuspensionUntil(LocalDateTime.now().plusMonths(6));
            userRepository.save(managedUser);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AccessState refreshAndGetAccessState(User user) {
        if (Boolean.TRUE.equals(user.getIsBanned())) {
            return AccessState.BANNED;
        }

        if (!Boolean.TRUE.equals(user.getIsSuspended())) {
            return AccessState.ALLOWED;
        }

        LocalDateTime until = user.getSuspensionUntil();
        if (until != null && LocalDateTime.now().isAfter(until)) {
            user.setIsSuspended(false);
            user.setSuspensionUntil(null);
            user.setBadPostAttempts(0);
            userRepository.save(user);
            return AccessState.ALLOWED;
        }

        return AccessState.SUSPENDED;
    }

    public String accessBlockedMessage(User user, AccessState state) {
        String appealCooldownMessage = getAppealCooldownMessage(user.getId());
        if (appealCooldownMessage != null) {
            return appealCooldownMessage;
        }

        if (state == AccessState.BANNED) {
            return "Your account is permanently banned. You can submit an appeal.";
        }

        if (state == AccessState.SUSPENDED) {
            if (user.getSuspensionUntil() != null) {
                return "Your account is suspended until "
                    + user.getSuspensionUntil().format(DATE_TIME_FORMATTER)
                    + ". You can submit an appeal.";
            }
            return "Your account is suspended. You can submit an appeal.";
        }

        return "Access granted";
    }

    private String getAppealCooldownMessage(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        return accessAppealRepository
            .findFirstByUserIdAndStatusAndAdminNotesOrderByCreatedAtDesc(
                userId,
                AccessAppeal.AppealStatus.DECLINED,
                APPEAL_AUTO_DECLINE_BAD_LANGUAGE_NOTE
            )
            .map(AccessAppeal::getCreatedAt)
            .filter(createdAt -> createdAt != null && createdAt.plusHours(APPEAL_BAD_LANGUAGE_COOLDOWN_HOURS).isAfter(now))
            .map(createdAt -> "Appeal blocked for inappropriate language. You can submit another appeal after "
                + createdAt.plusHours(APPEAL_BAD_LANGUAGE_COOLDOWN_HOURS).format(DATE_TIME_FORMATTER))
            .orElse(null);
    }

    @Transactional
    public Map<String, Object> submitAccessAppeal(String identifier, String reason) {
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("username or email is required");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Appeal reason is required");
        }

        User user = userRepository.findByUsername(identifier)
            .or(() -> userRepository.findByEmail(identifier))
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        AccessState accessState = refreshAndGetAccessState(user);
        if (accessState == AccessState.ALLOWED) {
            throw new IllegalArgumentException("Your account is active. Appeal can be submitted only for suspended or banned accounts.");
        }

        enforceAppealCooldownAndModeration(user, accessState, reason);

        accessAppealRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), AccessAppeal.AppealStatus.PENDING)
            .ifPresent(existing -> {
                throw new IllegalArgumentException("You already have a pending appeal.");
            });

        AccessAppeal appeal = new AccessAppeal();
        appeal.setUserId(user.getId());
        appeal.setActionType(accessState == AccessState.BANNED
            ? AccessAppeal.AppealActionType.BAN
            : AccessAppeal.AppealActionType.SUSPENSION);
        appeal.setStatus(AccessAppeal.AppealStatus.PENDING);
        appeal.setAppealText(reason.trim());

        AccessAppeal savedAppeal = accessAppealRepository.save(appeal);
        notifyAdminsAboutAppeal(savedAppeal, user);

        return Map.of(
            "appeal_id", savedAppeal.getId(),
            "status", savedAppeal.getStatus().name().toLowerCase(Locale.ROOT),
            "message", "Appeal submitted successfully"
        );
    }

    private void enforceAppealCooldownAndModeration(User user, AccessState accessState, String reason) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cooldownThreshold = now.minusHours(APPEAL_BAD_LANGUAGE_COOLDOWN_HOURS);

        accessAppealRepository
            .findFirstByUserIdAndStatusAndAdminNotesOrderByCreatedAtDesc(
                user.getId(),
                AccessAppeal.AppealStatus.DECLINED,
                APPEAL_AUTO_DECLINE_BAD_LANGUAGE_NOTE
            )
            .ifPresent(lastAutoDeclined -> {
                LocalDateTime createdAt = lastAutoDeclined.getCreatedAt();
                if (createdAt != null && createdAt.isAfter(cooldownThreshold)) {
                    LocalDateTime availableAt = createdAt.plusHours(APPEAL_BAD_LANGUAGE_COOLDOWN_HOURS);
                    throw new IllegalArgumentException(
                        "Appeal blocked for inappropriate language. You can submit another appeal after "
                            + availableAt.format(DATE_TIME_FORMATTER)
                    );
                }
            });

        if (!containsBlockedLanguage(reason)) {
            return;
        }

        saveAutoDeclinedAppeal(user.getId(), accessState, reason, now);

        LocalDateTime nextAllowedAt = now.plusHours(APPEAL_BAD_LANGUAGE_COOLDOWN_HOURS);
        throw new IllegalArgumentException(
            "Appeal blocked for inappropriate language. You can submit another appeal after "
                + nextAllowedAt.format(DATE_TIME_FORMATTER)
        );
    }

    private void saveAutoDeclinedAppeal(Long userId, AccessState accessState, String reason, LocalDateTime reviewedAt) {
        requiresNewTransaction.executeWithoutResult(status -> {
            AccessAppeal autoDeclined = new AccessAppeal();
            autoDeclined.setUserId(userId);
            autoDeclined.setActionType(accessState == AccessState.BANNED
                ? AccessAppeal.AppealActionType.BAN
                : AccessAppeal.AppealActionType.SUSPENSION);
            autoDeclined.setStatus(AccessAppeal.AppealStatus.DECLINED);
            autoDeclined.setAppealText(reason.trim());
            autoDeclined.setAdminNotes(APPEAL_AUTO_DECLINE_BAD_LANGUAGE_NOTE);
            autoDeclined.setReviewedAt(reviewedAt);
            accessAppealRepository.save(autoDeclined);
        });
    }

    @Transactional(readOnly = true)
    public Page<AccessAppeal> getAppeals(String status, Pageable pageable) {
        if (status == null || status.isBlank()) {
            return accessAppealRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        AccessAppeal.AppealStatus parsedStatus = AccessAppeal.AppealStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        return accessAppealRepository.findByStatusOrderByCreatedAtDesc(parsedStatus, pageable);
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public Map<String, Object> getAppealDetails(Long appealId) {
        AccessAppeal appeal = accessAppealRepository.findById(appealId)
            .orElseThrow(() -> new IllegalArgumentException("Appeal not found"));

        User appealedUser = userRepository.findById(appeal.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("Appealed user not found"));

        List<Map<String, Object>> reportedPosts = reportRepository.findByPostedUserId(appealedUser.getId())
            .stream()
            .map(this::toReportedPostPayload)
            .toList();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("appeal", toAppealPayload(appeal));
        payload.put("reported_posts", reportedPosts);
        payload.put("user", toUserPayload(appealedUser));
        return payload;
    }

    @Transactional
    @SuppressWarnings("null")
    public Map<String, Object> reviewAppeal(Long appealId, boolean approve, String adminNotes) {
        AccessAppeal appeal = accessAppealRepository.findById(appealId)
            .orElseThrow(() -> new IllegalArgumentException("Appeal not found"));

        if (appeal.getStatus() != AccessAppeal.AppealStatus.PENDING) {
            throw new IllegalArgumentException("Appeal already reviewed");
        }

        User appealedUser = userRepository.findById(appeal.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("Appealed user not found"));

        appeal.setStatus(approve ? AccessAppeal.AppealStatus.APPROVED : AccessAppeal.AppealStatus.DECLINED);
        appeal.setAdminNotes(adminNotes == null ? null : adminNotes.trim());
        appeal.setReviewedAt(LocalDateTime.now());

        if (approve) {
            appealedUser.setIsBanned(false);
            appealedUser.setIsSuspended(false);
            appealedUser.setSuspensionUntil(null);
            appealedUser.setBadPostAttempts(0);
            userRepository.save(appealedUser);
        }

        AccessAppeal savedAppeal = accessAppealRepository.save(appeal);
        notifyUserAboutAppealDecision(savedAppeal, appealedUser, approve);

        return toAppealPayload(savedAppeal);
    }

    public Map<String, Object> toAppealPayload(AccessAppeal appeal) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", appeal.getId());
        payload.put("user_id", appeal.getUserId());
        payload.put("username", appeal.getUser() == null ? null : appeal.getUser().getUsername());
        payload.put("full_name", appeal.getUser() == null ? null : appeal.getUser().getFullName());
        payload.put("email", appeal.getUser() == null ? null : appeal.getUser().getEmail());
        payload.put("action_type", appeal.getActionType() == null ? null : appeal.getActionType().name().toLowerCase(Locale.ROOT));
        payload.put("status", appeal.getStatus() == null ? null : appeal.getStatus().name().toLowerCase(Locale.ROOT));
        payload.put("appeal_text", appeal.getAppealText());
        payload.put("admin_notes", appeal.getAdminNotes());
        payload.put("created_at", appeal.getCreatedAt() == null ? null : appeal.getCreatedAt().toString());
        payload.put("reviewed_at", appeal.getReviewedAt() == null ? null : appeal.getReviewedAt().toString());
        return payload;
    }

    private Map<String, Object> toReportedPostPayload(Report report) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("report_id", report.getId());
        payload.put("item_id", report.getItemId());
        payload.put("item_name", report.getItem() == null ? null : report.getItem().getItemName());
        payload.put("item_status", report.getItem() == null || report.getItem().getStatus() == null ? null : report.getItem().getStatus().name().toLowerCase(Locale.ROOT));
        payload.put("reason", report.getReason());
        payload.put("report_status", report.getStatus() == null ? null : report.getStatus().name().toLowerCase(Locale.ROOT));
        payload.put("reported_at", report.getCreatedAt() == null ? null : report.getCreatedAt().toString());
        payload.put("reporter_username", report.getReporter() == null ? null : report.getReporter().getUsername());
        return payload;
    }

    private Map<String, Object> toUserPayload(User user) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", user.getId());
        payload.put("username", user.getUsername());
        payload.put("full_name", user.getFullName());
        payload.put("email", user.getEmail());
        payload.put("is_banned", user.getIsBanned());
        payload.put("is_suspended", user.getIsSuspended());
        payload.put("suspension_until", user.getSuspensionUntil() == null ? null : user.getSuspensionUntil().toString());
        payload.put("bad_post_attempts", user.getBadPostAttempts());
        return payload;
    }

    private void notifyAdminsAboutAutoSuspension(User suspendedUser, int attempts) {
        List<User> admins = userRepository.findByRole(User.UserRole.ADMIN);
        for (User admin : admins) {
            Notification notification = new Notification();
            notification.setUserId(admin.getId());
            notification.setType(Notification.NotificationType.REPORT);
            notification.setTitle("User auto-suspended for bad content");
            notification.setMessage(
                "User " + suspendedUser.getUsername() + " exceeded bad-language attempts ("
                    + attempts + ") and was suspended until "
                    + (suspendedUser.getSuspensionUntil() == null ? "N/A" : suspendedUser.getSuspensionUntil().format(DATE_TIME_FORMATTER))
            );
            notification.setRelatedId(suspendedUser.getId());
            notificationRepository.save(notification);
        }
    }

    private void notifyAdminsAboutAppeal(AccessAppeal appeal, User user) {
        List<User> admins = userRepository.findByRole(User.UserRole.ADMIN);
        for (User admin : admins) {
            Notification notification = new Notification();
            notification.setUserId(admin.getId());
            notification.setType(Notification.NotificationType.APPROVAL);
            notification.setTitle("Access appeal submitted");
            notification.setMessage(
                "User " + user.getUsername() + " submitted an appeal for "
                    + appeal.getActionType().name().toLowerCase(Locale.ROOT)
                    + "."
            );
            notification.setRelatedId(appeal.getId());
            notificationRepository.save(notification);
        }
    }

    private void notifyUserAboutAppealDecision(AccessAppeal appeal, User appealedUser, boolean approved) {
        Notification notification = new Notification();
        notification.setUserId(appealedUser.getId());
        notification.setType(Notification.NotificationType.SYSTEM);
        notification.setTitle(approved ? "Appeal approved" : "Appeal declined");
        notification.setMessage(
            approved
                ? "Your appeal has been approved. You can now access the platform."
                : "Your appeal was declined. Contact admin for further clarification."
        );
        notification.setRelatedId(appeal.getId());
        notificationRepository.save(notification);
    }

    private boolean containsBlockedLanguage(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }

        String lowered = text.toLowerCase(Locale.ROOT);
        String normalized = lowered.replaceAll("[^a-z0-9]+", " ");
        for (String term : BLOCKED_TERMS) {
            Pattern pattern = Pattern.compile("\\b" + Pattern.quote(term) + "\\b", Pattern.CASE_INSENSITIVE);
            if (pattern.matcher(lowered).find() || lowered.contains(term) || normalized.contains(term)) {
                return true;
            }
        }
        return false;
    }

    private String[] sanitizeSegments(String... textSegments) {
        if (textSegments == null || textSegments.length == 0) {
            return new String[0];
        }

        return java.util.Arrays.stream(textSegments)
            .filter(segment -> segment != null && !segment.isBlank())
            .map(String::trim)
            .toArray(String[]::new);
    }

    public enum AccessState {
        ALLOWED,
        SUSPENDED,
        BANNED
    }
}
