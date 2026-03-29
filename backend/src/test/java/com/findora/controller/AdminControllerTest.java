package com.findora.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.findora.model.Item;
import com.findora.model.ItemCategory;
import com.findora.model.ItemStatus;
import com.findora.model.ItemType;
import com.findora.model.Report;
import com.findora.model.User;
import com.findora.repository.ItemRepository;
import com.findora.repository.ReportRepository;
import com.findora.repository.SecurityTransactionRepository;
import com.findora.repository.UserRepository;
import com.findora.security.JwtAuthenticationFilter;
import com.findora.service.AccessControlService;

@WebMvcTest(AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private ItemRepository itemRepository;

    @MockBean
    private ReportRepository reportRepository;

    @MockBean
    private SecurityTransactionRepository securityTransactionRepository;

    @MockBean
    private AccessControlService accessControlService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void declineUserShouldPersistSuspendedPendingState() throws Exception {
        User user = new User();
        user.setId(5L);
        user.setUsername("pending-security");
        user.setRole(User.UserRole.SECURITY);
        user.setIsApproved(false);
        user.setIsSuspended(false);

        when(userRepository.findById(5L)).thenReturn(Optional.of(user));

        mockMvc.perform(put("/api/admin/decline-user/5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("User declined"));

        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());
        org.assertj.core.api.Assertions.assertThat(savedUser.getValue().getIsApproved()).isFalse();
        org.assertj.core.api.Assertions.assertThat(savedUser.getValue().getIsSuspended()).isTrue();
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void getPendingApprovalsShouldExcludeDeclinedSuspendedUsers() throws Exception {
        User visible = new User();
        visible.setId(1L);
        visible.setUsername("visible-user");
        visible.setFullName("Visible User");
        visible.setEmail("visible@example.com");
        visible.setRole(User.UserRole.SECURITY);
        visible.setIsApproved(false);
        visible.setIsSuspended(false);
        visible.setCreatedAt(LocalDateTime.now());

        User declined = new User();
        declined.setId(2L);
        declined.setUsername("declined-user");
        declined.setFullName("Declined User");
        declined.setEmail("declined@example.com");
        declined.setRole(User.UserRole.STAFF);
        declined.setIsApproved(false);
        declined.setIsSuspended(true);
        declined.setCreatedAt(LocalDateTime.now());

        when(userRepository.findAll(any(org.springframework.data.domain.Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(visible, declined)));

        mockMvc.perform(get("/api/admin/pending-approvals"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.approvals.length()").value(1))
            .andExpect(jsonPath("$.approvals[0].username").value("visible-user"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void getReportsShouldReturnAdminReportRows() throws Exception {
        User reporter = new User();
        reporter.setId(20L);
        reporter.setUsername("reporter");
        reporter.setFullName("Reporter User");

        Item item = new Item();
        item.setId(30L);
        item.setUserId(99L);
        item.setType(ItemType.FOUND);
        item.setCategory(ItemCategory.WALLET);
        item.setItemName("Blue Wallet");
        item.setLocation("Library");
        item.setDate(LocalDate.of(2026, 3, 17));
        item.setTime(LocalTime.NOON);
        item.setStatus(ItemStatus.ACTIVE);

        Report report = new Report();
        report.setId(40L);
        report.setReporterId(reporter.getId());
        report.setReporter(reporter);
        report.setItemId(item.getId());
        report.setItem(item);
        report.setReason("Spam");
        report.setStatus(Report.ReportStatus.PENDING);
        report.setCreatedAt(LocalDateTime.of(2026, 3, 17, 12, 0));

        when(reportRepository.findAll(any(org.springframework.data.domain.Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(report)));
        when(reportRepository.countByStatus(Report.ReportStatus.PENDING)).thenReturn(1L);

        mockMvc.perform(get("/api/admin/reports"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reports.length()").value(1))
            .andExpect(jsonPath("$.reports[0].id").value(40))
            .andExpect(jsonPath("$.reports[0].reporter_username").value("reporter"))
            .andExpect(jsonPath("$.reports[0].item_name").value("Blue Wallet"));
    }
}