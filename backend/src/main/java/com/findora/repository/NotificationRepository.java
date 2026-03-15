package com.findora.repository;

import com.findora.model.Notification;
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
    long countByUserIdAndIsReadFalse(Long userId);
    void deleteByUserIdAndIsReadTrue(Long userId);
}
