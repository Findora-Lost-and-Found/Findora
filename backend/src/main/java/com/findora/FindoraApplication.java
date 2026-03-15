package com.findora;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * FindoraApplication - Main Spring Boot application class.
 * Lost and Found Management System v2.0 - Spring Boot 3.x
 */
@SpringBootApplication
public class FindoraApplication {

    public static void main(String[] args) {
        SpringApplication.run(FindoraApplication.class, args);
    }

    /**
     * CORS configuration for React frontend.
     * Allow requests from localhost:5173 (Vite dev server) and production domain.
     */
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins("http://localhost:5173", "http://localhost:3000", "https://findora.example.com")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true)
                    .maxAge(3600);
            }
        };
    }
}
