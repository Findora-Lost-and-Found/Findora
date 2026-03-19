package com.findora.model;

import java.time.LocalDateTime;
import java.util.Locale;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Converter;
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
 * Report entity - Post reports for admin review.
 */
@Entity
@Table(name = "post_reports", indexes = {
    @Index(name = "idx_reports_status", columnList = "status"),
    @Index(name = "idx_reports_reporter", columnList = "reporter_id")
})
@SuppressWarnings({"unused", "FieldMayBeFinal"})
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reporter_id", nullable = false)
    private Long reporterId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reporter_id", referencedColumnName = "id", insertable = false, updatable = false)
    private User reporter;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "item_id", referencedColumnName = "id", insertable = false, updatable = false)
    private Item item;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Convert(converter = ReportStatusConverter.class)
    @Column(nullable = false)
    private ReportStatus status;

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    public enum ReportStatus {
        PENDING, REVIEWED, RESOLVED;

        public String toDatabaseValue() {
            return name().toLowerCase(Locale.ROOT);
        }

        public static ReportStatus fromDatabaseValue(String value) {
            if (value == null || value.isBlank()) {
                return null;
            }
            try {
                return ReportStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                return PENDING;
            }
        }
    }

    @Converter(autoApply = false)
    public static class ReportStatusConverter implements AttributeConverter<ReportStatus, String> {

        @Override
        public String convertToDatabaseColumn(ReportStatus attribute) {
            return attribute == null ? null : attribute.toDatabaseValue();
        }

        @Override
        public ReportStatus convertToEntityAttribute(String dbData) {
            return ReportStatus.fromDatabaseValue(dbData);
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getReporterId() {
        return reporterId;
    }

    public void setReporterId(Long reporterId) {
        this.reporterId = reporterId;
    }

    public User getReporter() {
        return reporter;
    }

    public void setReporter(User reporter) {
        this.reporter = reporter;
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

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public ReportStatus getStatus() {
        return status;
    }

    public void setStatus(ReportStatus status) {
        this.status = status;
    }

    public String getAdminNotes() {
        return adminNotes;
    }

    public void setAdminNotes(String adminNotes) {
        this.adminNotes = adminNotes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(LocalDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }
}
