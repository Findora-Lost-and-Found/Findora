package com.findora.dto;

/**
 * Request DTO for security item actions that require itemId.
 */
public class SecurityItemActionRequest {

    private Long itemId;

    public SecurityItemActionRequest() {
    }

    public SecurityItemActionRequest(Long itemId) {
        this.itemId = itemId;
    }

    public Long getItemId() {
        return itemId;
    }

    public void setItemId(Long itemId) {
        this.itemId = itemId;
    }
}