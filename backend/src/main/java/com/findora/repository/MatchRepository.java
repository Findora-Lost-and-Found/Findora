package com.findora.repository;

import com.findora.model.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * MatchRepository - Data access for Match entity.
 */
@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {
    List<Match> findByFoundItemId(Long foundItemId);
    List<Match> findByLostItemId(Long lostItemId);
    List<Match> findByLostItemIdAndIsNotifiedFalse(Long lostItemId);
}
