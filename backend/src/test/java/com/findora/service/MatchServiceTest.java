package com.findora.service;

import java.lang.reflect.Constructor;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.test.util.ReflectionTestUtils;

import com.findora.model.Claim;
import com.findora.model.Item;
import com.findora.model.ItemCategory;
import com.findora.model.ItemStatus;
import com.findora.model.ItemType;
import com.findora.model.Match;
import com.findora.repository.ItemRepository;
import com.findora.repository.NotificationRepository;
import com.findora.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings({"null", "unchecked"})
class MatchServiceTest {

    private JpaRepository<Match, Long> matchRepository;
    @Mock
    private ItemRepository itemRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private ClaimCreationService claimCreationService;
    @Mock
    private ObjectProvider<org.springframework.mail.javamail.JavaMailSender> mailSenderProvider;

    private MatchService matchService;

    @BeforeEach
    void setUp() throws Exception {
        Clock clock = Clock.fixed(Instant.parse("2026-03-16T10:00:00Z"), ZoneOffset.UTC);
        when(mailSenderProvider.getIfAvailable()).thenReturn(null);

        Class<?> matchRepositoryClass = Class.forName("com.findora.repository.MatchRepository");
        Object matchRepositoryProxy = org.mockito.Mockito.mock(matchRepositoryClass);
        @SuppressWarnings("unchecked")
        JpaRepository<Match, Long> castedRepository = (JpaRepository<Match, Long>) matchRepositoryProxy;
        this.matchRepository = castedRepository;
        Constructor<MatchService> constructor = MatchService.class.getConstructor(
            matchRepositoryClass,
            ItemRepository.class,
            UserRepository.class,
            NotificationRepository.class,
            ClaimCreationService.class,
            Clock.class,
            ObjectProvider.class
        );

        matchService = constructor.newInstance(
            matchRepositoryProxy,
            itemRepository,
            userRepository,
            notificationRepository,
            claimCreationService,
            clock,
            mailSenderProvider
        );

        ReflectionTestUtils.setField(matchService, "strongThreshold", 0.80);
        ReflectionTestUtils.setField(matchService, "possibleThreshold", 0.60);
        ReflectionTestUtils.setField(matchService, "descriptionWeight", 0.55);
        ReflectionTestUtils.setField(matchService, "locationWeight", 0.25);
        ReflectionTestUtils.setField(matchService, "dateWeight", 0.10);
        ReflectionTestUtils.setField(matchService, "timeWeight", 0.10);
    }

    @Test
    void computeScoreShouldReturnHundredForExactIdMatch() {
        Item lost = buildItem(1L, 10L, ItemCategory.NIC, "Lost NIC", "NIC 123456789V", "Library");
        Item found = buildItem(2L, 11L, ItemCategory.NIC, "Found card", "Contains 123456789V", "Library");

        double score = matchService.computeScore(lost, found);

        assertThat(score).isEqualTo(100.0);
    }

    @Test
    void computeScoreShouldApplyWeights() {
        Item lost = buildItem(1L, 10L, ItemCategory.WALLET, "Black wallet", "wallet with cards", "Main gate");
        Item found = buildItem(2L, 11L, ItemCategory.WALLET, "Black wallet", "wallet with cards", "Main gate");

        double score = matchService.computeScore(lost, found);

        assertThat(score).isGreaterThanOrEqualTo(90.0);
    }

    @Test
    void claimMatchShouldRejectInvalidOtp() {
        Match match = buildMatch("123456", Instant.parse("2026-03-17T10:00:00Z"));
        when(matchRepository.findById(55L)).thenReturn(Optional.of(match));

        IllegalArgumentException ex = assertThrows(
            IllegalArgumentException.class,
            () -> matchService.claimMatch(55L, "000000", 10L)
        );

        assertThat(ex.getMessage()).isEqualTo("Invalid OTP");
        verify(matchRepository).save(any(Match.class));
    }

    @Test
    void claimMatchShouldRejectExpiredOtp() {
        Match match = buildMatch("123456", Instant.parse("2026-03-15T10:00:00Z"));
        when(matchRepository.findById(55L)).thenReturn(Optional.of(match));

        IllegalArgumentException ex = assertThrows(
            IllegalArgumentException.class,
            () -> matchService.claimMatch(55L, "123456", 10L)
        );

        assertThat(ex.getMessage()).isEqualTo("OTP has expired");
    }

    @Test
    void claimMatchShouldCreateClaimOnValidOtp() {
        Match match = buildMatch("123456", Instant.parse("2026-03-17T10:00:00Z"));
        Claim claim = new Claim();
        claim.setId(100L);
        claim.setItemId(match.getFoundItemId());
        claim.setOtp("654321");

        when(matchRepository.findById(55L)).thenReturn(Optional.of(match));
        when(claimCreationService.createClaimForItem(match.getFoundItemId(), 10L)).thenReturn(claim);

        Claim created = matchService.claimMatch(55L, "123456", 10L);

        assertThat(created.getId()).isEqualTo(100L);
        verify(claimCreationService).createClaimForItem(match.getFoundItemId(), 10L);
        verify(matchRepository).save(any(Match.class));
    }

    private Item buildItem(Long id, Long userId, ItemCategory category, String name, String description, String location) {
        Item item = new Item();
        item.setId(id);
        item.setUserId(userId);
        item.setType(ItemType.LOST);
        item.setStatus(ItemStatus.ACTIVE);
        item.setCategory(category);
        item.setItemName(name);
        item.setDescription(description);
        item.setLocation(location);
        item.setDate(LocalDate.of(2026, 3, 15));
        item.setTime(LocalTime.of(10, 30));
        return item;
    }

    private Match buildMatch(String otp, Instant expiry) {
        Item lost = buildItem(1L, 10L, ItemCategory.WALLET, "Lost wallet", "desc", "Main gate");
        lost.setType(ItemType.LOST);

        Item found = buildItem(2L, 20L, ItemCategory.WALLET, "Found wallet", "desc", "Main gate");
        found.setType(ItemType.FOUND);

        Match match = new Match();
        match.setId(55L);
        match.setLostItemId(lost.getId());
        match.setFoundItemId(found.getId());
        match.setLostItem(lost);
        match.setFoundItem(found);
        match.setStatus(Match.MatchStatus.NOTIFIED);
        match.setOtpAttempts(0);
        match.setOtp(otp);
        match.setOtpExpiry(expiry);
        return match;
    }
}
