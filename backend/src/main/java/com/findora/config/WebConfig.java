package com.findora.config;

import java.nio.file.Paths;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * WebConfig - Serves uploaded files from the local uploads/ directory.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads/}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadPath = Paths.get(uploadDir).toAbsolutePath().toString();
        String normalizedPath = uploadPath.replace("\\", "/");
        
        // Ensure proper file:// URL format for Windows and Unix
        String fileUrl = normalizedPath.startsWith("/") 
            ? "file://" + normalizedPath + "/" 
            : "file:///" + normalizedPath + "/";
        
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(fileUrl);
    }
}
