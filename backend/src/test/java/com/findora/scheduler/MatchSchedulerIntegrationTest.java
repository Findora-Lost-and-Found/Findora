package com.findora.scheduler;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.findora.model.Item;
import com.findora.model.ItemCategory;
import com.findora.model.ItemStatus;
import com.findora.model.ItemType;
import com.findora.model.Match;
import com.findora.model.Notification;
import com.findora.model.User;
import com.findora.repository.ClaimRepository;
import com.findora.repository.ItemRepository;
import com.findora.repository.MatchRepository;
import com.findora.repository.NotificationRepository;
import com.findora.repository.UserRepository;
import com.findora.service.MatchService;

@SpringBootTest
@ActiveProfiles("test")
class MatchSchedulerIntegrationTest {

    @Autowired
    private MatchService matchService;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClaimRepository claimRepository;

    @BeforeEach
    void setUp() {
        claimRepository.deleteAll();
        notificationRepository.deleteAll();
        matchRepository.deleteAll();
        itemRepository.deleteAll();
        userRepository.deleteAll();

        User lostReporter = new User();
        lostReporter.setUsername("lost-user");
        lostReporter.setEmail("lost@example.com");
        lostReporter.setPassword("x");
        lostReporter.setFullName("Lost Reporter");
        lostReporter.setRole(User.UserRole.STUDENT);
        lostReporter.setIsVerified(true);
        lostReporter.setIsApproved(true);
        lostReporter = userRepository.save(lostReporter);

        User finder = new User();
        finder.setUsername("found-user");
        finder.setEmail("found@example.com");
        finder.setPassword("x");
        finder.setFullName("Finder");
        finder.setRole(User.UserRole.STUDENT);
        finder.setIsVerified(true);
        finder.setIsApproved(true);
        finder = userRepository.save(finder);

        Item lost = new Item();
        lost.setUserId(lostReporter.getId());
        lost.setType(ItemType.LOST);
        lost.setCategory(ItemCategory.NIC);
        lost.setItemName("Lost NIC card");
        lost.setDescription("NIC 123456789V");
        lost.setLocation("Library");
        lost.setDate(LocalDate.of(2026, 3, 16));
        lost.setTime(LocalTime.of(10, 0));
        lost.setStatus(ItemStatus.ACTIVE);
        itemRepository.save(lost);

        Item found = new Item();
        found.setUserId(finder.getId());
        found.setType(ItemType.FOUND);
        found.setCategory(ItemCategory.NIC);
        found.setItemName("NIC found near library");
        found.setDescription("Found ID 123456789V near gate");
        found.setLocation("Library");
        found.setDate(LocalDate.of(2026, 3, 16));
        found.setTime(LocalTime.of(11, 0));
        found.setStatus(ItemStatus.ACTIVE);
        itemRepository.save(found);
    }

    @Test
    @SuppressWarnings("unused")
    void scheduledSweepShouldCreateAndNotifyExactIdMatch() {
        int notifications = matchService.runScheduledMatchingSweep();

        assertThat(notifications).isGreaterThan(0);

        Match match = matchRepository.findAll().stream().findFirst().orElseThrow();
        assertThat(match.getStatus()).isEqualTo(Match.MatchStatus.NOTIFIED);
        assertThat(match.getOtp()).isNotBlank();
        assertThat(match.getNotifiedAt()).isNotNull();

        Notification notification = notificationRepository.findAll().stream().findFirst().orElseThrow();
        assertThat(notification.getType()).isEqualTo(Notification.NotificationType.MATCH);
        assertThat(notification.getRelatedId()).isEqualTo(match.getId());
    }
}
