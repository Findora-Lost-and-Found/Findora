import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
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
  }, []);

  const loadStats = async () => {
    try {
      const [statsRes, approvalsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getPendingApprovals()
      ]);

      const baseStats = statsRes.data.stats;
      const declinedIds = getDeclinedApprovalIds();
      const approvals = approvalsRes.data.approvals || [];

      // Keep dashboard count aligned with Pending Approvals page visibility rules.
      const visiblePendingCount = approvals.filter((user) => {
        const isSuspended = toBoolean(user?.is_suspended) || toBoolean(user?.isSuspended);
        const isDeclinedLocally = declinedIds.includes(Number(user?.id));
        return !isSuspended && !isDeclinedLocally;
      }).length;

      setStats({
        ...baseStats,
        pendingApprovals: visiblePendingCount
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
          <Link to="/admin/users" className="stat-card stat-card-link">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.users.total}</p>
          </Link>

          <Link to="/admin/items" className="stat-card stat-card-link">
            <h3>Active Lost Items</h3>
            <p className="stat-number">{stats.items.lost}</p>
          </Link>

          <Link to="/admin/items/found" className="stat-card stat-card-link">
            <h3>Active Found Items</h3>
            <p className="stat-number">{stats.items.found}</p>
          </Link>

          <Link to="/admin/items/receive" className="stat-card stat-card-link">
            <h3>Claimed Items</h3>
            <p className="stat-number">{stats.items.claimed}</p>
          </Link>

          <Link to="/admin/reports" className="stat-card stat-card-link">
            <h3>Pending Reports</h3>
            <p className="stat-number warning">{stats.pendingReports}</p>
          </Link>

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
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
