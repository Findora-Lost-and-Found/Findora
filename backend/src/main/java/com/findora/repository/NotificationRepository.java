package com.findora.repository;

import com.findora.model.Notification;
import com.findora.model.Notification.NotificationType;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * NotificationRepository - Data access for Notification entity.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByUserId(Long userId, Pageable pageable);
    List<Notification> findByUserIdAndIsReadFalse(Long userId);
    Optional<Notification> findByIdAndUserId(Long id, Long userId);
    Optional<Notification> findTopByUserIdAndTypeAndTitleOrderByCreatedAtDesc(Long userId, NotificationType type, String title);
    long countByUserIdAndIsReadFalse(Long userId);
    long countByUserIdAndTypeAndTitleAndRelatedId(Long userId, NotificationType type, String title, Long relatedId);
    void deleteByUserIdAndIsReadTrue(Long userId);
}
