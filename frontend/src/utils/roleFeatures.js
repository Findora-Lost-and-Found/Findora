const ROLE_FEATURES = {
  student: {
    requiresVerification: true,
    autoApprovedAtSignup: true,
    canCreateClaim: true,
    canAccessSecurityQueue: false,
    canVerifyClaimOtp: false,
  },
  staff: {
    requiresVerification: true,
    autoApprovedAtSignup: false,
    canCreateClaim: true,
    canAccessSecurityQueue: false,
    canVerifyClaimOtp: false,
  },
  security: {
    requiresVerification: true,
    autoApprovedAtSignup: false,
    canCreateClaim: false,
    canAccessSecurityQueue: true,
    canVerifyClaimOtp: true,
  },
  admin: {
    requiresVerification: false,
    autoApprovedAtSignup: false,
    canCreateClaim: false,
    canAccessSecurityQueue: true,
    canVerifyClaimOtp: true,
  },
  super_admin: {
    requiresVerification: false,
    autoApprovedAtSignup: false,
    canCreateClaim: false,
    canAccessSecurityQueue: false,
    canVerifyClaimOtp: false,
  },
};

export const getRoleFeatures = (role) => {
  const normalizedRole = String(role || "").trim().toLowerCase();
  return ROLE_FEATURES[normalizedRole] || {
    requiresVerification: false,
    autoApprovedAtSignup: false,
    canCreateClaim: false,
    canAccessSecurityQueue: false,
    canVerifyClaimOtp: false,
  };
};

export const hasRoleFeature = (role, featureKey) => {
  return Boolean(getRoleFeatures(role)[featureKey]);
};

export { ROLE_FEATURES };
