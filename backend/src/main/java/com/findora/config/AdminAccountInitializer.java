package com.findora.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.findora.model.User;
import com.findora.repository.UserRepository;

/**
 * Creates default privileged accounts on startup when they do not already exist.
 */
@Component
public class AdminAccountInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountInitializer.class);

    private static final String ADMIN_USERNAME = "admin";
    private static final String ADMIN_EMAIL = "admin@findora.com";
    private static final String ADMIN_PASSWORD = "pass-123456";
    private static final String ADMIN_FULL_NAME = "Default Admin";

    private static final String SECURITY_USERNAME = "security";
    private static final String SECURITY_EMAIL = "security@findora.com";
    private static final String SECURITY_PASSWORD = "pass-123456";
    private static final String SECURITY_FULL_NAME = "Default Security Officer";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminAccountInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        createBootstrapUser(
            ADMIN_USERNAME,
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
            ADMIN_FULL_NAME,
            User.UserRole.ADMIN,
            "ROLE_ADMIN"
        );

        createBootstrapUser(
            SECURITY_USERNAME,
            SECURITY_EMAIL,
            SECURITY_PASSWORD,
            SECURITY_FULL_NAME,
            User.UserRole.SECURITY,
            "ROLE_SECURITY"
        );
    }

    private void createBootstrapUser(
            String username,
            String email,
            String password,
            String fullName,
            User.UserRole role,
            String roleLabel) {
        boolean usernameExists = userRepository.existsByUsername(username);
        boolean emailExists = userRepository.existsByEmail(email);

        if (usernameExists || emailExists) {
            log.info("Bootstrap {} already exists for username '{}' or email '{}'.", role.name(), username, email);
            return;
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setRole(role);
        user.setIsVerified(true);
        user.setIsApproved(true);
        user.setIsBanned(false);
        user.setIsSuspended(false);

        userRepository.save(user);

        System.out.println("==================================================");
        System.out.println("Default " + role.name().toLowerCase() + " account created successfully");
        System.out.println("Username: " + username);
        System.out.println("Email: " + email);
        System.out.println("Password: " + password);
        System.out.println("Role: " + roleLabel);
        System.out.println("==================================================");
    }
}