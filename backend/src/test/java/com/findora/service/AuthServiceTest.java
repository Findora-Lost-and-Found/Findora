package com.findora.service;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.findora.dto.UserDTO;
import com.findora.model.User;
import com.findora.repository.UserRepository;
import com.findora.security.JwtTokenProvider;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private EmailService emailService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtTokenProvider, emailService);
    }

    @Test
    void getCurrentUserByUsernameShouldIncludeCreatedAtMapping() {
        User user = new User();
        user.setId(1L);
        user.setUsername("tester");
        user.setFullName("Test User");
        user.setEmail("tester@example.com");
        user.setRole(User.UserRole.STUDENT);
        user.setIsVerified(true);
        user.setIsApproved(true);
        user.setIsBanned(false);
        user.setIsSuspended(false);
        user.setCreatedAt(LocalDateTime.of(2026, 3, 17, 10, 15));

        when(userRepository.findByUsername("tester")).thenReturn(Optional.of(user));

        UserDTO dto = authService.getCurrentUserByUsername("tester");

        assertThat(dto.getCreatedAt()).isEqualTo("2026-03-17T10:15");
    }
}