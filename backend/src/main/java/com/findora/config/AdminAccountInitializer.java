package com.findora.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Creates default privileged accounts on startup when they do not already exist.
 */
@Component
public class AdminAccountInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountInitializer.class);

    @Override
    public void run(String... args) {
        // Bootstrap account initialization disabled due to database connection issues
        // Users can register through the UI or use /api/auth/register endpoint
        log.info("AdminAccountInitializer: Skipped (use registration API instead)");
    }
}