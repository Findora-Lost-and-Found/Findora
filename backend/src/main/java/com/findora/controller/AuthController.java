package com.findora.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.findora.dto.AuthResponse;
import com.findora.dto.UserDTO;
import com.findora.service.AuthService;

/**
 * AuthController - Authentication endpoints.
 * CRITICAL: Response JSON must match Node API exactly for frontend compatibility.
 * Frontend expects: { token, user: { id, username, name, role, email } }
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * POST /api/auth/login
     * Login with username/email and password.
     * Request: { username|email, password }
     * Response: { token, user: { id, username, name, role, email } }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
        try {
            String usernameOrEmail = firstNonBlank(
                loginRequest.get("identifier"),
                loginRequest.get("username"),
                loginRequest.get("email")
            );
            String password = loginRequest.get("password");

            if (usernameOrEmail == null || password == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Username and password required"));
            }

            AuthResponse response = authService.login(usernameOrEmail, password);

            log.info("User login successful: {}", usernameOrEmail);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            log.warn("Login failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Login error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    /**
     * POST /api/auth/register
     * Register new user.
     * Request: { username, email, password, fullName, role }
     * Response: { token, user: {...}, message }
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> registerRequest) {
        try {
            String username = registerRequest.get("username");
            String email = registerRequest.get("email");
            String password = registerRequest.get("password");
            String fullName = firstNonBlank(registerRequest.get("fullName"), registerRequest.get("full_name"));
            String role = registerRequest.getOrDefault("role", "STUDENT");

            if (username == null || email == null || password == null || fullName == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Missing required fields"));
            }

            AuthResponse response = authService.register(username, email, password, fullName, role);

            log.info("User registered: {}", username);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (RuntimeException e) {
            log.warn("Registration failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Registration error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    /**
     * POST /api/auth/verify-email
     * Verify email with OTP.
     * TODO: Implement OTP validation
     */
    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody Map<String, String> verifyRequest) {
        try {
            String otp = verifyRequest.get("otp");
            if (otp == null || otp.isBlank()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "OTP is required"));
            }

            String usernameOrEmail = verifyRequest.get("username");
            if (usernameOrEmail == null || usernameOrEmail.isBlank()) {
                usernameOrEmail = verifyRequest.get("email");
            }

            String userId = verifyRequest.get("userId");
            if (userId != null && !userId.isBlank()) {
                authService.verifyEmail(Long.parseLong(userId), otp);
            } else if (usernameOrEmail != null && !usernameOrEmail.isBlank()) {
                authService.verifyEmail(usernameOrEmail, otp);
            } else {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "username/email or userId is required"));
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Email verified successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * POST /api/auth/resend-otp
     * TODO: Implement OTP resend
     */
    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> request) {
        try {
            String usernameOrEmail = request.get("username");
            if (usernameOrEmail == null || usernameOrEmail.isBlank()) {
                usernameOrEmail = request.get("email");
            }

            if (usernameOrEmail == null || usernameOrEmail.isBlank()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "username or email is required"));
            }

            authService.resendVerificationOtp(usernameOrEmail);
            return ResponseEntity.ok(Map.of("success", true, "message", "OTP resent successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * POST /api/auth/forgot-password
     * Initiate password reset.
     * TODO: Integrate with email service
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            if (email == null || email.isBlank()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Email is required"));
            }

            authService.initiatePasswordReset(email);
            return ResponseEntity.ok(Map.of("success", true, "message", "Password reset OTP sent"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * POST /api/auth/reset-password
     * Reset password with OTP.
     * TODO: Implement password reset
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> resetRequest) {
        try {
            String email = resetRequest.get("email");
            String otp = resetRequest.get("otp");
            String newPassword = resetRequest.get("newPassword");

            if (email == null || email.isBlank() || otp == null || otp.isBlank() || newPassword == null || newPassword.isBlank()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "email, otp and newPassword are required"));
            }

            authService.resetPassword(email, otp, newPassword);
            return ResponseEntity.ok(Map.of("success", true, "message", "Password reset successful"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * GET /api/auth/me
     * Get current authenticated user.
     * Requires valid JWT token in Authorization header.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        try {
            String username = getCurrentUsername();
            UserDTO user = authService.getCurrentUserByUsername(username);

            return ResponseEntity.ok(Map.of("success", true, "user", user));

        } catch (Exception e) {
            log.error("Error fetching current user", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    /**
     * Extract current authenticated user's ID from SecurityContext.
     */
    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("User not authenticated");
        }
        return auth.getName();
    }
}
