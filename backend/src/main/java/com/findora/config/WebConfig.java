package com.findora.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * WebConfig - Serves uploaded files from the local uploads/ directory.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private static String toFileLocation(Path path) {
        String normalized = path.toAbsolutePath().normalize().toString().replace("\\", "/");
        if (!normalized.endsWith("/")) {
            normalized += "/";
        }
        return "file:" + normalized;
    }

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        Path primaryUploadPath = Paths.get(uploadDir);
        // Compatibility location: files previously saved when backend started from workspace root.
        Path workspaceBackendUploadPath = Paths.get("backend", "uploads");

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(
                    toFileLocation(primaryUploadPath),
                    toFileLocation(workspaceBackendUploadPath)
                );
    }
}
