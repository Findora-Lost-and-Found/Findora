import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

// Lazy-load pages so one broken page does not blank the whole app at startup.
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

const Dashboard = lazy(() => import('./pages/Dashboard'));
const SecurityDashboard = lazy(() => import('./pages/SecurityDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));

const ReportLostItem = lazy(() => import('./pages/ReportLostItem'));
const ReportFoundItem = lazy(() => import('./pages/ReportFoundItem'));
const ReportPost = lazy(() => import('./pages/ReportPost'));
const LostItems = lazy(() => import('./pages/LostItems'));
const FoundItems = lazy(() => import('./pages/FoundItems'));
const MyClaims = lazy(() => import('./pages/MyClaims'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminPendingApprovals = lazy(() => import('./pages/admin/AdminPendingApprovals'));
const AdminItemsByStatus = lazy(() => import('./pages/admin/AdminItemsByStatus'));

const SecurityPendingClaims = lazy(() => import('./pages/security/SecurityPendingClaims'));
const SecurityReceiveItems = lazy(() => import('./pages/security/SecurityReceiveItems'));
const SecurityTransactions = lazy(() => import('./pages/security/SecurityTransactions'));

function App() {
  useEffect(() => {
    const storedTheme = localStorage.getItem('findora-theme') || 'light';
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(`${storedTheme}-mode`);
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Navbar />
          <Suspense fallback={<div className="loading">Loading page...</div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<Navigate to="/login" />} />

              {/* Auth Routes */}
              <Route path="/verify-email" element={<PrivateRoute><VerifyEmail /></PrivateRoute>} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

              {/* Item Routes */}
              <Route path="/report-lost" element={<PrivateRoute roles={['student', 'staff', 'security']}><ReportLostItem /></PrivateRoute>} />
              <Route path="/report-found" element={<PrivateRoute roles={['student', 'staff', 'security']}><ReportFoundItem /></PrivateRoute>} />
              <Route path="/report-post/:itemId" element={<PrivateRoute roles={['student', 'staff', 'security']}><ReportPost /></PrivateRoute>} />
              <Route path="/lost-items" element={<PrivateRoute roles={['student', 'staff', 'security']}><LostItems /></PrivateRoute>} />
              <Route path="/found-items" element={<PrivateRoute roles={['student', 'staff', 'security']}><FoundItems /></PrivateRoute>} />
              <Route path="/my-claims" element={<PrivateRoute roles={['student', 'staff']}><MyClaims /></PrivateRoute>} />

              {/* Security Routes */}
              <Route path="/security" element={<PrivateRoute roles={['security', 'admin']}><Navigate to="/dashboard" replace /></PrivateRoute>} />
              <Route path="/security/dashboard" element={<PrivateRoute roles={['security', 'admin']}><SecurityDashboard /></PrivateRoute>} />
              <Route path="/security/receive" element={<PrivateRoute roles={['security', 'admin']}><SecurityReceiveItems /></PrivateRoute>} />
              <Route path="/security/pending-claims" element={<PrivateRoute roles={['security', 'admin']}><SecurityPendingClaims /></PrivateRoute>} />
              <Route path="/security/transactions" element={<PrivateRoute roles={['security', 'admin']}><SecurityTransactions /></PrivateRoute>} />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={<PrivateRoute roles={['admin']}><Navigate to="/admin-panel" replace /></PrivateRoute>} />
              <Route path="/admin-panel" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
              <Route path="/admin/users" element={<PrivateRoute roles={['admin']}><AdminUsers /></PrivateRoute>} />
              <Route path="/admin/pending-approvals" element={<PrivateRoute roles={['admin']}><AdminPendingApprovals /></PrivateRoute>} />
              <Route path="/admin/items" element={<PrivateRoute roles={['admin']}><Navigate to="/admin/items/found" replace /></PrivateRoute>} />
              <Route path="/admin/items/:section" element={<PrivateRoute roles={['admin']}><AdminItemsByStatus /></PrivateRoute>} />
            </Routes>
          </Suspense>
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
