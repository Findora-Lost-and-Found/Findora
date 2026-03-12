package com.findora.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * ClaimController - Claim management endpoints (TODO: Full implementation).
 */
@RestController
@RequestMapping("/api/claims")
public class ClaimController {

    @PostMapping
    public ResponseEntity<?> createClaim(@RequestBody Map<String, Object> claimData) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement claim creation with OTP"));
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyClaims(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement get my claims"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getClaimById(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement get claim by ID"));
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingClaims(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement get pending claims (SECURITY only)"));
    }
}
