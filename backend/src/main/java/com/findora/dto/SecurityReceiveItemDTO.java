package com.findora.dto;

/**
 * DTO for security receive queue items.
 */
public class SecurityReceiveItemDTO {

    private Long itemId;
    private String itemName;
    private String imageUrl;
    private String finderName;
    private String location;
    private String date;

    public SecurityReceiveItemDTO() {
    }

    public SecurityReceiveItemDTO(Long itemId, String itemName, String imageUrl, String finderName, String location, String date) {
        this.itemId = itemId;
        this.itemName = itemName;
        this.imageUrl = imageUrl;
        this.finderName = finderName;
        this.location = location;
        this.date = date;
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

    public String getFinderName() {
        return finderName;
    }

    public void setFinderName(String finderName) {
        this.finderName = finderName;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }
}