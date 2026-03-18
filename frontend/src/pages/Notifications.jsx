import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notificationsAPI } from '../services/api';
import { toast } from 'react-toastify';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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
    </div>
  );
};

export default Notifications;
