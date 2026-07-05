package com.findora.service;

import com.findora.model.User;

/**
 * Centralized role feature decisions used by services.
 * Keep outcomes equivalent to current behavior unless intentionally changed.
 */
public interface RoleFeatureProvider {

    boolean requiresEmailVerification(User.UserRole role);

    boolean isAutoApprovedAtSignup(User.UserRole role);

    boolean canCreateClaim(User.UserRole role);

    boolean canAccessSecurityQueue(User.UserRole role);

    boolean canVerifyClaimOtp(User.UserRole role);
}
