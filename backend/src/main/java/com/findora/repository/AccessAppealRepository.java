package com.findora.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.findora.model.AccessAppeal;

@Repository
public interface AccessAppealRepository extends JpaRepository<AccessAppeal, Long> {
    Optional<AccessAppeal> findFirstByUserIdAndStatusOrderByCreatedAtDesc(Long userId, AccessAppeal.AppealStatus status);
    Page<AccessAppeal> findByStatusOrderByCreatedAtDesc(AccessAppeal.AppealStatus status, Pageable pageable);
    Page<AccessAppeal> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
