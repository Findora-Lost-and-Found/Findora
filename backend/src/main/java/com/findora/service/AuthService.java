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
    private final EmailService emailService;
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final Random RANDOM = new Random();

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.emailService = emailService;
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

        if (Boolean.FALSE.equals(user.getIsVerified())
                && (user.getRole() == User.UserRole.STUDENT || user.getRole() == User.UserRole.STAFF)) {
            throw new RuntimeException("Please verify your email with OTP before login");
        }

        if (Boolean.FALSE.equals(user.getIsApproved())) {
            throw new RuntimeException("Your account is pending admin approval");
        }

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
        * Includes validation and email verification OTP flow.
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
        User.UserRole userRole = User.UserRole.valueOf(role.toUpperCase());
        if (userRole != User.UserRole.STUDENT && userRole != User.UserRole.STAFF) {
            throw new RuntimeException("Signup is only available for Student and Staff roles");
        }
        user.setRole(userRole);
        user.setIsVerified(false);
        // Students are auto-approved; staff/security/admin roles require admin approval
        boolean autoApproved = (userRole == User.UserRole.STUDENT);
        user.setIsApproved(autoApproved);
        user.setVerificationOtp(generateOtp());
        user.setOtpExpiry(LocalDateTime.now().plusHours(24));

        User savedUser = userRepository.save(user);

        emailService.sendVerificationOtp(savedUser.getEmail(), savedUser.getFullName(), savedUser.getVerificationOtp());

        String token = jwtTokenProvider.generateToken(
            savedUser.getUsername(),
            savedUser.getId().toString(),
            savedUser.getRole().name()
        );

        UserDTO userDTO = convertToUserDTO(savedUser);

        log.info("User {} registered successfully", username);

        return new AuthResponse(token, userDTO, "Signup successful. Please verify your email with OTP");
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
        * Sends the generated OTP to the user email.
     */
    public void resendVerificationOtp(String usernameOrEmail) {
        User user = userRepository.findByUsername(usernameOrEmail)
            .or(() -> userRepository.findByEmail(usernameOrEmail))
            .orElseThrow(() -> new RuntimeException("User not found"));

        user.setVerificationOtp(generateOtp());
        user.setOtpExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        emailService.sendVerificationOtp(user.getEmail(), user.getFullName(), user.getVerificationOtp());

        log.info("Verification OTP regenerated for user {}", user.getUsername());
    }

    /**
     * Generate and send OTP for password reset.
     * Returns generated OTP for development/testing workflows when needed.
     */
    public String initiatePasswordReset(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            // Do not leak account existence through API error messages.
            log.info("Password reset requested for non-existing email: {}", email);
            return null;
        }

        String otp = generateOtp();
        user.setResetOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        emailService.sendPasswordResetOtp(user.getEmail(), user.getFullName(), otp);

        log.info("Password reset OTP generated for user {}", user.getUsername());
        // OTP is sent via emailService.sendPasswordResetOtp above.
        return otp;
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
            user.getIsSuspended(),
            user.getCreatedAt() == null ? null : user.getCreatedAt().toString()
        );
    }
}
