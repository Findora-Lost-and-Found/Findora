package com.findora.repository;

import com.findora.model.Report;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * ReportRepository - Data access for Report entity.
 */
@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    Page<Report> findByStatus(Report.ReportStatus status, Pageable pageable);
    Page<Report> findByReporterId(Long reporterId, Pageable pageable);
    @Query("SELECT r FROM Report r JOIN r.item i WHERE i.userId = :userId ORDER BY r.createdAt DESC")
    List<Report> findByPostedUserId(@Param("userId") Long userId);
    long countByStatus(Report.ReportStatus status);
}
