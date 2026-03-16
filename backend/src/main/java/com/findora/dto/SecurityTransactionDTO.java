package com.findora.dto;

import java.time.LocalDateTime;

public class SecurityTransactionDTO {
    private Long id;
    private Long itemId;
    private String itemName;
    private String location;
    private String ownerName;
    private String status;
    private String transactionType;
    private LocalDateTime createdAt;

    public SecurityTransactionDTO() {
    }

    public SecurityTransactionDTO(Long id, Long itemId, String itemName, String location, String ownerName, String status,
                                  String transactionType, LocalDateTime createdAt) {
        this.id = id;
        this.itemId = itemId;
        this.itemName = itemName;
        this.location = location;
        this.ownerName = ownerName;
        this.status = status;
        this.transactionType = transactionType;
        this.createdAt = createdAt;
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

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}