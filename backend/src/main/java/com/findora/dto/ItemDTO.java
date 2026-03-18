package com.findora.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * ItemDTO - DTO for Item responses.
 * Matches node API field names exactly: id, name, category, description, location, status, imageUrl, createdAt
 * Frontend expects these exact field names - do not rename!
 */
public class ItemDTO {
    private Long id;
    private Long userId;               // Owner's user ID
    private String name;               // Maps from itemName in DB
    private String category;           // e.g., "NIC", "Wallet"
    private String type;               // e.g., "lost", "found"
    private String description;
    private String location;
    private String status;             // e.g., "active", "claimed"
    private String imageUrl;           // Maps from image_url in DB
    private String createdAt;          // ISO 8601 timestamp string
    private String fullName;

    public ItemDTO() {
    }

    public ItemDTO(Long id, String name, String category, String type, String description, String location, String status, String imageUrl, String createdAt, Long userId, String fullName) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.type = type;
        this.description = description;
        this.location = location;
        this.status = status;
        this.imageUrl = imageUrl;
        this.createdAt = createdAt;
        this.userId = userId;
        this.fullName = fullName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    @JsonProperty("user_id")
    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
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

    @JsonProperty("image_url")
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

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    // Frontend legacy aliases kept for compatibility.
    @JsonProperty("item_name")
    public String getItemName() {
        return name;
    }

    @JsonProperty("created_at")
    public String getCreatedAtLegacy() {
        return createdAt;
    }

    @JsonProperty("full_name")
    public String getFullNameLegacy() {
        return fullName;
    }
}
