import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../Navbar';

const NAVBAR_HIDDEN_ROUTES = new Set([
  '/login',
  '/sign-in',
  '/signup',
  '/logout',
  '/otp',
  '/verify-otp',
  '/otp-verification',
  '/forgot-password',
  '/reset-password',
  '/verify-email'
]);

const isHiddenRoute = (pathname = '') => {
  const normalizedPath = String(pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';

  if (NAVBAR_HIDDEN_ROUTES.has(normalizedPath)) {
    return true;
  }

  // Covers nested auth/otp pages (for example: /verify-email/otp or /auth/verify-otp).
  return normalizedPath.startsWith('/verify-email')
    || normalizedPath.startsWith('/auth')
    || normalizedPath.includes('/otp');
};

const AppShell = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  const showNavbar = useMemo(
    () => !loading && isAuthenticated && !isHiddenRoute(location.pathname),
    [loading, isAuthenticated, location.pathname]
  );

  return (
    <div className="app">
      {showNavbar && <Navbar />}
      {children}
    </div>
  );
};

export default AppShell;
