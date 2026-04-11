package com.findora.service;

import org.springframework.stereotype.Component;

import com.findora.model.User;

@Component
public class DefaultRoleFeatureProvider implements RoleFeatureProvider {

    @Override
    public boolean requiresEmailVerification(User.UserRole role) {
        return role == User.UserRole.STUDENT
            || role == User.UserRole.STAFF
            || role == User.UserRole.SECURITY;
    }

    @Override
    public boolean isAutoApprovedAtSignup(User.UserRole role) {
        return role == User.UserRole.STUDENT;
    }

    @Override
    public boolean canCreateClaim(User.UserRole role) {
        return role == User.UserRole.STUDENT || role == User.UserRole.STAFF;
    }

    @Override
    public boolean canAccessSecurityQueue(User.UserRole role) {
        return role == User.UserRole.SECURITY || role == User.UserRole.ADMIN;
    }

    @Override
    public boolean canVerifyClaimOtp(User.UserRole role) {
        return role == User.UserRole.SECURITY || role == User.UserRole.ADMIN;
    }
}
