export const getHomeRouteForRole = (role) => {
  switch (role) {
    case 'security':
      return '/security';
    case 'admin':
      return '/admin/dashboard';
    case 'student':
    case 'staff':
    default:
      return '/dashboard';
  }
};

export const getHomeRouteForUser = (user) => getHomeRouteForRole(user?.role);