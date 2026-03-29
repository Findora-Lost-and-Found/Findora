package com.findora.dto;

import java.time.LocalDateTime;

public class SecurityPendingClaimDTO {
    private Long id;
    private Long itemId;
    private String itemName;
    private String imageUrl;
    private String category;
    private String location;
    private String fullName;
    private String phone;
    private LocalDateTime claimedAt;
    private String itemStatus;
    private Boolean receivedBySecurity;

    public SecurityPendingClaimDTO() {
    }

    public SecurityPendingClaimDTO(Long id, Long itemId, String itemName, String imageUrl, String category, String location,
                                   String fullName, String phone, LocalDateTime claimedAt,
                                   String itemStatus, Boolean receivedBySecurity) {
        this.id = id;
        this.itemId = itemId;
        this.itemName = itemName;
        this.imageUrl = imageUrl;
        this.category = category;
        this.location = location;
        this.fullName = fullName;
        this.phone = phone;
        this.claimedAt = claimedAt;
        this.itemStatus = itemStatus;
        this.receivedBySecurity = receivedBySecurity;
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

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
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

    public String getItemStatus() {
        return itemStatus;
    }

    public void setItemStatus(String itemStatus) {
        this.itemStatus = itemStatus;
    }

    public Boolean getReceivedBySecurity() {
        return receivedBySecurity;
    }

    public void setReceivedBySecurity(Boolean receivedBySecurity) {
        this.receivedBySecurity = receivedBySecurity;
    }
}