package com.findora.dto;

/**
 * ItemDTO - DTO for Item responses.
 * Matches node API field names exactly: id, name, category, description, location, status, imageUrl, createdAt
 * Frontend expects these exact field names - do not rename!
 */
public class ItemDTO {
    private Long id;
    private String name;               // Maps from itemName in DB
    private String category;           // e.g., "NIC", "Wallet"
    private String description;
    private String location;
    private String status;             // e.g., "active", "claimed"
    private String imageUrl;           // Maps from image_url in DB
    private String createdAt;          // ISO 8601 timestamp string

    public ItemDTO() {
    }

    public ItemDTO(Long id, String name, String category, String description, String location, String status, String imageUrl, String createdAt) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.description = description;
        this.location = location;
        this.status = status;
        this.imageUrl = imageUrl;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
