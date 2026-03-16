import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { notificationsAPI } from '../services/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      // Keep badge fresh so match notifications appear quickly after a found post.
      const interval = setInterval(fetchUnreadCount, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Findora
        </Link>

        {user && (
          <div className="nav-menu">
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            
            {(user.role === 'student' || user.role === 'staff') && (
              <>
                <Link to="/lost-items" className="nav-link">My Lost Items</Link>
                <Link to="/found-items" className="nav-link">Found Items</Link>
                <Link to="/my-claims" className="nav-link">My Claims</Link>
              </>
            )}

            {user.role === 'security' && (
              <>
                <Link to="/security/receive" className="nav-link">Receive Item</Link>
                <Link to="/security/pending-claims" className="nav-link">Pending Claims</Link>
                <Link to="/security/transactions" className="nav-link">Transactions</Link>
              </>
            )}

            {user.role === 'admin' && (
              <>
                <Link to="/admin-panel" className="nav-link">Admin Panel</Link>
                <Link to="/admin/users" className="nav-link">Users</Link>
                <Link to="/admin/pending-approvals" className="nav-link">Pending Approvals</Link>
                <Link to="/admin/items" className="nav-link">Items</Link>
                <Link to="/admin/reports" className="nav-link">Reports</Link>
              </>
            )}

            <Link to="/notifications" className="nav-link notification-link">
              Notifications
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </Link>

            <Link to="/profile" className="nav-link">Profile</Link>
            <button onClick={handleLogout} className="nav-link logout-btn">Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
