package com.findora.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Claim entity - Item claim requests.
 */
@Entity
@Table(name = "claims", indexes = {
    @Index(name = "idx_claims_item_id", columnList = "item_id"),
    @Index(name = "idx_claims_claimer_id", columnList = "claimer_id"),
    @Index(name = "idx_claims_status", columnList = "status")
})
@SuppressWarnings({"unused", "FieldMayBeFinal"})
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", referencedColumnName = "id", insertable = false, updatable = false)
    private Item item;

    @Column(name = "claimer_id", nullable = false)
    private Long claimerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claimer_id", referencedColumnName = "id", insertable = false, updatable = false)
    private User claimer;

    @Column(nullable = false, length = 6)
    private String otp;

    @Column(name = "otp_expiry", nullable = false)
    private LocalDateTime otpExpiry;

    @Convert(converter = ClaimStatusConverter.class)
    @Column(nullable = false)
    private ClaimStatus status;

    @Column(name = "security_officer_id")
    private Long securityOfficerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "security_officer_id", referencedColumnName = "id", insertable = false, updatable = false)
    private User securityOfficer;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "claimed_at", nullable = false, updatable = false)
    private LocalDateTime claimedAt;

    @Column(name = "collected_at")
    private LocalDateTime collectedAt;

    public enum ClaimStatus {
        PENDING, APPROVED, REJECTED, COLLECTED
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

    public Item getItem() {
        return item;
    }

    public void setItem(Item item) {
        this.item = item;
    }

    public Long getClaimerId() {
        return claimerId;
    }

    public void setClaimerId(Long claimerId) {
        this.claimerId = claimerId;
    }

    public User getClaimer() {
        return claimer;
    }

    public void setClaimer(User claimer) {
        this.claimer = claimer;
    }

    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }

    public LocalDateTime getOtpExpiry() {
        return otpExpiry;
    }

    public void setOtpExpiry(LocalDateTime otpExpiry) {
        this.otpExpiry = otpExpiry;
    }

    public ClaimStatus getStatus() {
        return status;
    }

    public void setStatus(ClaimStatus status) {
        this.status = status;
    }

    public Long getSecurityOfficerId() {
        return securityOfficerId;
    }

    public void setSecurityOfficerId(Long securityOfficerId) {
        this.securityOfficerId = securityOfficerId;
    }

    public User getSecurityOfficer() {
        return securityOfficer;
    }

    public void setSecurityOfficer(User securityOfficer) {
        this.securityOfficer = securityOfficer;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public LocalDateTime getClaimedAt() {
        return claimedAt;
    }

    public void setClaimedAt(LocalDateTime claimedAt) {
        this.claimedAt = claimedAt;
    }

    public LocalDateTime getCollectedAt() {
        return collectedAt;
    }

    public void setCollectedAt(LocalDateTime collectedAt) {
        this.collectedAt = collectedAt;
    }
}
