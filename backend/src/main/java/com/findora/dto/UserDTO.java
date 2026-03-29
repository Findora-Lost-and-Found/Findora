package com.findora.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * UserDTO - User response DTO.
 * Frontend JWT response expects: { token, user: { id, username, name, role, email } }
 * Make sure field names match exactly!
 */
public class UserDTO {
    private Long id;
    private String username;
    private String name;              // Maps from fullName in DB; frontend expects "name"
    @JsonProperty("full_name")
    private String fullName;          // Node-compatible alias expected by React UI
    private String role;              // e.g., "STUDENT", "ADMIN"
    private String email;
    private String phone;
    @JsonProperty("pending_phone")
    private String pendingPhone;
    @JsonProperty("is_phone_verified")
    private Boolean isPhoneVerified;
    @JsonProperty("is_verified")
    private Boolean isVerified;
    @JsonProperty("is_approved")
    private Boolean isApproved;
    @JsonProperty("is_banned")
    private Boolean isBanned;
    @JsonProperty("is_suspended")
    private Boolean isSuspended;
    @JsonProperty("bad_post_attempts")
    private Integer badPostAttempts;
    @JsonProperty("suspension_until")
    private String suspensionUntil;
    @JsonProperty("created_at")
    private String createdAt;

    public UserDTO() {
    }

    public UserDTO(Long id, String username, String name, String fullName, String role, String email, String phone,
                   String pendingPhone, Boolean isPhoneVerified, Boolean isVerified, Boolean isApproved,
                   Boolean isBanned, Boolean isSuspended, Integer badPostAttempts, String suspensionUntil,
                   String createdAt) {
        this.id = id;
        this.username = username;
        this.name = name;
        this.fullName = fullName;
        this.role = role;
        this.email = email;
        this.phone = phone;
        this.pendingPhone = pendingPhone;
        this.isPhoneVerified = isPhoneVerified;
        this.isVerified = isVerified;
        this.isApproved = isApproved;
        this.isBanned = isBanned;
        this.isSuspended = isSuspended;
        this.badPostAttempts = badPostAttempts;
        this.suspensionUntil = suspensionUntil;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
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

    public String getPendingPhone() {
        return pendingPhone;
    }

    public void setPendingPhone(String pendingPhone) {
        this.pendingPhone = pendingPhone;
    }

    public Boolean getIsPhoneVerified() {
        return isPhoneVerified;
    }

    public void setIsPhoneVerified(Boolean isPhoneVerified) {
        this.isPhoneVerified = isPhoneVerified;
    }

    public Boolean getIsVerified() {
        return isVerified;
    }

    public void setIsVerified(Boolean isVerified) {
        this.isVerified = isVerified;
    }

    public Boolean getIsApproved() {
        return isApproved;
    }

    public void setIsApproved(Boolean isApproved) {
        this.isApproved = isApproved;
    }

    public Boolean getIsBanned() {
        return isBanned;
    }

    public void setIsBanned(Boolean isBanned) {
        this.isBanned = isBanned;
    }

    public Boolean getIsSuspended() {
        return isSuspended;
    }

    public void setIsSuspended(Boolean isSuspended) {
        this.isSuspended = isSuspended;
    }

    public Integer getBadPostAttempts() {
        return badPostAttempts;
    }

    public void setBadPostAttempts(Integer badPostAttempts) {
        this.badPostAttempts = badPostAttempts;
    }

    public String getSuspensionUntil() {
        return suspensionUntil;
    }

    public void setSuspensionUntil(String suspensionUntil) {
        this.suspensionUntil = suspensionUntil;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
