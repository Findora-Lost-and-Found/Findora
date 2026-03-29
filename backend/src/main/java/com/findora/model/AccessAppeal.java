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

@Entity
@Table(name = "user_access_appeals", indexes = {
    @Index(name = "idx_access_appeals_user_id", columnList = "user_id"),
    @Index(name = "idx_access_appeals_status", columnList = "status"),
    @Index(name = "idx_access_appeals_created_at", columnList = "created_at")
})
public class AccessAppeal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "id", insertable = false, updatable = false)
    private User user;

    @Convert(converter = AppealActionTypeConverter.class)
    @Column(name = "action_type", nullable = false)
    private AppealActionType actionType;

    @Convert(converter = AppealStatusConverter.class)
    @Column(nullable = false)
    private AppealStatus status;

    @Column(name = "appeal_text", columnDefinition = "TEXT", nullable = false)
    private String appealText;

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    public enum AppealActionType {
        SUSPENSION,
        BAN;

        public String toDatabaseValue() {
            return name().toLowerCase(Locale.ROOT);
        }

        public static AppealActionType fromDatabaseValue(String value) {
            if (value == null || value.isBlank()) {
                return null;
            }
            return AppealActionType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        }
    }

    public enum AppealStatus {
        PENDING,
        APPROVED,
        DECLINED;

        public String toDatabaseValue() {
            return name().toLowerCase(Locale.ROOT);
        }

        public static AppealStatus fromDatabaseValue(String value) {
            if (value == null || value.isBlank()) {
                return null;
            }
            return AppealStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        }
    }

    @Converter(autoApply = false)
    public static class AppealActionTypeConverter implements AttributeConverter<AppealActionType, String> {
        @Override
        public String convertToDatabaseColumn(AppealActionType attribute) {
            return attribute == null ? null : attribute.toDatabaseValue();
        }

        @Override
        public AppealActionType convertToEntityAttribute(String dbData) {
            return AppealActionType.fromDatabaseValue(dbData);
        }
    }

    @Converter(autoApply = false)
    public static class AppealStatusConverter implements AttributeConverter<AppealStatus, String> {
        @Override
        public String convertToDatabaseColumn(AppealStatus attribute) {
            return attribute == null ? null : attribute.toDatabaseValue();
        }

        @Override
        public AppealStatus convertToEntityAttribute(String dbData) {
            return AppealStatus.fromDatabaseValue(dbData);
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public AppealActionType getActionType() {
        return actionType;
    }

    public void setActionType(AppealActionType actionType) {
        this.actionType = actionType;
    }

    public AppealStatus getStatus() {
        return status;
    }

    public void setStatus(AppealStatus status) {
        this.status = status;
    }

    public String getAppealText() {
        return appealText;
    }

    public void setAppealText(String appealText) {
        this.appealText = appealText;
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

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }
}
