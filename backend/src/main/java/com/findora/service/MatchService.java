package com.findora.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
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
    private static final Pattern CARD16_PATTERN = Pattern.compile("\\b\\d{16}\\b");
    private static final Pattern PRIVATE_CARD_PATTERN = Pattern.compile("__PRIVATE_CARD__=(\\d{16})");

    private final MatchRepository matchRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final ClaimCreationService claimCreationService;
    private final Clock clock;
    private final JavaMailSender mailSender;

    @Value("${app.matching.threshold.found:0.70}")
    private double strongThreshold;

    @Value("${app.matching.threshold.possible:0.50}")
    private double possibleThreshold;

    @Value("${app.matching.weight.name:0.10}")
    private double nameWeight;

    @Value("${app.matching.weight.description:0.45}")
    private double descriptionWeight;

    @Value("${app.matching.weight.location:0.30}")
    private double locationWeight;

    @Value("${app.matching.weight.date:0.05}")
    private double dateWeight;

    @Value("${app.matching.weight.time:0.10}")
    private double timeWeight;

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
                int threshold = candidate.exactIdMatch
                    ? 100
                    : (candidate.score >= (strongThreshold * 100.0)
                        ? (int) Math.round(strongThreshold * 100.0)
                        : (int) Math.round(possibleThreshold * 100.0));
                Match match = upsertMatch(candidate, threshold);

                if (shouldNotify(candidate, hasStrongMatch) && canNotify(match, now)) {
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

        double bankCardSimilarity = bankCardNumberSimilarity(lost, found);

        double nameScore = enhancedTextSimilarity(lost.getItemName(), found.getItemName());
        double descriptionScore = descriptionSimilarity(lost.getDescription(), found.getDescription());
        String foundEvidenceCorpus = String.join(" ",
            Optional.ofNullable(found.getItemName()).orElse(""),
            Optional.ofNullable(found.getDescription()).orElse(""),
            Optional.ofNullable(found.getLocation()).orElse(""));
        double keywordEvidence = keywordOverlapScore(lost.getDescription(), foundEvidenceCorpus);
        List<String> lostLocations = splitLocationHints(lost.getLocation());
        double locationScore = bestLocationSimilarity(lostLocations, found.getLocation());
        double dateScore = Math.max(1.0, cappedDateProximityScore(lost.getDate(), found.getDate()));
        LocalTime lostFrom = offsetTime(lost.getTime(), -90);
        LocalTime lostTo = offsetTime(lost.getTime(), 180);
        double timeScore = Math.max(1.0, timeConsistencyScore(lostFrom, lostTo, found.getTime()));

        double weighted = (nameScore * nameWeight)
            + (descriptionScore * descriptionWeight)
            + (locationScore * locationWeight)
            + (dateScore * dateWeight)
            + (timeScore * timeWeight);

        double normalized = weighted / Math.max(0.0001,
            (nameWeight + descriptionWeight + locationWeight + dateWeight + timeWeight));

        double finalScore = Math.max(0.0, Math.min(100.0, normalized * 100.0));

        if (keywordEvidence > 0.0) {
            double keywordBoost = Math.min(18.0, keywordEvidence * 30.0);
            finalScore = Math.min(100.0, finalScore + keywordBoost);
        }

        // Near bank-card number matches should remain high confidence.
        if (bankCardSimilarity >= 0.93) {
            finalScore = Math.max(finalScore, 93.0);
        } else if (bankCardSimilarity >= 0.86) {
            finalScore = Math.max(finalScore, 86.0);
        }

        // Strong real-world alignment should still produce OTP-eligible confidence.
        if (descriptionScore >= 0.75 && locationScore >= 0.70 && timeScore >= 0.60) {
            finalScore = Math.max(finalScore, 85.0);
        }

        return Math.min(100.0, finalScore);
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

        Integer threshold = Optional.ofNullable(match.getThreshold()).orElse((int) Math.round(strongThreshold * 100.0));
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

    private boolean shouldNotify(MatchCandidate candidate, boolean hasStrongMatch) {
        if (candidate.exactIdMatch) {
            return true;
        }

        if (candidate.score >= (strongThreshold * 100.0)) {
            return true;
        }

        return candidate.score >= (possibleThreshold * 100.0) && !hasStrongMatch;
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

        int strongThresholdPercent = (int) Math.round(strongThreshold * 100.0);
        String title = threshold >= strongThresholdPercent
            ? "Strong match found for your lost item"
            : "Possible match found for your lost item";
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

    private double cappedDateProximityScore(LocalDate lostDate, LocalDate foundDate) {
        double base = dateProximityScore(lostDate, foundDate);
        if (base <= 0.0) {
            return 0.0;
        }

        // Keep date meaningful but avoid over-penalizing valid matches within the 7-day window.
        return 0.70 + (base * 0.30);
    }

    private double timeConsistencyScore(LocalTime lostFrom, LocalTime lostTo, LocalTime foundTime) {
        if (lostFrom == null || lostTo == null || foundTime == null) {
            return 0.0;
        }

        int fromMinutes = lostFrom.getHour() * 60 + lostFrom.getMinute();
        int toMinutes = lostTo.getHour() * 60 + lostTo.getMinute();
        int foundMinutes = foundTime.getHour() * 60 + foundTime.getMinute();

        if (toMinutes < fromMinutes) {
            int temp = fromMinutes;
            fromMinutes = toMinutes;
            toMinutes = temp;
        }

        if (foundMinutes < fromMinutes) {
            return 0.0;
        }

        if (foundMinutes <= toMinutes) {
            return 1.0;
        }

        int minutesAfterRange = foundMinutes - toMinutes;
        if (minutesAfterRange <= 120) {
            return 0.78;
        }

        if (minutesAfterRange <= 360) {
            double decay = (minutesAfterRange - 120) / 240.0;
            return 0.78 - (decay * 0.28);
        }

        if (minutesAfterRange <= 720) {
            double decay = (minutesAfterRange - 360) / 360.0;
            return 0.50 - (decay * 0.20);
        }

        return 0.30;
    }

    private double bestLocationSimilarity(List<String> lostLocations, String foundLocation) {
        if (lostLocations == null || lostLocations.isEmpty()) {
            return 0.0;
        }

        double best = 0.0;
        for (String candidate : lostLocations) {
            best = Math.max(best, locationPhraseSimilarity(candidate, foundLocation));
        }
        return best;
    }

    private double locationPhraseSimilarity(String lostLocation, String foundLocation) {
        String left = normalizeText(lostLocation);
        String right = normalizeText(foundLocation);

        if (left.isBlank() || right.isBlank()) {
            return 0.0;
        }

        double best = enhancedTextSimilarity(left, right);

        if (left.contains(right) || right.contains(left)) {
            best = Math.max(best, 0.92);
        }

        String compactLeft = left.replace(" ", "");
        String compactRight = right.replace(" ", "");
        int compactMaxLen = Math.max(compactLeft.length(), compactRight.length());
        if (compactMaxLen > 0) {
            int compactDistance = levenshteinDistance(compactLeft, compactRight);
            double compactEditScore = 1.0 - ((double) compactDistance / compactMaxLen);
            best = Math.max(best, compactEditScore);
        }

        Set<String> leftTokens = tokenize(left);
        Set<String> rightTokens = tokenize(right);

        Set<String> tokenIntersection = new HashSet<>(leftTokens);
        tokenIntersection.retainAll(rightTokens);
        if (!tokenIntersection.isEmpty()) {
            double overlap = (double) tokenIntersection.size() / Math.max(1, leftTokens.size());
            best = Math.max(best, 0.85 + (0.15 * overlap));
        }

        for (String leftToken : leftTokens) {
            for (String rightToken : rightTokens) {
                int maxLen = Math.max(leftToken.length(), rightToken.length());
                if (maxLen < 3) {
                    continue;
                }
                int distance = levenshteinDistance(leftToken, rightToken);
                double tokenEditScore = 1.0 - ((double) distance / maxLen);
                best = Math.max(best, tokenEditScore);
            }
        }

        return Math.max(0.0, Math.min(1.0, best));
    }

    private List<String> splitLocationHints(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }

        String[] rawParts = value.split("\\s*,\\s*|\\s*\\|\\s*|\\s*;\\s*|\\r?\\n");
        List<String> parts = new ArrayList<>();
        for (String part : rawParts) {
            if (part != null && !part.isBlank()) {
                parts.add(part.trim());
            }
        }

        if (!parts.isEmpty()) {
            return parts;
        }

        return List.of(value.trim());
    }

    private double keywordOverlapScore(String left, String right) {
        Set<String> leftTokens = tokenize(left);
        Set<String> rightTokens = tokenize(right);

        if (leftTokens.isEmpty() || rightTokens.isEmpty()) {
            return 0.0;
        }

        Set<String> intersection = new HashSet<>(leftTokens);
        intersection.retainAll(rightTokens);

        return (double) intersection.size() / Math.max(1, leftTokens.size());
    }

    private LocalTime offsetTime(LocalTime base, int minutes) {
        if (base == null) {
            return null;
        }

        int total = (base.getHour() * 60) + base.getMinute() + minutes;
        int clamped = Math.max(0, Math.min((24 * 60) - 1, total));
        return LocalTime.of(clamped / 60, clamped % 60);
    }

    private double descriptionSimilarity(String left, String right) {
        double weightedJaccard = weightedTokenSimilarity(left, right);
        double semantic = enhancedTextSimilarity(left, right);
        return Math.max(0.0, Math.min(1.0, (weightedJaccard * 0.7) + (semantic * 0.3)));
    }

    private double weightedTokenSimilarity(String left, String right) {
        Map<String, Integer> leftFreq = tokenFrequency(left);
        Map<String, Integer> rightFreq = tokenFrequency(right);

        if (leftFreq.isEmpty() || rightFreq.isEmpty()) {
            return 0.0;
        }

        Set<String> vocabulary = new HashSet<>();
        vocabulary.addAll(leftFreq.keySet());
        vocabulary.addAll(rightFreq.keySet());

        double minSum = 0.0;
        double maxSum = 0.0;

        for (String token : vocabulary) {
            int leftCount = leftFreq.getOrDefault(token, 0);
            int rightCount = rightFreq.getOrDefault(token, 0);
            minSum += Math.min(leftCount, rightCount);
            maxSum += Math.max(leftCount, rightCount);
        }

        if (maxSum <= 0.0) {
            return 0.0;
        }

        return minSum / maxSum;
    }

    private Map<String, Integer> tokenFrequency(String value) {
        Map<String, Integer> frequency = new HashMap<>();
        if (value == null || value.isBlank()) {
            return frequency;
        }

        String normalized = normalizeText(value);
        if (normalized.isBlank()) {
            return frequency;
        }

        for (String token : normalized.split(" ")) {
            if (token.length() < 2) {
                continue;
            }
            frequency.merge(token, 1, Integer::sum);
        }

        return frequency;
    }

    private double enhancedTextSimilarity(String left, String right) {
        String normalizedLeft = normalizeText(left);
        String normalizedRight = normalizeText(right);

        if (normalizedLeft.isBlank() || normalizedRight.isBlank()) {
            return 0.0;
        }

        double tokenScore = textSimilarity(normalizedLeft, normalizedRight);

        int maxLen = Math.max(normalizedLeft.length(), normalizedRight.length());
        if (maxLen <= 24) {
            int distance = levenshteinDistance(normalizedLeft, normalizedRight);
            double editScore = 1.0 - ((double) distance / Math.max(1, maxLen));
            return Math.max(0.0, Math.min(1.0, (editScore * 0.6) + (tokenScore * 0.4)));
        }

        return tokenScore;
    }

    private int levenshteinDistance(String left, String right) {
        int[] previous = new int[right.length() + 1];
        int[] current = new int[right.length() + 1];

        for (int j = 0; j <= right.length(); j++) {
            previous[j] = j;
        }

        for (int i = 1; i <= left.length(); i++) {
            current[0] = i;
            for (int j = 1; j <= right.length(); j++) {
                int cost = left.charAt(i - 1) == right.charAt(j - 1) ? 0 : 1;
                current[j] = Math.min(
                    Math.min(current[j - 1] + 1, previous[j] + 1),
                    previous[j - 1] + cost
                );
            }

            int[] temp = previous;
            previous = current;
            current = temp;
        }

        return previous[right.length()];
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }

        return value
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9 ]", " ")
            .replaceAll("\\s+", " ")
            .trim();
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

        Matcher privateCardMatcher = PRIVATE_CARD_PATTERN.matcher(searchable);
        while (privateCardMatcher.find()) {
            values.add(privateCardMatcher.group(1));
        }

        Matcher cardMatcher = CARD16_PATTERN.matcher(searchable);
        while (cardMatcher.find()) {
            values.add(cardMatcher.group());
        }

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

    private double bankCardNumberSimilarity(Item lost, Item found) {
        String lostCard = extractPrimaryCardNumber(lost);
        String foundCard = extractPrimaryCardNumber(found);

        if (lostCard.isBlank() || foundCard.isBlank()) {
            return 0.0;
        }

        if (lostCard.equals(foundCard)) {
            return 1.0;
        }

        int distance = levenshteinDistance(lostCard, foundCard);
        if (distance == 1) {
            return 0.93;
        }
        if (distance == 2) {
            return 0.86;
        }
        if (distance == 3) {
            return 0.70;
        }

        return 0.0;
    }

    private String extractPrimaryCardNumber(Item item) {
        if (item == null) {
            return "";
        }

        String text = ((item.getItemName() == null ? "" : item.getItemName()) + " "
            + (item.getDescription() == null ? "" : item.getDescription())).toUpperCase(Locale.ROOT);

        Matcher privateCardMatcher = PRIVATE_CARD_PATTERN.matcher(text);
        if (privateCardMatcher.find()) {
            return privateCardMatcher.group(1);
        }

        Matcher cardMatcher = CARD16_PATTERN.matcher(text);
        if (cardMatcher.find()) {
            return cardMatcher.group();
        }

        return "";
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
