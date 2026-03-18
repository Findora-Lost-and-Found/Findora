import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import MobileWarning from '../../components/MobileWarning';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
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
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const usersRes = await adminAPI.getUsers();
      setUsers(usersRes.data.users);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId, banned) => {
    try {
      await adminAPI.banUser(userId, banned);
      toast.success(banned ? 'User banned' : 'User unbanned');
      loadData();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleSuspend = async (userId, suspended) => {
    try {
      await adminAPI.suspendUser(userId, suspended);
      toast.success(suspended ? 'User suspended' : 'Suspension lifted');
      loadData();
    } catch (error) {
      toast.error('Failed to update user');
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
      <h1>User Management</h1>

      <div className="section">
        <h2>All Users ({users.length})</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                // Backend may send 0/1 values; normalize to booleans to prevent "0" text from rendering.
                const isBanned = user.is_banned === true || user.is_banned === 1;
                const isSuspended = user.is_suspended === true || user.is_suspended === 1;
                const isApproved = user.is_approved === true || user.is_approved === 1;
                const status = isBanned
                  ? { label: 'Banned', className: 'badge-danger' }
                  : isSuspended
                    ? { label: 'Suspended', className: 'badge-warning' }
                    : !isApproved
                      ? { label: 'Pending', className: 'badge-info' }
                      : { label: 'Active', className: 'badge-success' };

                return (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <span className={`badge ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="action-buttons">
                      {!isBanned ? (
                        <button onClick={() => handleBan(user.id, true)} className="btn-small btn-danger">
                          Ban
                        </button>
                      ) : (
                        <button onClick={() => handleBan(user.id, false)} className="btn-small btn-success">
                          Unban
                        </button>
                      )}
                      {!isSuspended ? (
                        <button onClick={() => handleSuspend(user.id, true)} className="btn-small btn-warning">
                          Suspend
                        </button>
                      ) : (
                        <button onClick={() => handleSuspend(user.id, false)} className="btn-small btn-success">
                          Unsuspend
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
