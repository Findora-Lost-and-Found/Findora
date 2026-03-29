package com.findora.controller;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
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
import com.findora.model.User;
import com.findora.repository.UserRepository;
import com.findora.security.JwtAuthenticationFilter;
import com.findora.service.MatchService;

@WebMvcTest(MatchController.class)
@AutoConfigureMockMvc(addFilters = false)
@SuppressWarnings("unused")
class MatchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MatchService matchService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @WithMockUser(username = "testuser", roles = {"STUDENT"})
    @SuppressWarnings("unused")
    void claimMatchWithValidOtpShouldReturnCreated() throws Exception {
        User user = new User();
        user.setId(10L);
        user.setUsername("testuser");

        Claim claim = new Claim();
        claim.setId(7L);
        claim.setItemId(99L);
        claim.setOtp("123456");
        claim.setOtpExpiry(LocalDateTime.now().plusHours(24));
        claim.setStatus(Claim.ClaimStatus.PENDING);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(matchService.claimMatch(eq(5L), eq("123456"), anyLong())).thenReturn(claim);

        mockMvc.perform(
            post("/api/matches/5/claim")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(java.util.Map.of("otp", "123456")))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.claim.id").value(7));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"STUDENT"})
    @SuppressWarnings("unused")
    void claimMatchWithInvalidOtpShouldReturnBadRequest() throws Exception {
        User user = new User();
        user.setId(10L);
        user.setUsername("testuser");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(matchService.claimMatch(eq(5L), eq("000000"), anyLong()))
            .thenThrow(new IllegalArgumentException("Invalid OTP"));

        mockMvc.perform(
            post("/api/matches/5/claim")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(java.util.Map.of("otp", "000000")))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Invalid OTP"));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"STUDENT"})
    @SuppressWarnings("unused")
    void claimMatchWithExpiredOtpShouldReturnBadRequest() throws Exception {
        User user = new User();
        user.setId(10L);
        user.setUsername("testuser");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(matchService.claimMatch(eq(5L), eq("123456"), anyLong()))
            .thenThrow(new IllegalArgumentException("OTP has expired"));

        mockMvc.perform(
            post("/api/matches/5/claim")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(java.util.Map.of("otp", "123456")))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("OTP has expired"));
    }
}
