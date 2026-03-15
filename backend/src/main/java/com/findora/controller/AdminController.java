package com.findora.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AdminController - Administrative endpoints (TODO: Full implementation).
 * All endpoints require ADMIN role.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement get users (ADMIN only)"));
    }

    @GetMapping("/pending-approvals")
    public ResponseEntity<?> getPendingApprovals(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement pending approvals (ADMIN only)"));
    }

    @PutMapping("/approve-user/{id}")
    public ResponseEntity<?> approveUser(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement user approval (ADMIN only)"));
    }

    @PutMapping("/ban-user/{id}")
    public ResponseEntity<?> banUser(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement user ban (ADMIN only)"));
    }

    @PutMapping("/suspend-user/{id}")
    public ResponseEntity<?> suspendUser(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement user suspension (ADMIN only)"));
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getReports(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement get reports (ADMIN only)"));
    }

    @PutMapping("/reports/{id}")
    public ResponseEntity<?> updateReport(@PathVariable Long id, @RequestBody Map<String, String> updateData) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement report update (ADMIN only)"));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getAdminStats() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("message", "TODO: Implement admin stats (ADMIN only)"));
    }
}
