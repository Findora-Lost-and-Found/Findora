package com.findora.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.findora.model.Claim;
import com.findora.repository.UserRepository;
import com.findora.service.MatchService;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final MatchService matchService;
    private final UserRepository userRepository;

    public MatchController(MatchService matchService, UserRepository userRepository) {
        this.matchService = matchService;
        this.userRepository = userRepository;
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF', 'SECURITY', 'ADMIN')")
    public ResponseEntity<?> getMyMatches() {
        try {
            Long currentUserId = getCurrentUserId();
            List<Map<String, Object>> matches = matchService.getMyMatches(currentUserId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "matches", matches,
                "count", matches.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF', 'SECURITY', 'ADMIN')")
    public ResponseEntity<?> getMatchById(@PathVariable Long id) {
        try {
            Long currentUserId = getCurrentUserId();
            Map<String, Object> match = matchService.getMatchDetail(id, currentUserId);
            return ResponseEntity.ok(Map.of("success", true, "match", match));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    @PostMapping("/{matchId}/resend-otp")
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF', 'SECURITY', 'ADMIN')")
    public ResponseEntity<?> resendOtp(@PathVariable Long matchId) {
        try {
            Long currentUserId = getCurrentUserId();
            Map<String, Object> result = matchService.resendOtp(matchId, currentUserId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "OTP resent successfully",
                "match", result
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    @PostMapping("/{matchId}/claim")
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF', 'SECURITY', 'ADMIN')")
    public ResponseEntity<?> claimMatch(@PathVariable Long matchId, @RequestBody Map<String, String> request) {
        try {
            Long currentUserId = getCurrentUserId();
            String otp = request != null ? request.get("otp") : null;
            if (otp == null || otp.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "otp is required"
                ));
            }

            Claim claim = matchService.claimMatch(matchId, otp, currentUserId);

            Map<String, Object> claimPayload = new LinkedHashMap<>();
            claimPayload.put("id", claim.getId());
            claimPayload.put("item_id", claim.getItemId());
            claimPayload.put("otp", claim.getOtp());
            claimPayload.put("otp_expiry", claim.getOtpExpiry());
            claimPayload.put("status", claim.getStatus() != null ? claim.getStatus().name().toLowerCase() : null);
            claimPayload.put("claimed_at", claim.getClaimedAt());

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "success", true,
                "message", "Claim submitted successfully",
                "otp", claim.getOtp(),
                "claim", claimPayload
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Server error"));
        }
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("User not authenticated");
        }

        String username = auth.getName();
        return userRepository.findByUsername(username)
            .map(user -> user.getId())
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
