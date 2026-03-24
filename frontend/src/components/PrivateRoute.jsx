import { Navigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeRouteForUser } from '../utils/navigation';

const PrivateRoute = ({ children, roles, allowPendingApproval = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const role = String(user.role || '').toLowerCase();
  const isVerified = Boolean(user.is_verified ?? user.isVerified);
  const requiresOtpVerification = (role === 'student' || role === 'staff' || role === 'security') && !isVerified;
  if (requiresOtpVerification && location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace />;
  }

  const isApproved = Boolean(user.is_approved ?? user.isApproved);
  const requiresAdminApproval = (role === 'security' || role === 'admin')
    && !isApproved
    && (role !== 'security' || isVerified);

  if (requiresAdminApproval && !allowPendingApproval) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (!requiresAdminApproval && allowPendingApproval) {
    return <Navigate to={getHomeRouteForUser(user)} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getHomeRouteForUser(user)} replace />;
  }

  return children;
};

export default PrivateRoute;
