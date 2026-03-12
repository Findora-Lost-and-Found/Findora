package com.findora.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Match entity - Auto-generated matches between lost/found items.
 */
@Entity
@Table(name = "matches", indexes = {
    @Index(name = "idx_matches_lost_item", columnList = "lost_item_id"),
    @Index(name = "idx_matches_found_item", columnList = "found_item_id"),
    @Index(name = "idx_matches_score", columnList = "match_score")
})
@SuppressWarnings({"unused", "FieldMayBeFinal"})
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lost_item_id", nullable = false)
    private Long lostItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lost_item_id", referencedColumnName = "id", insertable = false, updatable = false)
    private Item lostItem;

    @Column(name = "found_item_id", nullable = false)
    private Long foundItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "found_item_id", referencedColumnName = "id", insertable = false, updatable = false)
    private Item foundItem;

    @Column(name = "match_score", nullable = false)
    private BigDecimal matchScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "match_type", nullable = false)
    private MatchType matchType;

    @Column(name = "is_notified", nullable = false)
    private Boolean isNotified = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum MatchType {
        ITEM_FOUND, POSSIBLE_MATCH
    }
}
