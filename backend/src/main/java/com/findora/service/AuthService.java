package com.findora.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.findora.dto.AuthResponse;
import com.findora.dto.UserDTO;
import com.findora.model.ItemStatus;
import com.findora.model.ItemType;
import com.findora.model.Notification;
import com.findora.model.User;
import com.findora.repository.ItemRepository;
import com.findora.repository.NotificationRepository;
import com.findora.repository.UserRepository;
import com.findora.security.JwtTokenProvider;
import com.findora.service.AccessControlService.AccessState;

/**
 * AuthService - Authentication and user registration business logic.
 * Handles login, registration, OTP generation, password reset, etc.
 */
@Service
@Transactional
@SuppressWarnings("null")
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailService emailService;
    private final ItemRepository itemRepository;
    private final NotificationRepository notificationRepository;
    private final AccessControlService accessControlService;
    private final RoleFeatureProvider roleFeatureProvider;
    @Value("${app.dev.expose-verification-otp:false}")
    private boolean exposeVerificationOtp;
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final Random RANDOM = new Random();
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\d{10}$");
    private static final Pattern STRONG_PASSWORD_PATTERN = Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d])\\S{8,64}$");
    private static final String PASSWORD_POLICY_MESSAGE = "Password must be 8-64 characters and include uppercase, lowercase, number, and special character.";

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            EmailService emailService,
            ItemRepository itemRepository,
            NotificationRepository notificationRepository,
            AccessControlService accessControlService,
            RoleFeatureProvider roleFeatureProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.emailService = emailService;
        this.itemRepository = itemRepository;
        this.notificationRepository = notificationRepository;
        this.accessControlService = accessControlService;
        this.roleFeatureProvider = roleFeatureProvider;
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
                && (user.getRole() == User.UserRole.STUDENT
                    || user.getRole() == User.UserRole.STAFF
                    || user.getRole() == User.UserRole.SECURITY)) {
            throw new RuntimeException("Please verify your email with OTP before login");
        }

        if (Boolean.FALSE.equals(user.getIsApproved())) {
            throw new RuntimeException("Your account is pending admin approval");
        }

        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            throw new RuntimeException("Account no longer exists. Please sign up again.");
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        AccessState accessState = accessControlService.refreshAndGetAccessState(user);
        if (accessState != AccessState.ALLOWED) {
            throw new RuntimeException(accessControlService.accessBlockedMessage(user, accessState));
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
     */
    public AuthResponse register(String username, String email, String password, String fullName, String role, String phone) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedPhone = normalizePhone(phone);

        if (!isValidEmail(normalizedEmail)) {
            throw new RuntimeException("Invalid email format");
        }

        if (normalizedPhone != null && !isValidPhone(normalizedPhone)) {
            throw new RuntimeException("Phone number invalid format");
        }

        if (!isValidPassword(password)) {
            throw new RuntimeException(PASSWORD_POLICY_MESSAGE);
        }

        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists");
        }

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setPhone(normalizedPhone);
        User.UserRole userRole;
        try {
            userRole = User.UserRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new RuntimeException("Invalid role");
        }

        if (userRole == User.UserRole.SUPER_ADMIN) {
            throw new RuntimeException("Super admin cannot be created via signup");
        }

        user.setRole(userRole);
        boolean requiresEmailVerification = roleFeatureProvider.requiresEmailVerification(userRole);
        user.setIsVerified(!requiresEmailVerification);
        // Keep existing behavior: only students are auto-approved at signup.
        boolean autoApproved = roleFeatureProvider.isAutoApprovedAtSignup(userRole);
        user.setIsApproved(autoApproved);
        if (requiresEmailVerification) {
            user.setVerificationOtp(generateOtp());
            user.setOtpExpiry(LocalDateTime.now().plusHours(24));
        }

        User savedUser = userRepository.save(user);

        if (userRole == User.UserRole.ADMIN) {
            notifySuperAdminsOfAdminApprovalRequest(savedUser);
        }

        String fallbackVerificationOtp = null;
        if (requiresEmailVerification) {
            try {
                emailService.sendVerificationOtp(savedUser.getEmail(), savedUser.getFullName(), savedUser.getVerificationOtp());
            } catch (RuntimeException emailError) {
                if (!exposeVerificationOtp) {
                    throw emailError;
                }
                fallbackVerificationOtp = savedUser.getVerificationOtp();
                log.warn("Verification email delivery failed for {}. Exposing OTP in response for development fallback.", savedUser.getUsername(), emailError);
            }
        }

        String token = null;
        if (requiresEmailVerification) {
            token = jwtTokenProvider.generateToken(
                savedUser.getUsername(),
                savedUser.getId().toString(),
                savedUser.getRole().name()
            );
        }

        UserDTO userDTO = convertToUserDTO(savedUser);
        String message;
        if (userRole == User.UserRole.SECURITY) {
            message = "Signup successful. Verify your email with OTP. After verification, your account will be sent for admin approval";
        } else if (userRole == User.UserRole.ADMIN) {
            message = "Signup request submitted. Please wait for super admin approval";
        } else if (requiresEmailVerification) {
            message = "Signup successful. Please verify your email with OTP";
        } else {
            message = "Signup request submitted. Please wait for admin approval";
        }

        if (fallbackVerificationOtp != null) {
            message = "Signup successful. Email delivery failed, use the OTP shown in-app to verify.";
        }

        log.info("User {} registered successfully", username);

        return new AuthResponse(token, userDTO, message, fallbackVerificationOtp);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        return phone.replaceAll("\\D", "");
    }

    private boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }

    private boolean isValidPhone(String phone) {
        return phone != null && PHONE_PATTERN.matcher(phone).matches();
    }

    private boolean isValidPassword(String password) {
        return password != null && STRONG_PASSWORD_PATTERN.matcher(password).matches();
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

        if (user.getRole() == User.UserRole.SECURITY && Boolean.FALSE.equals(user.getIsApproved())) {
            notifyAdminsOfSecurityApprovalRequest(user);
        }

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
     */
    public String resendVerificationOtp(String usernameOrEmail) {
        User user = userRepository.findByUsername(usernameOrEmail)
            .or(() -> userRepository.findByEmail(usernameOrEmail))
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            throw new RuntimeException("User not found");
        }

        user.setVerificationOtp(generateOtp());
        user.setOtpExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        try {
            emailService.sendVerificationOtp(user.getEmail(), user.getFullName(), user.getVerificationOtp());
        } catch (RuntimeException emailError) {
            if (!exposeVerificationOtp) {
                throw emailError;
            }
            log.warn("Verification OTP resend email delivery failed for {}. Exposing OTP in response for development fallback.", user.getUsername(), emailError);
            return user.getVerificationOtp();
        }

        log.info("Verification OTP regenerated for user {}", user.getUsername());
        return exposeVerificationOtp ? user.getVerificationOtp() : null;
    }

    public void updatePhoneNumber(String username, String newPhone) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        String normalizedPhone = normalizePhone(newPhone);
        if (normalizedPhone == null || normalizedPhone.isBlank()) {
            throw new RuntimeException("Phone number is required");
        }

        if (!isValidPhone(normalizedPhone)) {
            throw new RuntimeException("Phone number must be 10 digits");
        }

        if (normalizedPhone.equals(user.getPhone())) {
            throw new RuntimeException("New phone number must be different from current phone");
        }

        if (userRepository.existsByPhone(normalizedPhone) || userRepository.existsByPendingPhone(normalizedPhone)) {
            throw new RuntimeException("Phone number already in use");
        }

        user.setPhone(normalizedPhone);
        user.setPendingPhone(null);
        user.setPhoneVerificationOtp(null);
        user.setPhoneOtpExpiry(null);
        user.setIsPhoneVerified(true);
        userRepository.save(user);

        log.info("Phone number updated directly for user {}", user.getUsername());
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

        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            log.info("Password reset requested for deleted account email: {}", email);
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

        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            throw new RuntimeException("User not found");
        }

        if (user.getOtpExpiry() == null || LocalDateTime.now().isAfter(user.getOtpExpiry())) {
            throw new RuntimeException("OTP expired");
        }

        if (!user.getResetOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP");
        }

        if (!isValidPassword(newPassword)) {
            throw new RuntimeException(PASSWORD_POLICY_MESSAGE);
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
        String principal = username == null ? "" : username.trim();

        User user = userRepository.findByUsername(principal)
            .or(() -> userRepository.findByEmail(principal))
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            throw new RuntimeException("User not found");
        }

        return convertToUserDTO(user);
    }

    public void requestAccountDeletionOtp(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            throw new RuntimeException("Account no longer exists.");
        }

        if (hasUnclaimedFoundItems(user.getId())) {
            throw new RuntimeException("You cannot delete your account while you have unclaimed found items.");
        }

        String otp = generateOtp();
        user.setResetOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        emailService.sendAccountDeletionOtp(user.getEmail(), user.getFullName(), otp);
        log.info("Account deletion OTP sent for user {}", user.getUsername());
    }

    public void confirmAccountDeletion(String username, String otp) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            throw new RuntimeException("Account already deleted.");
        }

        if (hasUnclaimedFoundItems(user.getId())) {
            throw new RuntimeException("You cannot delete your account while you have unclaimed found items.");
        }

        if (user.getOtpExpiry() == null || LocalDateTime.now().isAfter(user.getOtpExpiry())) {
            throw new RuntimeException("OTP expired");
        }

        if (user.getResetOtp() == null || !user.getResetOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP");
        }

        String deletionSuffix = String.valueOf(System.currentTimeMillis());
        String deletedUsername = truncate("deleted_" + user.getId() + "_" + deletionSuffix, 50);
        String deletedEmail = truncate("deleted+" + user.getId() + "+" + deletionSuffix + "@deleted.findora.local", 100);

        user.setUsername(deletedUsername);
        user.setEmail(deletedEmail);
        user.setPhone(null);
        user.setPendingPhone(null);
        user.setVerificationOtp(null);
        user.setPhoneVerificationOtp(null);
        user.setResetOtp(null);
        user.setOtpExpiry(null);
        user.setPhoneOtpExpiry(null);
        user.setIsDeleted(true);
        user.setDeletedAt(LocalDateTime.now());
        user.setIsVerified(false);
        user.setIsApproved(false);
        user.setPassword(passwordEncoder.encode(generateDeletionPasswordSeed()));
        userRepository.save(user);

        log.info("Account soft-deleted for user id={}", user.getId());
    }

    /**
     * Generate 6-digit OTP.
     */
    private String generateOtp() {
        return String.format("%06d", RANDOM.nextInt(1000000));
    }

    private String generateDeletionPasswordSeed() {
        return "deleted-" + System.currentTimeMillis() + "-" + RANDOM.nextInt(1_000_000);
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private boolean hasUnclaimedFoundItems(Long userId) {
        return itemRepository.existsByUserIdAndTypeAndStatusNot(userId, ItemType.FOUND, ItemStatus.CLAIMED);
    }

    private void notifyAdminsOfSecurityApprovalRequest(User securityUser) {
        List<User> admins = userRepository.findByRole(User.UserRole.ADMIN);
        for (User admin : admins) {
            Notification notification = new Notification();
            notification.setUserId(admin.getId());
            notification.setType(Notification.NotificationType.APPROVAL);
            notification.setTitle("Security approval requested");
            notification.setMessage(
                "Security user "
                    + securityUser.getFullName()
                    + " ("
                    + securityUser.getEmail()
                    + ") has verified email and is waiting for admin approval."
            );
            notification.setRelatedId(securityUser.getId());
            notificationRepository.save(notification);
        }
    }

    private void notifySuperAdminsOfAdminApprovalRequest(User adminUser) {
        List<User> superAdmins = userRepository.findByRole(User.UserRole.SUPER_ADMIN);
        for (User superAdmin : superAdmins) {
            Notification notification = new Notification();
            notification.setUserId(superAdmin.getId());
            notification.setType(Notification.NotificationType.APPROVAL);
            notification.setTitle("Admin approval requested");
            notification.setMessage(
                "Admin user "
                    + adminUser.getFullName()
                    + " ("
                    + adminUser.getEmail()
                    + ") is waiting for super admin approval."
            );
            notification.setRelatedId(adminUser.getId());
            notificationRepository.save(notification);
        }
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
            null,
            user.getIsPhoneVerified(),
            user.getIsVerified(),
            user.getIsApproved(),
            user.getIsBanned(),
            user.getIsSuspended(),
            user.getBadPostAttempts(),
            user.getSuspensionUntil() == null ? null : user.getSuspensionUntil().toString(),
            user.getCreatedAt() == null ? null : user.getCreatedAt().toString()
        );
    }
}
