package com.findora.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.findora.dto.UserDTO;
import com.findora.model.Notification;
import com.findora.model.User;
import com.findora.repository.NotificationRepository;
import com.findora.repository.UserRepository;
import com.findora.security.JwtTokenProvider;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unused")
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private EmailService emailService;

    @Mock
    private NotificationRepository notificationRepository;

    private AuthService authService;

    @BeforeEach
    @SuppressWarnings("unused")
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtTokenProvider, emailService, notificationRepository);
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

    @Test
    void loginShouldRequireOtpVerificationForSecurityRole() {
        User securityUser = new User();
        securityUser.setId(2L);
        securityUser.setUsername("sec_user");
        securityUser.setEmail("security@test.com");
        securityUser.setPassword("encoded-password");
        securityUser.setRole(User.UserRole.SECURITY);
        securityUser.setIsVerified(false);
        securityUser.setIsApproved(false);
        securityUser.setIsBanned(false);
        securityUser.setIsSuspended(false);

        when(userRepository.findByUsername("sec_user")).thenReturn(Optional.of(securityUser));

        assertThatThrownBy(() -> authService.login("sec_user", "raw-password"))
            .isInstanceOf(RuntimeException.class)
            .hasMessage("Please verify your email with OTP before login");
    }

    @Test
    void verifyEmailShouldNotifyAdminsWhenSecurityIsVerified() {
        User securityUser = new User();
        securityUser.setId(3L);
        securityUser.setUsername("security-new");
        securityUser.setEmail("security-new@test.com");
        securityUser.setFullName("Security New");
        securityUser.setRole(User.UserRole.SECURITY);
        securityUser.setIsVerified(false);
        securityUser.setIsApproved(false);
        securityUser.setVerificationOtp("123456");
        securityUser.setOtpExpiry(LocalDateTime.now().plusMinutes(30));

        User adminUser = new User();
        adminUser.setId(99L);
        adminUser.setRole(User.UserRole.ADMIN);

        when(userRepository.findById(3L)).thenReturn(Optional.of(securityUser));
        when(userRepository.findByRole(User.UserRole.ADMIN)).thenReturn(List.of(adminUser));

        authService.verifyEmail(3L, "123456");

        verify(notificationRepository).save(any(Notification.class));
        verify(userRepository).save(securityUser);
    }

    @Test
    void verifyEmailShouldNotNotifyAdminsForStudentRole() {
        User studentUser = new User();
        studentUser.setId(4L);
        studentUser.setUsername("student-new");
        studentUser.setEmail("student-new@test.com");
        studentUser.setFullName("Student New");
        studentUser.setRole(User.UserRole.STUDENT);
        studentUser.setIsVerified(false);
        studentUser.setIsApproved(true);
        studentUser.setVerificationOtp("654321");
        studentUser.setOtpExpiry(LocalDateTime.now().plusMinutes(30));

        when(userRepository.findById(4L)).thenReturn(Optional.of(studentUser));

        authService.verifyEmail(4L, "654321");

        verify(notificationRepository, never()).save(any(Notification.class));
    }
}