export const getHomeRouteForRole = (role) => {
  switch (role) {
    case 'security':
      return '/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'super_admin':
      return '/dashboard';
    case 'student':
    case 'staff':
    default:
      return '/dashboard';
  }
};

export const getHomeRouteForUser = (user) => getHomeRouteForRole(user?.role);