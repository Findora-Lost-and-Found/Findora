package com.findora.controller;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.findora.model.Claim;
import com.findora.model.Item;
import com.findora.model.ItemCategory;
import com.findora.model.ItemType;
import com.findora.model.User;
import com.findora.repository.ItemRepository;
import com.findora.repository.UserRepository;
import com.findora.service.ClaimCreationService;
import com.findora.service.MatchService;

@WebMvcTest(ClaimController.class)
@AutoConfigureMockMvc(addFilters = false)
@SuppressWarnings({"null", "unused"})
class ClaimControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ItemRepository itemRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private ClaimCreationService claimCreationService;

    @MockBean
    private MatchService matchService;

    @Test
    @WithMockUser(username = "testuser", roles = {"STUDENT"})
    @SuppressWarnings("unused")
    void createNicClaimWithMatchingNicShouldReturnCreated() throws Exception {
        User user = new User();
        user.setId(10L);
        user.setUsername("testuser");

        Item item = new Item();
        item.setId(99L);
        item.setType(ItemType.FOUND);
        item.setCategory(ItemCategory.NIC);
        item.setDescription("NIC Number: 123456789V");

        Claim claim = new Claim();
        claim.setId(7L);
        claim.setItemId(99L);
        claim.setOtp("123456");
        claim.setOtpExpiry(LocalDateTime.now().plusHours(24));
        claim.setStatus(Claim.ClaimStatus.PENDING);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(itemRepository.findById(99L)).thenReturn(Optional.of(item));
        when(matchService.computeScore(org.mockito.ArgumentMatchers.any(Item.class), eq(item))).thenReturn(100.0);
        when(claimCreationService.createClaimForItem(eq(99L), anyLong())).thenReturn(claim);

        mockMvc.perform(
            post("/api/claims")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(Map.of(
                    "item_id", 99,
                    "nicNumber", "123456789v"
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.claim.id").value(7));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"STUDENT"})
    void createNicClaimWithoutNicShouldReturnBadRequest() throws Exception {
        User user = new User();
        user.setId(10L);
        user.setUsername("testuser");

        Item item = new Item();
        item.setId(99L);
        item.setType(ItemType.FOUND);
        item.setCategory(ItemCategory.NIC);
        item.setDescription("NIC Number: 123456789V");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(itemRepository.findById(99L)).thenReturn(Optional.of(item));
        when(matchService.computeScore(org.mockito.ArgumentMatchers.any(Item.class), eq(item))).thenReturn(100.0);

        mockMvc.perform(
            post("/api/claims")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(Map.of("item_id", 99)))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("nicNumber is required for NIC claims"));

        verify(claimCreationService, never()).createClaimForItem(anyLong(), anyLong());
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"STUDENT"})
    void createNicClaimWithInvalidFormatShouldReturnBadRequest() throws Exception {
        User user = new User();
        user.setId(10L);
        user.setUsername("testuser");

        Item item = new Item();
        item.setId(99L);
        item.setType(ItemType.FOUND);
        item.setCategory(ItemCategory.NIC);
        item.setDescription("NIC Number: 123456789V");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(itemRepository.findById(99L)).thenReturn(Optional.of(item));
        when(matchService.computeScore(org.mockito.ArgumentMatchers.any(Item.class), eq(item))).thenReturn(100.0);

        mockMvc.perform(
            post("/api/claims")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(Map.of(
                    "item_id", 99,
                    "nicNumber", "123456"
                )))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("NIC must be in 9-digit + V/X or 12-digit format"));

        verify(claimCreationService, never()).createClaimForItem(anyLong(), anyLong());
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"STUDENT"})
    void createNicClaimWithDifferentNicShouldReturnBadRequest() throws Exception {
        User user = new User();
        user.setId(10L);
        user.setUsername("testuser");

        Item item = new Item();
        item.setId(99L);
        item.setType(ItemType.FOUND);
        item.setCategory(ItemCategory.NIC);
        item.setDescription("NIC Number: 123456789V");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(itemRepository.findById(99L)).thenReturn(Optional.of(item));
        when(matchService.computeScore(org.mockito.ArgumentMatchers.any(Item.class), eq(item))).thenReturn(100.0);

        mockMvc.perform(
            post("/api/claims")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(Map.of(
                    "item_id", 99,
                    "nicNumber", "199001234567"
                )))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Entered NIC number does not match this item"));

        verify(claimCreationService, never()).createClaimForItem(anyLong(), anyLong());
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"STUDENT"})
    void createWalletClaimWithWeakMatchShouldReturnBadRequest() throws Exception {
        User user = new User();
        user.setId(10L);
        user.setUsername("testuser");

        Item item = new Item();
        item.setId(99L);
        item.setType(ItemType.FOUND);
        item.setCategory(ItemCategory.WALLET);
        item.setItemName("Purse / Wallet");
        item.setDescription("Items inside: key");
        item.setLocation("Library entrance");
        item.setCreatedAt(LocalDateTime.now().minusDays(2));

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(itemRepository.findById(99L)).thenReturn(Optional.of(item));
        when(matchService.computeScore(org.mockito.ArgumentMatchers.any(Item.class), eq(item))).thenReturn(50.0);

        mockMvc.perform(
            post("/api/claims")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(Map.of(
                    "item_id", 99,
                    "claimType", "without-id",
                    "date", "2026-03-17",
                    "location1", "wala",
                    "items1", "dress",
                    "date", "2026-03-28",
                    "fromTime", "08:54",
                    "toTime", "09:54"
                )))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Claim details do not match this item closely enough"));

        verify(claimCreationService, never()).createClaimForItem(anyLong(), anyLong());
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"STUDENT"})
    void createWalletClaimWithStrongMatchBeforeOneDayShouldReturnBadRequest() throws Exception {
        User user = new User();
        user.setId(10L);
        user.setUsername("testuser");

        Item item = new Item();
        item.setId(99L);
        item.setType(ItemType.FOUND);
        item.setCategory(ItemCategory.WALLET);
        item.setItemName("Purse / Wallet");
        item.setDescription("Items inside: key");
        item.setLocation("Library entrance");
        item.setCreatedAt(LocalDateTime.now().minusHours(2));

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(itemRepository.findById(99L)).thenReturn(Optional.of(item));
        when(matchService.computeScore(org.mockito.ArgumentMatchers.any(Item.class), eq(item))).thenReturn(90.0);

        mockMvc.perform(
            post("/api/claims")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(Map.of(
                    "item_id", 99,
                    "claimType", "without-id",
                    "date", "2026-03-17",
                    "location1", "library",
                    "items1", "key",
                    "date", "2026-03-28",
                    "fromTime", "08:54",
                    "toTime", "09:54"
                )))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("This claim is a strong match, but it becomes available 1 day after the item was posted"));

        verify(claimCreationService, never()).createClaimForItem(anyLong(), anyLong());
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"STUDENT"})
    void createWalletClaimWithStrongMatchAfterOneDayShouldReturnCreated() throws Exception {
        User user = new User();
        user.setId(10L);
        user.setUsername("testuser");

        Item item = new Item();
        item.setId(99L);
        item.setType(ItemType.FOUND);
        item.setCategory(ItemCategory.WALLET);
        item.setItemName("Purse / Wallet");
        item.setDescription("Items inside: key");
        item.setLocation("Library entrance");
        item.setCreatedAt(LocalDateTime.now().minusDays(2));

        Claim claim = new Claim();
        claim.setId(7L);
        claim.setItemId(99L);
        claim.setOtp("123456");
        claim.setOtpExpiry(LocalDateTime.now().plusHours(24));
        claim.setStatus(Claim.ClaimStatus.PENDING);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(itemRepository.findById(99L)).thenReturn(Optional.of(item));
        when(matchService.computeScore(org.mockito.ArgumentMatchers.any(Item.class), eq(item))).thenReturn(90.0);
        when(claimCreationService.createClaimForItem(eq(99L), anyLong())).thenReturn(claim);

        mockMvc.perform(
            post("/api/claims")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(Map.of(
                    "item_id", 99,
                    "claimType", "without-id",
                    "date", "2026-03-17",
                    "location1", "library",
                    "items1", "key",
                    "date", "2026-03-28",
                    "fromTime", "08:54",
                    "toTime", "09:54"
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.claim.id").value(7))
            .andExpect(jsonPath("$.claim.claim_mode").value("after_waiting_period"));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"STUDENT"})
    void createWalletClaimWithExactIdShouldReturnCreatedImmediately() throws Exception {
        User user = new User();
        user.setId(10L);
        user.setUsername("testuser");

        Item item = new Item();
        item.setId(99L);
        item.setType(ItemType.FOUND);
        item.setCategory(ItemCategory.WALLET);
        item.setItemName("Purse / Wallet");
        item.setDescription("Contains NIC 199001234567 and key");
        item.setLocation("Library entrance");
        item.setCreatedAt(LocalDateTime.now().minusHours(1));

        Claim claim = new Claim();
        claim.setId(7L);
        claim.setItemId(99L);
        claim.setOtp("123456");
        claim.setOtpExpiry(LocalDateTime.now().plusHours(24));
        claim.setStatus(Claim.ClaimStatus.PENDING);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(itemRepository.findById(99L)).thenReturn(Optional.of(item));
        when(matchService.computeScore(org.mockito.ArgumentMatchers.any(Item.class), eq(item))).thenReturn(100.0);
        when(claimCreationService.createClaimForItem(eq(99L), anyLong())).thenReturn(claim);

        mockMvc.perform(
            post("/api/claims")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(Map.of(
                    "item_id", 99,
                    "claimType", "with-id",
                    "idNumber", "199001234567"
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.claim.claim_mode").value("immediate"));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"STUDENT"})
    void createStudentIdClaimWithDifferentIdShouldReturnBadRequest() throws Exception {
        User user = new User();
        user.setId(10L);
        user.setUsername("testuser");

        Item item = new Item();
        item.setId(99L);
        item.setType(ItemType.FOUND);
        item.setCategory(ItemCategory.STUDENT_ID);
        item.setDescription("Student ID: TG-12345");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(itemRepository.findById(99L)).thenReturn(Optional.of(item));
        when(matchService.computeScore(org.mockito.ArgumentMatchers.any(Item.class), eq(item))).thenReturn(100.0);

        mockMvc.perform(
            post("/api/claims")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(Map.of(
                    "item_id", 99,
                    "idNumber", "TG-99999"
                )))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Entered ID number does not match this item"));

        verify(claimCreationService, never()).createClaimForItem(anyLong(), anyLong());
    }
}