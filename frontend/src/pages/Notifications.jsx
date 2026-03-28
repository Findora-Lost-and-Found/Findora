import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notificationsAPI } from '../services/api';
import { toast } from 'react-toastify';

const isPetitionNotification = (notification) => {
  const title = String(notification?.title || '').toLowerCase();
  const message = String(notification?.message || '').toLowerCase();
  return title.includes('petition') || message.includes('submitted a suspend petition') || message.includes('submitted a ban petition');
};

const buildStatusLabel = (user = {}) => {
  if (user.is_banned) return 'Banned (lifetime)';
  if (user.is_suspended) {
    return user.suspended_until ? `Suspended until ${new Date(user.suspended_until).toLocaleString()}` : 'Suspended';
  }
  return 'Active';
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [petitionModal, setPetitionModal] = useState(null);
  const [petitionLoading, setPetitionLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll();
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      loadNotifications();
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      toast.success('All marked as read');
      loadNotifications();
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationsAPI.delete(id);
      toast.success('Notification deleted');
      loadNotifications();
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const openPetitionReview = async (notification) => {
    try {
      setPetitionLoading(true);
      const response = await notificationsAPI.getPetitionDetails(notification.id);
      setPetitionModal({ notificationId: notification.id, ...response.data });
      if (!notification.is_read) {
        markAsRead(notification.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load petition details');
    } finally {
      setPetitionLoading(false);
    }
  };

  const handleReviewPetition = async (decision) => {
    if (!petitionModal?.notificationId) return;

    try {
      setReviewSubmitting(true);
      await notificationsAPI.reviewPetition(petitionModal.notificationId, decision);
      toast.success(decision === 'accept' ? 'Petition accepted and account updated' : 'Petition declined');
      setPetitionModal(null);
      loadNotifications();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to review petition');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <div className="notifications-header">
        <h1>Notifications</h1>
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllAsRead} className="btn-secondary">Mark All as Read</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p>No notifications.</p>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div key={notification.id} className={`notification-card ${notification.is_read ? 'read' : 'unread'}`}>
              <div className="notification-content">
                <span className={`notification-type ${notification.type}`}>{notification.type}</span>
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                <small>{new Date(notification.created_at).toLocaleString()}</small>
              </div>
              <div className="notification-actions">
                {isPetitionNotification(notification) && (
                  <button
                    onClick={() => openPetitionReview(notification)}
                    className="btn-link"
                    disabled={petitionLoading}
                    title="Review petition"
                  >
                    Review Petition
                  </button>
                )}
                {notification.type === 'match' && notification.found_item_id && (
                  <Link
                    to={`/found-items?focusItem=${notification.found_item_id}`}
                    className="btn-link"
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    View Match
                  </Link>
                )}
                {notification.type === 'claim' && (
                  <Link
                    to="/my-claims"
                    className="btn-link"
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    View Claim
                  </Link>
                )}
                {!notification.is_read && (
                  <button onClick={() => markAsRead(notification.id)} className="btn-link">Mark as Read</button>
                )}
                <button onClick={() => deleteNotification(notification.id)} className="btn-link delete">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {petitionModal && (
        <div className="petition-modal-overlay" role="presentation" onClick={() => setPetitionModal(null)}>
          <div
            className="petition-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="petition-review-title"
            onClick={(event) => event.stopPropagation()}
            style={{ width: 'min(900px, 100%)', maxHeight: '90vh', overflow: 'auto' }}
          >
            <h3 id="petition-review-title">Petition Review</h3>
            <p style={{ marginBottom: '0.75rem' }}>
              Petition Type: <strong>{petitionModal.petition?.type === 'ban' ? 'Ban Appeal' : 'Suspension Review'}</strong>
            </p>
            <p style={{ marginBottom: '1rem' }}>
              Reason: {petitionModal.petition?.reason || '-'}
            </p>

            <div className="table-container" style={{ marginBottom: '1rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{petitionModal.user?.full_name || petitionModal.user?.username}</td>
                    <td>{petitionModal.user?.email || '-'}</td>
                    <td>{petitionModal.user?.role || '-'}</td>
                    <td>{buildStatusLabel(petitionModal.user)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 style={{ margin: '0 0 0.5rem' }}>User Reported Posts</h4>
            {petitionModal.posts?.length ? (
              <div className="table-container" style={{ marginBottom: '1rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Item</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {petitionModal.posts.map((post) => (
                      <tr key={post.id}>
                        <td>{post.type}</td>
                        <td>{post.category}</td>
                        <td>{post.item_name}</td>
                        <td>{post.status}</td>
                        <td>{post.created_at ? new Date(post.created_at).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#64748b', marginBottom: '1rem' }}>No posts found for this user.</p>
            )}

            <div className="petition-modal-actions">
              <button type="button" className="petition-btn petition-btn-ghost" onClick={() => setPetitionModal(null)} disabled={reviewSubmitting}>
                Close
              </button>
              <button
                type="button"
                className="petition-btn petition-btn-decline"
                onClick={() => handleReviewPetition('decline')}
                disabled={reviewSubmitting}
                title="Decline petition"
              >
                Decline
              </button>
              <button
                type="button"
                className="petition-btn petition-btn-accept"
                onClick={() => handleReviewPetition('accept')}
                disabled={reviewSubmitting}
                title="Accept petition and remove restriction"
              >
                {reviewSubmitting ? 'Processing...' : 'Accept Petition'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
