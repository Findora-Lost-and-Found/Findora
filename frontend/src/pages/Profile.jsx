import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  const memberSince = user.createdAt || user.created_at;
  return (
    <div className="container">
      <div className="profile-container">
        <h1>My Profile</h1>

        <div className="profile-card">
          <div className="profile-info">
            <h2>{user.full_name}</h2>
            <p className="role-badge">{user.role}</p>

            <div className="profile-details">
              <div className="detail-row">
                <strong>Username:</strong>
                <span>{user.username}</span>
              </div>
              <div className="detail-row">
                <strong>Email:</strong>
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="detail-row">
                  <strong>Phone:</strong>
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="detail-row">
                <strong>Email Verified:</strong>
                <span className={user.is_verified ? 'verified' : 'not-verified'}>
                  {user.is_verified ? '✓ Verified' : '✗ Not Verified'}
                </span>
              </div>
              {(user.role === 'security' || user.role === 'admin') && (
                <div className="detail-row">
                  <strong>Account Status:</strong>
                  <span className={user.is_approved ? 'approved' : 'pending'}>
                    {user.is_approved ? '✓ Approved' : 'Pending Approval'}
                  </span>
                </div>
              )}
              <div className="detail-row">
                <strong>Member Since:</strong>
                <span>{memberSince ? new Date(memberSince).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
