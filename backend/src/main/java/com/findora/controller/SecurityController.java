package com.findora.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * SecurityController - Security officer endpoints (TODO: Full implementation).
 */
@RestController
@RequestMapping("/api/security")
public class SecurityController {

    @PostMapping("/verify-claim")
    public ResponseEntity<?> verifyClaim(@RequestBody Map<String, String> verifyData) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement verify claim OTP"));
    }

    @PostMapping("/receive-item")
    public ResponseEntity<?> receiveItem(@RequestBody Map<String, Object> itemData) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement item receipt"));
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement get transactions"));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getSecurityStats() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement security stats"));
    }
}
