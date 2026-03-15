package com.findora.service;

import java.time.LocalDateTime;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.findora.dto.AuthResponse;
import com.findora.dto.UserDTO;
import com.findora.model.User;
import com.findora.repository.UserRepository;
import com.findora.security.JwtTokenProvider;

/**
 * AuthService - Authentication and user registration business logic.
 * Handles login, registration, OTP generation, password reset, etc.
 */
@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final Random RANDOM = new Random();

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /**
     * Login user with username/email and password.
     * Returns JWT token and user details.
     * Frontend expects response: { token, user: { id, username, name, role, email } }
     *
     * @param usernameOrEmail username or email
     * @param password plain text password
     * @return AuthResponse with JWT token and user DTO
     * @throws RuntimeException if authentication fails
     */
    public AuthResponse login(String usernameOrEmail, String password) {
        User user = userRepository.findByUsername(usernameOrEmail)
            .or(() -> userRepository.findByEmail(usernameOrEmail))
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        if (user.getIsBanned()) {
            throw new RuntimeException("User is banned");
        }

        if (user.getIsSuspended()) {
            throw new RuntimeException("User account is suspended");
        }

        // Generate JWT token
        String token = jwtTokenProvider.generateToken(
            user.getUsername(),
            user.getId().toString(),
            user.getRole().name()
        );

        UserDTO userDTO = convertToUserDTO(user);

        log.info("User {} logged in successfully", user.getUsername());

        return new AuthResponse(token, userDTO, null);
    }

    /**
     * Register new user.
     * TODO: Add validation, email verification OTP, etc.
     */
    public AuthResponse register(String username, String email, String password, String fullName, String role) {
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists");
        }

        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setRole(User.UserRole.valueOf(role.toUpperCase()));
        user.setIsVerified(false);
        user.setIsApproved(false); // Requires admin approval for staff/security roles
        user.setVerificationOtp(generateOtp());
        user.setOtpExpiry(LocalDateTime.now().plusHours(24));

        User savedUser = userRepository.save(user);

        String token = jwtTokenProvider.generateToken(
            savedUser.getUsername(),
            savedUser.getId().toString(),
            savedUser.getRole().name()
        );

        UserDTO userDTO = convertToUserDTO(savedUser);

        log.info("User {} registered successfully", username);

        return new AuthResponse(token, userDTO, "User registered successfully, email verification pending");
    }

    /**
     * Verify email with OTP.
     */
    public void verifyEmail(long userId, String otp) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getOtpExpiry() == null || LocalDateTime.now().isAfter(user.getOtpExpiry())) {
            throw new RuntimeException("OTP expired");
        }

        if (!user.getVerificationOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP");
        }

        user.setIsVerified(true);
        user.setVerificationOtp(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        log.info("User {} email verified", user.getUsername());
    }

    /**
     * Verify email by username or email with OTP.
     */
    public void verifyEmail(String usernameOrEmail, String otp) {
        User user = userRepository.findByUsername(usernameOrEmail)
            .or(() -> userRepository.findByEmail(usernameOrEmail))
            .orElseThrow(() -> new RuntimeException("User not found"));

        verifyEmail(user.getId(), otp);
    }

    /**
     * Regenerate verification OTP.
     * TODO: Integrate with mail sender and send the OTP to the user email.
     */
    public void resendVerificationOtp(String usernameOrEmail) {
        User user = userRepository.findByUsername(usernameOrEmail)
            .or(() -> userRepository.findByEmail(usernameOrEmail))
            .orElseThrow(() -> new RuntimeException("User not found"));

        user.setVerificationOtp(generateOtp());
        user.setOtpExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        log.info("Verification OTP regenerated for user {}", user.getUsername());
    }

    /**
     * Generate and send OTP for password reset.
     * TODO: Integrate with email service
     */
    public void initiatePasswordReset(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        String otp = generateOtp();
        user.setResetOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        log.info("Password reset OTP generated for user {}", user.getUsername());
        // TODO: Send OTP via email
    }

    /**
     * Reset password with OTP.
     */
    public void resetPassword(String email, String otp, String newPassword) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getOtpExpiry() == null || LocalDateTime.now().isAfter(user.getOtpExpiry())) {
            throw new RuntimeException("OTP expired");
        }

        if (!user.getResetOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetOtp(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        log.info("User {} password reset successfully", user.getUsername());
    }

    /**
     * Get current user (for GET /api/auth/me).
     */
    public UserDTO getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        return convertToUserDTO(user);
    }

    /**
     * Get current user by username from SecurityContext.
     */
    @Transactional(readOnly = true)
    public UserDTO getCurrentUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        return convertToUserDTO(user);
    }

    /**
     * Generate 6-digit OTP.
     */
    private String generateOtp() {
        return String.format("%06d", RANDOM.nextInt(1000000));
    }

    /**
     * Convert User entity to UserDTO.
     * Frontend expects: { id, username, name, role, email }
     */
    private UserDTO convertToUserDTO(User user) {
        return new UserDTO(
            user.getId(),
            user.getUsername(),
            user.getFullName(),
            user.getFullName(),
            user.getRole().name().toLowerCase(),
            user.getEmail(),
            user.getPhone(),
            user.getIsVerified(),
            user.getIsApproved(),
            user.getIsBanned(),
            user.getIsSuspended()
        );
    }
}
