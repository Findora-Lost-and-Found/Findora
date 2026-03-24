package com.findora.controller;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.findora.model.Item;
import com.findora.model.ItemCategory;
import com.findora.model.ItemStatus;
import com.findora.model.ItemType;
import com.findora.model.Report;
import com.findora.model.User;
import com.findora.repository.ItemRepository;
import com.findora.repository.ReportRepository;
import com.findora.repository.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReportControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Item item;

    @BeforeEach
    
    void setUp() {
        reportRepository.deleteAll();
        itemRepository.deleteAll();
        userRepository.deleteAll();

        User owner = new User();
        owner.setUsername("owner");
        owner.setEmail("owner@example.com");
        owner.setPassword(passwordEncoder.encode("OwnerPass@123"));
        owner.setFullName("Owner User");
        owner.setRole(User.UserRole.STUDENT);
        owner.setIsVerified(true);
        owner.setIsApproved(true);
        owner = userRepository.save(owner);

        User reporter = new User();
        reporter.setUsername("reporter");
        reporter.setEmail("reporter@example.com");
        reporter.setPassword(passwordEncoder.encode("ReporterPass@123"));
        reporter.setFullName("Reporter User");
        reporter.setRole(User.UserRole.STUDENT);
        reporter.setIsVerified(true);
        reporter.setIsApproved(true);
        userRepository.save(reporter);

        Item savedItem = new Item();
        savedItem.setUserId(owner.getId());
        savedItem.setType(ItemType.FOUND);
        savedItem.setCategory(ItemCategory.WALLET);
        savedItem.setItemName("Campus Wallet");
        savedItem.setDescription("Wallet found near library");
        savedItem.setLocation("Library");
        savedItem.setDate(LocalDate.of(2026, 3, 17));
        savedItem.setTime(LocalTime.of(9, 30));
        savedItem.setStatus(ItemStatus.ACTIVE);
        item = itemRepository.save(savedItem);
    }

    @Test
    @WithMockUser(username = "reporter", roles = {"STUDENT"})
    void createReportShouldPersistReportAndReturnCreatedPayload() throws Exception {
        mockMvc.perform(
            post("/api/reports")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(Map.of(
                    "itemId", item.getId(),
                    "reason", "Spam or Misleading Information",
                    "description", "The item details do not match the photo"
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.report.item_id").value(item.getId()))
            .andExpect(jsonPath("$.report.status").value("pending"));

        org.assertj.core.api.Assertions.assertThat(reportRepository.count()).isEqualTo(1);
        Report saved = reportRepository.findAll().get(0);
        org.assertj.core.api.Assertions.assertThat(saved.getReason()).contains("Spam or Misleading Information");
        org.assertj.core.api.Assertions.assertThat(saved.getReason()).contains("The item details do not match the photo");
    }
}