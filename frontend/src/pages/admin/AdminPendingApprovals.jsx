import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import MobileWarning from '../../components/MobileWarning';

const DECLINED_APPROVAL_IDS_KEY = 'findora-declined-approval-ids';

const toBoolean = (value) => {
  return value === true || value === 1 || value === '1' || value === 'true';
};

const getDeclinedApprovalIds = () => {
  try {
    const raw = localStorage.getItem(DECLINED_APPROVAL_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    return [];
  }
};

const saveDeclinedApprovalIds = (ids) => {
  localStorage.setItem(DECLINED_APPROVAL_IDS_KEY, JSON.stringify(ids));
};

const addDeclinedApprovalId = (userId) => {
  const existingIds = getDeclinedApprovalIds();
  const normalizedId = Number(userId);
  if (!existingIds.includes(normalizedId)) {
    saveDeclinedApprovalIds([...existingIds, normalizedId]);
  }
};

const removeDeclinedApprovalId = (userId) => {
  const normalizedId = Number(userId);
  const nextIds = getDeclinedApprovalIds().filter((id) => id !== normalizedId);
  saveDeclinedApprovalIds(nextIds);
};

const AdminPendingApprovals = () => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
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
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPendingApprovals();
      const approvals = response.data.approvals || [];
      const declinedIds = getDeclinedApprovalIds();

      // Declined users are suspended; keep them out of pending list even after refresh.
      const visibleApprovals = approvals.filter((user) => {
        const isSuspended = toBoolean(user?.is_suspended) || toBoolean(user?.isSuspended);
        const isDeclinedLocally = declinedIds.includes(Number(user?.id));
        return !isSuspended && !isDeclinedLocally;
      });

      setPendingApprovals(visibleApprovals);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      setPendingApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await adminAPI.approveUser(userId);
      removeDeclinedApprovalId(userId);
      toast.success('User approved successfully');
      loadPendingApprovals();
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const handleDecline = async (userId) => {
    try {
      // Use suspension to decline pending access with the currently available admin API.
      await adminAPI.suspendUser(userId, true);
      addDeclinedApprovalId(userId);
      setPendingApprovals((prev) => prev.filter((user) => user.id !== userId));
      toast.success('User declined successfully');
    } catch (error) {
      toast.error('Failed to decline user');
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
      <h1>Pending Approvals</h1>

      <div className="section">
        <h2>Users Waiting for Approval ({pendingApprovals.length})</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingApprovals.length === 0 ? (
                <tr>
                  <td colSpan={5}>No pending approvals.</td>
                </tr>
              ) : (
                pendingApprovals.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td className="action-buttons">
                      <button onClick={() => handleApprove(user.id)} className="btn-small btn-success">
                        Approve
                      </button>
                      <button onClick={() => handleDecline(user.id)} className="btn-small btn-danger">
                        Decline
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPendingApprovals;
