package com.findora.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.findora.model.Match;
import com.findora.model.Match.MatchStatus;

/**
 * MatchRepository - Data access for Match entity.
 */
@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {
    List<Match> findByFoundItemId(Long foundItemId);
    List<Match> findByLostItemId(Long lostItemId);
    Optional<Match> findByLostItemIdAndFoundItemId(Long lostItemId, Long foundItemId);
    List<Match> findByStatus(MatchStatus status);

    @Query("SELECT m FROM Match m JOIN m.lostItem li WHERE li.userId = :userId ORDER BY m.createdAt DESC")
    List<Match> findForLostReporter(@Param("userId") Long userId);
}
