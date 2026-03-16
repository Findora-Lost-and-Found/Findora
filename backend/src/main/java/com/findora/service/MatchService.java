package com.findora.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.findora.model.Claim;
import com.findora.model.Item;
import com.findora.model.ItemStatus;
import com.findora.model.ItemType;
import com.findora.model.Match;
import com.findora.model.Notification;
import com.findora.model.User;
import com.findora.repository.ItemRepository;
import com.findora.repository.MatchRepository;
import com.findora.repository.NotificationRepository;
import com.findora.repository.UserRepository;

@Service
public class MatchService {

    private static final Logger log = LoggerFactory.getLogger(MatchService.class);
    private static final int MAX_OTP_ATTEMPTS = 2;
    private static final Pattern NIC_PATTERN = Pattern.compile("\\b(?:\\d{12}|\\d{9}[VvXx])\\b");
    private static final Pattern ID_PATTERN = Pattern.compile("\\b[A-Z]{2,4}[- ]?\\d{4,10}\\b");

    private final MatchRepository matchRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final ClaimCreationService claimCreationService;
    private final Clock clock;
    private final JavaMailSender mailSender;

    @Value("${app.matching.threshold.found:0.80}")
    private double strongThreshold;

    @Value("${app.matching.threshold.possible:0.60}")
    private double possibleThreshold;

    @Value("${app.matching.weight.name:0.40}")
    private double nameWeight;

    @Value("${app.matching.weight.description:0.30}")
    private double descriptionWeight;

    @Value("${app.matching.weight.location:0.20}")
    private double locationWeight;

    @Value("${app.matching.weight.date:0.10}")
    private double dateWeight;

    @Value("${app.matching.resend.cooldown.seconds:60}")
    private long resendCooldownSeconds;

    public MatchService(
            MatchRepository matchRepository,
            ItemRepository itemRepository,
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            ClaimCreationService claimCreationService,
            Clock clock,
            ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.matchRepository = matchRepository;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.claimCreationService = claimCreationService;
        this.clock = clock;
        this.mailSender = mailSenderProvider.getIfAvailable();
    }

    @Transactional
    public int runScheduledMatchingSweep() {
        Instant now = Instant.now(clock);
        List<Item> lostItems = itemRepository.findByTypeAndStatus(ItemType.LOST, ItemStatus.ACTIVE);
        List<Item> foundItems = itemRepository.findByTypeAndStatus(ItemType.FOUND, ItemStatus.ACTIVE);

        Map<Object, List<Item>> foundByCategory = new HashMap<>();
        for (Item found : foundItems) {
            foundByCategory.computeIfAbsent(found.getCategory(), key -> new ArrayList<>()).add(found);
        }

        int notificationsSent = 0;

        for (Item lost : lostItems) {
            List<Item> candidates = foundByCategory.getOrDefault(lost.getCategory(), List.of());
            if (candidates.isEmpty()) {
                continue;
            }

            List<MatchCandidate> scoredCandidates = new ArrayList<>();
            for (Item found : candidates) {
                if (!withinSevenDayWindow(lost.getDate(), found.getDate())) {
                    continue;
                }

                double score = computeScore(lost, found);
                boolean exactId = isSpecialExactIdMatch(lost, found);
                scoredCandidates.add(new MatchCandidate(lost, found, score, exactId));
            }

            if (scoredCandidates.isEmpty()) {
                continue;
            }

            boolean hasStrongMatch = scoredCandidates.stream()
                .anyMatch(candidate -> candidate.score >= (strongThreshold * 100.0) || candidate.exactIdMatch);

            for (MatchCandidate candidate : scoredCandidates) {
                int threshold = candidate.exactIdMatch ? 100 : (candidate.score >= (strongThreshold * 100.0) ? 80 : 60);
                Match match = upsertMatch(candidate, threshold);

                if (shouldNotify(candidate, hasStrongMatch, now) && canNotify(match, now)) {
                    issueOtpAndNotify(match, candidate, threshold, now);
                    notificationsSent++;
                }
            }
        }

        return notificationsSent;
    }

    public double computeScore(Item lost, Item found) {
        if (isSpecialExactIdMatch(lost, found)) {
            return 100.0;
        }

        double nameScore = textSimilarity(lost.getItemName(), found.getItemName());
        double descriptionScore = textSimilarity(lost.getDescription(), found.getDescription());
        double locationScore = textSimilarity(lost.getLocation(), found.getLocation());
        double dateScore = dateProximityScore(lost.getDate(), found.getDate());

        double weighted = (nameScore * nameWeight)
            + (descriptionScore * descriptionWeight)
            + (locationScore * locationWeight)
            + (dateScore * dateWeight);

        double normalized = weighted / Math.max(0.0001, (nameWeight + descriptionWeight + locationWeight + dateWeight));
        return Math.max(0.0, Math.min(100.0, normalized * 100.0));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyMatches(Long userId) {
        return matchRepository.findForLostReporter(userId).stream()
            .map(this::toMatchSummary)
            .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMatchDetail(Long matchId, Long userId) {
        Match match = getOwnedMatch(matchId, userId);
        return toMatchSummary(match);
    }

    @Transactional
    public Map<String, Object> resendOtp(Long matchId, Long userId) {
        Match match = getOwnedMatch(matchId, userId);
        Instant now = Instant.now(clock);

        if (match.getStatus() == Match.MatchStatus.CLAIMED) {
            throw new IllegalArgumentException("Match is already claimed");
        }

        if (match.getNotifiedAt() != null) {
            Instant nextAllowed = match.getNotifiedAt().plusSeconds(resendCooldownSeconds);
            if (nextAllowed.isAfter(now)) {
                throw new IllegalArgumentException("Please wait before requesting another OTP");
            }
        }

        Integer threshold = Optional.ofNullable(match.getThreshold()).orElse(80);
        issueOtpAndNotify(match, new MatchCandidate(match.getLostItem(), match.getFoundItem(), match.getScore(), false),
            threshold, now);

        return Map.of(
            "matchId", match.getId(),
            "status", match.getStatus().name(),
            "notifiedAt", match.getNotifiedAt(),
            "otpExpiry", match.getOtpExpiry()
        );
    }

    @Transactional
    public Claim claimMatch(Long matchId, String otp, Long userId) {
        Match match = getOwnedMatch(matchId, userId);
        Instant now = Instant.now(clock);

        if (match.getStatus() == Match.MatchStatus.CLAIMED) {
            throw new IllegalArgumentException("Match already claimed");
        }

        if (match.getOtpExpiry() == null || now.isAfter(match.getOtpExpiry())) {
            match.setStatus(Match.MatchStatus.EXPIRED);
            matchRepository.save(match);
            throw new IllegalArgumentException("OTP has expired");
        }

        int attempts = Optional.ofNullable(match.getOtpAttempts()).orElse(0);
        if (attempts >= MAX_OTP_ATTEMPTS) {
            match.setStatus(Match.MatchStatus.EXPIRED);
            matchRepository.save(match);
            throw new IllegalArgumentException("OTP attempts exceeded");
        }

        if (match.getOtp() == null || !match.getOtp().equals(otp)) {
            match.setOtpAttempts(attempts + 1);
            matchRepository.save(match);
            throw new IllegalArgumentException("Invalid OTP");
        }

        Claim claim = claimCreationService.createClaimForItem(match.getFoundItemId(), userId);

        match.setStatus(Match.MatchStatus.CLAIMED);
        match.setOtpAttempts(0);
        matchRepository.save(match);

        return claim;
    }

    private Match upsertMatch(MatchCandidate candidate, int threshold) {
        Match match = matchRepository
            .findByLostItemIdAndFoundItemId(candidate.lost.getId(), candidate.found.getId())
            .orElseGet(Match::new);

        match.setLostItemId(candidate.lost.getId());
        match.setFoundItemId(candidate.found.getId());
        match.setScore(round(candidate.score));
        match.setThreshold(threshold);

        if (match.getStatus() == null) {
            match.setStatus(Match.MatchStatus.PENDING);
        }

        return matchRepository.save(match);
    }

    private boolean shouldNotify(MatchCandidate candidate, boolean hasStrongMatch, Instant now) {
        if (candidate.exactIdMatch) {
            return true;
        }

        Instant foundCreatedAt = toInstant(candidate.found);
        if (foundCreatedAt == null) {
            return false;
        }

        if (candidate.score >= (strongThreshold * 100.0)) {
            return !foundCreatedAt.plus(1, ChronoUnit.DAYS).isAfter(now);
        }

        if (candidate.score >= (possibleThreshold * 100.0) && !hasStrongMatch) {
            return !foundCreatedAt.plus(2, ChronoUnit.DAYS).isAfter(now);
        }

        return false;
    }

    private boolean canNotify(Match match, Instant now) {
        if (match.getStatus() == Match.MatchStatus.CLAIMED || match.getStatus() == Match.MatchStatus.EXPIRED) {
            return false;
        }

        if (match.getNotifiedAt() == null) {
            return true;
        }

        return match.getNotifiedAt().plusSeconds(resendCooldownSeconds).isBefore(now);
    }

    private void issueOtpAndNotify(Match match, MatchCandidate candidate, int threshold, Instant now) {
        String otp = generateOtp();
        match.setOtp(otp);
        match.setOtpExpiry(now.plus(Duration.ofHours(24)));
        match.setOtpAttempts(0);
        match.setNotifiedAt(now);
        match.setStatus(Match.MatchStatus.NOTIFIED);
        matchRepository.save(match);

        User recipient = userRepository.findById(candidate.lost.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("Lost reporter not found"));

        String title = threshold >= 80 ? "Strong match found for your lost item" : "Possible match found for your lost item";
        String message = "Match #" + match.getId() + " scored " + round(match.getScore()) + "% (threshold " + threshold
            + "%). OTP: " + otp;

        Notification notification = new Notification();
        notification.setUserId(recipient.getId());
        notification.setType(Notification.NotificationType.MATCH);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setRelatedId(match.getId());
        notificationRepository.save(notification);

        sendOptionalEmail(recipient.getEmail(), title, message);

        log.info(
            "match notification sent matchId={} score={} threshold={} notifiedAt={}",
            match.getId(),
            round(match.getScore()),
            threshold,
            match.getNotifiedAt());
    }

    private void sendOptionalEmail(String email, String title, String message) {
        if (mailSender == null || email == null || email.isBlank()) {
            return;
        }

        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(email);
            mail.setSubject(title);
            mail.setText(message);
            mailSender.send(mail);
        } catch (MailException ex) {
            log.warn("unable to send match email to {}: {}", email, ex.getMessage());
        }
    }

    private Match getOwnedMatch(Long matchId, Long userId) {
        Match match = matchRepository.findById(matchId)
            .orElseThrow(() -> new IllegalArgumentException("Match not found"));

        Item lostItem = match.getLostItem();
        if (lostItem == null) {
            lostItem = itemRepository.findById(match.getLostItemId())
                .orElseThrow(() -> new IllegalArgumentException("Lost item not found"));
        }

        if (!userId.equals(lostItem.getUserId())) {
            throw new IllegalArgumentException("You are not allowed to access this match");
        }

        if (match.getFoundItem() == null) {
            itemRepository.findById(match.getFoundItemId())
                .ifPresent(match::setFoundItem);
        }

        match.setLostItem(lostItem);
        return match;
    }

    private Map<String, Object> toMatchSummary(Match match) {
        Item foundItem = match.getFoundItem();
        if (foundItem == null) {
            foundItem = itemRepository.findById(match.getFoundItemId()).orElse(null);
        }

        Map<String, Object> foundSnippet = new HashMap<>();
        if (foundItem != null) {
            foundSnippet.put("id", foundItem.getId());
            foundSnippet.put("name", foundItem.getItemName());
            foundSnippet.put("category", foundItem.getCategory() != null ? foundItem.getCategory().name() : null);
            foundSnippet.put("location", foundItem.getLocation());
            foundSnippet.put("imageUrl", foundItem.getImageUrl());
            foundSnippet.put("createdAt", foundItem.getCreatedAt());
            foundSnippet.put("status", foundItem.getStatus() != null ? foundItem.getStatus().name() : null);
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("matchId", match.getId());
        payload.put("lostItemId", match.getLostItemId());
        payload.put("foundItemId", match.getFoundItemId());
        payload.put("score", round(Optional.ofNullable(match.getScore()).orElse(0.0)));
        payload.put("threshold", match.getThreshold());
        payload.put("status", match.getStatus() != null ? match.getStatus().name() : null);
        payload.put("notifiedAt", match.getNotifiedAt());
        payload.put("createdAt", match.getCreatedAt());
        payload.put("otpExpiry", match.getOtpExpiry());
        payload.put("foundItem", foundSnippet);
        return payload;
    }

    private Instant toInstant(Item item) {
        return item.getCreatedAt() != null
            ? item.getCreatedAt().atZone(Clock.systemUTC().getZone()).toInstant()
            : null;
    }

    private String generateOtp() {
        return String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1_000_000));
    }

    private boolean withinSevenDayWindow(LocalDate lostDate, LocalDate foundDate) {
        if (lostDate == null || foundDate == null) {
            return false;
        }

        long distance = Math.abs(ChronoUnit.DAYS.between(lostDate, foundDate));
        return distance <= 7;
    }

    private double dateProximityScore(LocalDate lostDate, LocalDate foundDate) {
        if (lostDate == null || foundDate == null) {
            return 0.0;
        }

        long distance = Math.abs(ChronoUnit.DAYS.between(lostDate, foundDate));
        if (distance > 7) {
            return 0.0;
        }

        return 1.0 - (distance / 7.0);
    }

    private double textSimilarity(String left, String right) {
        Set<String> leftTokens = tokenize(left);
        Set<String> rightTokens = tokenize(right);

        if (leftTokens.isEmpty() || rightTokens.isEmpty()) {
            return 0.0;
        }

        Set<String> intersection = new HashSet<>(leftTokens);
        intersection.retainAll(rightTokens);

        Set<String> union = new HashSet<>(leftTokens);
        union.addAll(rightTokens);

        return union.isEmpty() ? 0.0 : ((double) intersection.size() / union.size());
    }

    private Set<String> tokenize(String value) {
        Set<String> tokens = new HashSet<>();
        if (value == null || value.isBlank()) {
            return tokens;
        }

        String normalized = value
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9 ]", " ")
            .replaceAll("\\s+", " ")
            .trim();

        if (normalized.isBlank()) {
            return tokens;
        }

        for (String token : normalized.split(" ")) {
            if (token.length() >= 2) {
                tokens.add(token);
            }
        }

        return tokens;
    }

    private boolean isSpecialExactIdMatch(Item lost, Item found) {
        if (lost == null || found == null) {
            return false;
        }

        Set<String> lostIds = extractIdentifiers(lost);
        Set<String> foundIds = extractIdentifiers(found);

        if (lostIds.isEmpty() || foundIds.isEmpty()) {
            return false;
        }

        for (String id : lostIds) {
            if (foundIds.contains(id)) {
                return true;
            }
        }

        return false;
    }

    private Set<String> extractIdentifiers(Item item) {
        Set<String> values = new HashSet<>();

        String searchable = ((item.getItemName() == null ? "" : item.getItemName()) + " "
            + (item.getDescription() == null ? "" : item.getDescription())).toUpperCase(Locale.ROOT);

        Matcher nicMatcher = NIC_PATTERN.matcher(searchable);
        while (nicMatcher.find()) {
            values.add(nicMatcher.group().replace(" ", ""));
        }

        Matcher idMatcher = ID_PATTERN.matcher(searchable);
        while (idMatcher.find()) {
            values.add(idMatcher.group().replace(" ", "").replace("-", ""));
        }

        return values;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static final class MatchCandidate {
        private final Item lost;
        private final Item found;
        private final double score;
        private final boolean exactIdMatch;

        private MatchCandidate(Item lost, Item found, double score, boolean exactIdMatch) {
            this.lost = lost;
            this.found = found;
            this.score = score;
            this.exactIdMatch = exactIdMatch;
        }
    }
}
