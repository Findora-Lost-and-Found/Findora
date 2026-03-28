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
    private static final Pattern CARD_LAST4_HINT_PATTERN = Pattern.compile("(?i)(?:last\\s*4[^0-9]*|ending[^0-9]*)(\\d{4})");

    private final MatchRepository matchRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final ClaimCreationService claimCreationService;
    private final Clock clock;
    private final JavaMailSender mailSender;

    @Value("${app.matching.threshold.found:0.75}")
    private double strongThreshold;

    @Value("${app.matching.threshold.possible:0.60}")
    private double possibleThreshold;

    @Value("${app.matching.weight.description:0.55}")
    private double descriptionWeight;

    @Value("${app.matching.weight.location:0.25}")
    private double locationWeight;

    @Value("${app.matching.weight.date:0.10}")
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
            if (!hasRequiredDescription(lost)) {
                continue;
            }

            List<Item> candidates = foundByCategory.getOrDefault(lost.getCategory(), List.of());
            if (candidates.isEmpty()) {
                continue;
            }

            List<MatchCandidate> scoredCandidates = new ArrayList<>();
            for (Item found : candidates) {
                if (!hasRequiredDescription(found)) {
                    continue;
                }

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
        if (lost == null || found == null) {
            return 0.0;
        }

        if (!hasRequiredDescription(lost) || !hasRequiredDescription(found)) {
            return 0.0;
        }

        if (isSpecialExactIdMatch(lost, found)) {
            return 100.0;
        }

        double descriptionScore = calculateDescriptionSimilarity(lost.getDescription(), found.getDescription());
        double locationScore = calculateLocationSimilarity(splitLocationHints(lost.getLocation()), found.getLocation());
        double dateScore = calculateDateSimilarity(lost.getDate(), found.getDate());
        LocalTime lostFrom = offsetTime(lost.getTime(), -90);
        LocalTime lostTo = offsetTime(lost.getTime(), 180);
        double timeScore = calculateTimeSimilarity(lostFrom, lostTo, found.getTime());

        double weighted = (descriptionScore * descriptionWeight)
            + (locationScore * locationWeight)
            + (dateScore * dateWeight)
            + (timeScore * timeWeight);

        double normalized = weighted / Math.max(0.0001,
            (descriptionWeight + locationWeight + dateWeight + timeWeight));

        double finalScore = Math.max(0.0, Math.min(100.0, normalized));

        if (descriptionScore > 80.0) {
            finalScore += 10.0;
        }

        if (locationScore > 70.0) {
            finalScore += 5.0;
        }

        return Math.min(100.0, finalScore);
    }

    private boolean hasRequiredDescription(Item item) {
        return item != null && item.getDescription() != null && !item.getDescription().isBlank();
    }

    private double calculateDescriptionSimilarity(String lostDescription, String foundDescription) {
        return textSimilarityScore(lostDescription, foundDescription);
    }

    private double calculateLocationSimilarity(List<String> lostLocations, String foundLocation) {
        if (lostLocations == null || lostLocations.isEmpty() || foundLocation == null || foundLocation.isBlank()) {
            return 0.0;
        }

        double best = 0.0;
        for (String lostLocation : lostLocations) {
            best = Math.max(best, textSimilarityScore(lostLocation, foundLocation));
            if (best >= 100.0) {
                return 100.0;
            }
        }
        return best;
    }

    private double calculateDateSimilarity(LocalDate lostDate, LocalDate foundDate) {
        if (lostDate == null || foundDate == null) {
            return 0.0;
        }

        long differenceDays = Math.abs(ChronoUnit.DAYS.between(lostDate, foundDate));
        if (differenceDays == 0) {
            return 100.0;
        }
        if (differenceDays <= 1) {
            return 80.0;
        }
        if (differenceDays <= 3) {
            return 60.0;
        }
        return 0.0;
    }

    private double calculateTimeSimilarity(LocalTime lostFrom, LocalTime lostTo, LocalTime foundTime) {
        if (lostFrom == null || lostTo == null || foundTime == null) {
            return 0.0;
        }

        int fromMinutes = lostFrom.getHour() * 60 + lostFrom.getMinute();
        int toMinutes = lostTo.getHour() * 60 + lostTo.getMinute();
        int foundMinutes = foundTime.getHour() * 60 + foundTime.getMinute();

        if (toMinutes < fromMinutes) {
            int swap = fromMinutes;
            fromMinutes = toMinutes;
            toMinutes = swap;
        }

        if (foundMinutes >= fromMinutes && foundMinutes <= toMinutes) {
            return 100.0;
        }

        int distanceToRange = foundMinutes < fromMinutes
            ? (fromMinutes - foundMinutes)
            : (foundMinutes - toMinutes);

        if (distanceToRange <= 30) {
            return 70.0;
        }
        if (distanceToRange <= 120) {
            return 40.0;
        }
        return 10.0;
    }

    private double textSimilarityScore(String left, String right) {
        String normalizedLeft = normalizeText(left);
        String normalizedRight = normalizeText(right);

        if (normalizedLeft.isBlank() || normalizedRight.isBlank()) {
            return 0.0;
        }

        Set<String> leftTokens = tokenize(normalizedLeft);
        Set<String> rightTokens = tokenize(normalizedRight);

        double tokenOverlapScore = jaccardSimilarity(leftTokens, rightTokens) * 100.0;
        double fuzzyTokenScore = fuzzyTokenSimilarity(leftTokens, rightTokens) * 100.0;

        int maxLen = Math.max(normalizedLeft.length(), normalizedRight.length());
        int editDistance = levenshteinDistance(normalizedLeft, normalizedRight);
        double editScore = maxLen == 0 ? 0.0 : (1.0 - ((double) editDistance / maxLen)) * 100.0;

        double combined = (tokenOverlapScore * 0.20)
            + (fuzzyTokenScore * 0.50)
            + (Math.max(0.0, editScore) * 0.30);

        return Math.max(0.0, Math.min(100.0, combined));
    }

    private double fuzzyTokenSimilarity(Set<String> leftTokens, Set<String> rightTokens) {
        if (leftTokens.isEmpty() || rightTokens.isEmpty()) {
            return 0.0;
        }

        double total = 0.0;
        int compared = 0;

        for (String left : leftTokens) {
            double best = 0.0;
            for (String right : rightTokens) {
                int maxLen = Math.max(left.length(), right.length());
                if (maxLen == 0) {
                    continue;
                }
                int distance = levenshteinDistance(left, right);
                double similarity = 1.0 - ((double) distance / maxLen);
                best = Math.max(best, similarity);
                if (best >= 1.0) {
                    break;
                }
            }
            total += Math.max(0.0, best);
            compared++;
        }

        return compared == 0 ? 0.0 : (total / compared);
    }

    private double jaccardSimilarity(Set<String> leftTokens, Set<String> rightTokens) {
        if (leftTokens.isEmpty() || rightTokens.isEmpty()) {
            return 0.0;
        }

        Set<String> intersection = new HashSet<>(leftTokens);
        intersection.retainAll(rightTokens);

        Set<String> union = new HashSet<>(leftTokens);
        union.addAll(rightTokens);

        return union.isEmpty() ? 0.0 : ((double) intersection.size() / union.size());
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

    private LocalTime offsetTime(LocalTime base, int minutes) {
        if (base == null) {
            return null;
        }

        int total = (base.getHour() * 60) + base.getMinute() + minutes;
        int clamped = Math.max(0, Math.min((24 * 60) - 1, total));
        return LocalTime.of(clamped / 60, clamped % 60);
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

        Set<String> lostNics = extractNicIdentifiers(lost);
        Set<String> foundNics = extractNicIdentifiers(found);
        if (hasIntersection(lostNics, foundNics)) {
            return true;
        }

        Set<String> lostGeneralIds = extractGeneralIdentifiers(lost);
        Set<String> foundGeneralIds = extractGeneralIdentifiers(found);
        if (hasIntersection(lostGeneralIds, foundGeneralIds)) {
            return true;
        }

        Set<String> lostCardLast4 = extractCardLast4Identifiers(lost);
        Set<String> foundCardLast4 = extractCardLast4Identifiers(found);
        return hasIntersection(lostCardLast4, foundCardLast4);
    }

    private boolean hasIntersection(Set<String> left, Set<String> right) {
        if (left.isEmpty() || right.isEmpty()) {
            return false;
        }

        for (String value : left) {
            if (right.contains(value)) {
                return true;
            }
        }
        return false;
    }

    private Set<String> extractNicIdentifiers(Item item) {
        Set<String> values = new HashSet<>();
        String searchable = toSearchableCorpus(item);
        Matcher nicMatcher = NIC_PATTERN.matcher(searchable);
        while (nicMatcher.find()) {
            values.add(nicMatcher.group().replace(" ", ""));
        }
        return values;
    }

    private Set<String> extractGeneralIdentifiers(Item item) {
        Set<String> values = new HashSet<>();
        String searchable = toSearchableCorpus(item);
        Matcher idMatcher = ID_PATTERN.matcher(searchable);
        while (idMatcher.find()) {
            values.add(idMatcher.group().replace(" ", "").replace("-", ""));
        }
        return values;
    }

    private Set<String> extractCardLast4Identifiers(Item item) {
        Set<String> values = new HashSet<>();
        String searchable = toSearchableCorpus(item);

        Matcher privateCardMatcher = PRIVATE_CARD_PATTERN.matcher(searchable);
        while (privateCardMatcher.find()) {
            String card = privateCardMatcher.group(1);
            values.add(card.substring(card.length() - 4));
        }

        Matcher cardMatcher = CARD16_PATTERN.matcher(searchable);
        while (cardMatcher.find()) {
            String card = cardMatcher.group();
            values.add(card.substring(card.length() - 4));
        }

        Matcher hintMatcher = CARD_LAST4_HINT_PATTERN.matcher(searchable);
        while (hintMatcher.find()) {
            values.add(hintMatcher.group(1));
        }

        return values;
    }

    private String toSearchableCorpus(Item item) {
        if (item == null) {
            return "";
        }

        return ((item.getItemName() == null ? "" : item.getItemName()) + " "
            + (item.getDescription() == null ? "" : item.getDescription())).toUpperCase(Locale.ROOT);
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
