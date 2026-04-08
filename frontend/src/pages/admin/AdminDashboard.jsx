import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import MobileWarning from '../../components/MobileWarning';

const DECLINED_APPROVAL_IDS_KEY = 'findora-declined-approval-ids';

const toBoolean = (value) => {
  return value === true || value === 1 || value === '1' || value === 'true';
};

const getDeclinedApprovalIds = () => {
  try {
    const raw = localStorage.getItem(DECLINED_APPROVAL_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((id) => Number(id)) : [];
  } catch (error) {
    return [];
  }
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    loadStats();
  }, [isSuperAdmin]);

  const loadStats = async () => {
    try {
      const requests = [
        adminAPI.getStats(),
        adminAPI.getPendingApprovals()
      ];

      if (isSuperAdmin) {
        requests.push(adminAPI.getUsers());
      }

      const [statsRes, approvalsRes, usersRes] = await Promise.all(requests);

      const responseStats = statsRes.data.stats || {};
      const fallbackStats = {
        users: { total: 0 },
        items: { lost: 0, found: 0, claimed: 0, foundPosted: 0 },
        reports: { total: 0, pending: 0 },
        pendingReports: 0,
        pendingApprovals: 0,
        transactions: { received: 0, released: 0 }
      };
      const baseStats = {
        ...fallbackStats,
        ...responseStats,
        users: { ...fallbackStats.users, ...(responseStats.users || {}) },
        items: { ...fallbackStats.items, ...(responseStats.items || {}) },
        reports: { ...fallbackStats.reports, ...(responseStats.reports || {}) },
        transactions: { ...fallbackStats.transactions, ...(responseStats.transactions || {}) }
      };
      const declinedIds = getDeclinedApprovalIds();
      const approvals = approvalsRes.data.approvals || [];

      // Keep dashboard count aligned with Pending Approvals page visibility rules.
      const visiblePendingCount = approvals.filter((user) => {
        const isSuspended = toBoolean(user?.is_suspended) || toBoolean(user?.isSuspended);
        const isDeclinedLocally = declinedIds.includes(Number(user?.id));
        return !isSuspended && !isDeclinedLocally;
      }).length;

      const totalAdmins = isSuperAdmin
        ? (usersRes?.data?.users || []).filter((row) => String(row?.role || '').toLowerCase() === 'admin').length
        : baseStats.users.total;

      setStats({
        ...baseStats,
        pendingApprovals: visiblePendingCount,
        totalAdmins
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (isMobile) {
    return <MobileWarning userRole="admin" />;
  }

  return (
    <div className="container">
      <h1>Admin Dashboard</h1>

      {stats && (
        <div className="stats-grid">
          <>
            <Link to="/admin/users" className="stat-card stat-card-link">
              <h3>{isSuperAdmin ? 'Total Admins' : 'Total Users'}</h3>
              <p className="stat-number">{isSuperAdmin ? stats.totalAdmins : stats.users.total}</p>
            </Link>

            <Link to="/admin/items" className="stat-card stat-card-link">
              <h3>Active Lost Items</h3>
              <p className="stat-number">{stats.items.lost}</p>
            </Link>

            <Link to="/admin/items/found" className="stat-card stat-card-link">
              <h3>Active Found Items</h3>
              <p className="stat-number">{stats.items.found}</p>
            </Link>

            <Link to="/admin/items/found" className="stat-card stat-card-link">
              <h3>Found Items Posted</h3>
              <p className="stat-number">{stats.items.foundPosted || 0}</p>
            </Link>

            <Link to="/admin/items/receive" className="stat-card stat-card-link">
              <h3>Claimed Items</h3>
              <p className="stat-number">{stats.items.claimed}</p>
            </Link>

            {!isSuperAdmin && (
              <>
                <Link to="/admin/reports" className="stat-card stat-card-link">
                  <h3>Total Reports</h3>
                  <p className="stat-number">{stats.reports?.total || 0}</p>
                </Link>

                <Link to="/admin/reports" className="stat-card stat-card-link">
                  <h3>Pending Reports</h3>
                  <p className="stat-number warning">{stats.pendingReports}</p>
                </Link>
              </>
            )}

            <Link to="/admin/pending-approvals" className="stat-card stat-card-link">
              <h3>Pending Approvals</h3>
              <p className="stat-number warning">{stats.pendingApprovals}</p>
            </Link>

            <Link to="/admin/items/receive" className="stat-card stat-card-link">
              <h3>Items Received</h3>
              <p className="stat-number">{stats.transactions.received || 0}</p>
            </Link>

            <Link to="/admin/items/release" className="stat-card stat-card-link">
              <h3>Items Released</h3>
              <p className="stat-number">{stats.transactions.released || 0}</p>
            </Link>
          </>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
