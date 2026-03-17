import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import MobileWarning from '../../components/MobileWarning';

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
      setPendingApprovals(response.data.approvals || []);
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
      toast.success('User approved successfully');
      loadPendingApprovals();
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const handleDecline = async (userId) => {
    try {
      await adminAPI.declineUser(userId);
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
