package com.findora.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Convert;

/**
 * SecurityTransaction entity - Item transactions (receive/release).
 */
@Entity
@Table(name = "security_transactions", indexes = {
    @Index(name = "idx_security_officer", columnList = "security_officer_id"),
    @Index(name = "idx_transaction_type", columnList = "transaction_type"),
    @Index(name = "idx_transaction_date", columnList = "transaction_date")
})
public class SecurityTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "security_officer_id", nullable = false)
    private Long securityOfficerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "security_officer_id", referencedColumnName = "id", insertable = false, updatable = false)
    private User securityOfficer;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", referencedColumnName = "id", insertable = false, updatable = false)
    private Item item;

    @Column(name = "claim_id")
    private Long claimId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_id", referencedColumnName = "id", insertable = false, updatable = false)
    private Claim claim;

    @Convert(converter = SecurityTransactionTypeConverter.class)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;

    @Convert(converter = SecurityTransactionStatusConverter.class)
    @Column(nullable = false)
    private TransactionStatus status;

    @Column(name = "received_from", length = 100)
    private String receivedFrom;

    @Column(name = "released_to", length = 100)
    private String releasedTo;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "transaction_date", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum TransactionType {
        RECEIVE, RELEASE
    }

    public enum TransactionStatus {
        REQUESTED, RECEIVED
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSecurityOfficerId() {
        return securityOfficerId;
    }

    public void setSecurityOfficerId(Long securityOfficerId) {
        this.securityOfficerId = securityOfficerId;
    }

    public Long getItemId() {
        return itemId;
    }

    public void setItemId(Long itemId) {
        this.itemId = itemId;
    }

    public Long getClaimId() {
        return claimId;
    }

    public void setClaimId(Long claimId) {
        this.claimId = claimId;
    }

    public TransactionType getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(TransactionType transactionType) {
        this.transactionType = transactionType;
    }

    public TransactionStatus getStatus() {
        return status;
    }

    public void setStatus(TransactionStatus status) {
        this.status = status;
    }

    public String getReceivedFrom() {
        return receivedFrom;
    }

    public void setReceivedFrom(String receivedFrom) {
        this.receivedFrom = receivedFrom;
    }

    public String getReleasedTo() {
        return releasedTo;
    }

    public void setReleasedTo(String releasedTo) {
        this.releasedTo = releasedTo;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
