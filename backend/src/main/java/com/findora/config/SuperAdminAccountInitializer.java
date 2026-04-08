package com.findora.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.findora.model.User;
import com.findora.repository.UserRepository;

@Component
public class SuperAdminAccountInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminAccountInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.super-admin.username:superadmin}")
    private String superAdminUsername;

    @Value("${app.super-admin.email:superadmin@findora.com}")
    private String superAdminEmail;

    @Value("${app.super-admin.full-name:Super Admin}")
    private String superAdminFullName;

    @Value("${app.super-admin.password:SuperAdmin@123}")
    private String superAdminPassword;

    public SuperAdminAccountInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        boolean exists = userRepository.findByRole(User.UserRole.SUPER_ADMIN).stream().findFirst().isPresent();
        if (exists) {
            return;
        }

        if (userRepository.existsByUsername(superAdminUsername) || userRepository.existsByEmail(superAdminEmail)) {
            log.warn("Super admin bootstrap skipped because configured username/email already exists: {} / {}", superAdminUsername, superAdminEmail);
            return;
        }

        User superAdmin = new User();
        superAdmin.setUsername(superAdminUsername);
        superAdmin.setEmail(superAdminEmail.trim().toLowerCase());
        superAdmin.setPassword(passwordEncoder.encode(superAdminPassword));
        superAdmin.setFullName(superAdminFullName);
        superAdmin.setRole(User.UserRole.SUPER_ADMIN);
        superAdmin.setIsVerified(true);
        superAdmin.setIsApproved(true);
        superAdmin.setIsBanned(false);
        superAdmin.setIsSuspended(false);

        userRepository.save(superAdmin);
        log.info("Bootstrapped default super admin account: {} ({})", superAdminUsername, superAdminEmail);
    }
}