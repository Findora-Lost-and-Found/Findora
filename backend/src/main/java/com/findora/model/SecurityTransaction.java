package com.findora.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * SecurityTransaction entity - Item transactions (receive/release).
 */
@Entity
@Table(name = "security_transactions", indexes = {
    @Index(name = "idx_security_officer", columnList = "security_officer_id"),
    @Index(name = "idx_transaction_type", columnList = "transaction_type"),
    @Index(name = "idx_transaction_date", columnList = "transaction_date")
})
@SuppressWarnings({"unused", "FieldMayBeFinal"})
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

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;

    @Column(name = "received_from", length = 100)
    private String receivedFrom;

    @Column(name = "released_to", length = 100)
    private String releasedTo;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "transaction_date", nullable = false, updatable = false)
    private LocalDateTime transactionDate;

    public enum TransactionType {
        RECEIVE, RELEASE
    }
}
