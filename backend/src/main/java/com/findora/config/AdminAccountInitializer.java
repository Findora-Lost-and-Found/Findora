package com.findora.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.findora.model.User;
import com.findora.repository.UserRepository;

/**
 * Creates a default admin account on startup when it does not already exist.
 */
@Component
public class AdminAccountInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountInitializer.class);

    private static final String ADMIN_USERNAME = "n-admin1";
    private static final String ADMIN_EMAIL = "n-admin1@findora.com";
    private static final String ADMIN_PASSWORD = "pass-123456";
    private static final String ADMIN_FULL_NAME = "Default Admin";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminAccountInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        boolean usernameExists = userRepository.existsByUsername(ADMIN_USERNAME);
        boolean emailExists = userRepository.existsByEmail(ADMIN_EMAIL);

        if (usernameExists || emailExists) {
            log.info("Bootstrap admin already exists for username '{}' or email '{}'.", ADMIN_USERNAME, ADMIN_EMAIL);
            return;
        }

        User admin = new User();
        admin.setUsername(ADMIN_USERNAME);
        admin.setEmail(ADMIN_EMAIL);
        admin.setPassword(passwordEncoder.encode(ADMIN_PASSWORD));
        admin.setFullName(ADMIN_FULL_NAME);
        admin.setRole(User.UserRole.ADMIN);
        admin.setIsVerified(true);
        admin.setIsApproved(true);
        admin.setIsBanned(false);
        admin.setIsSuspended(false);

        userRepository.save(admin);

        System.out.println("==================================================");
        System.out.println("Default admin account created successfully");
        System.out.println("Username: " + ADMIN_USERNAME);
        System.out.println("Email: " + ADMIN_EMAIL);
        System.out.println("Password: " + ADMIN_PASSWORD);
        System.out.println("Role: ROLE_ADMIN");
        System.out.println("==================================================");
    }
}