package com.findora.dto;

import java.time.LocalDateTime;

public class SecurityPendingClaimDTO {
    private Long id;
    private Long itemId;
    private String itemName;
    private String category;
    private String location;
    private String fullName;
    private String phone;
    private LocalDateTime claimedAt;

    public SecurityPendingClaimDTO() {
    }

    public SecurityPendingClaimDTO(Long id, Long itemId, String itemName, String category, String location,
                                   String fullName, String phone, LocalDateTime claimedAt) {
        this.id = id;
        this.itemId = itemId;
        this.itemName = itemName;
        this.category = category;
        this.location = location;
        this.fullName = fullName;
        this.phone = phone;
        this.claimedAt = claimedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getItemId() {
        return itemId;
    }

    public void setItemId(Long itemId) {
        this.itemId = itemId;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public LocalDateTime getClaimedAt() {
        return claimedAt;
    }

    public void setClaimedAt(LocalDateTime claimedAt) {
        this.claimedAt = claimedAt;
    }
}