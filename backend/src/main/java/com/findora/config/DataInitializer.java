package com.findora.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {
    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Bean
    public CommandLineRunner initializeData() {
        return args -> {
            // Database initialization disabled due to connection issues
            // Users can register through the UI or use /api/auth/register endpoint
            log.info("DataInitializer: Skipped (use registration API instead)");
        };
    }
}
