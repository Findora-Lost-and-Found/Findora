import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { notificationsAPI } from '../services/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      // Keep badge fresh so match notifications appear quickly after a found post.
      const interval = setInterval(fetchUnreadCount, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogout = () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) {
      setIsMoreMenuOpen(false);
      return;
    }

    setIsMoreMenuOpen(false);
    logout();
    navigate('/login');
  };

  const closeMoreMenu = () => {
    setIsMoreMenuOpen(false);
  };

  const getNavLinkClassName = ({ isActive }) => (
    isActive ? 'nav-link nav-link-active' : 'nav-link'
  );

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-header" aria-label="Application header">
          {user ? (
            <span className="nav-logo" aria-label="Findora home title">Findora</span>
          ) : (
            <Link to="/" className="nav-logo" aria-label="Findora home title">
              Findora
            </Link>
          )}
        </div>

        {user && (
          <div className="nav-actions" aria-label="Navigation actions">
            <div className="nav-menu">
              <NavLink to="/dashboard" className={getNavLinkClassName}>Dashboard</NavLink>

              {(user.role === 'student' || user.role === 'staff' || user.role === 'security') && (
                <>
                  <NavLink to="/lost-items" className={getNavLinkClassName}>My Lost Items</NavLink>
                  <NavLink to="/found-items" className={getNavLinkClassName}>My Found Items</NavLink>
                </>
              )}

              {(user.role === 'student' || user.role === 'staff') && (
                <>
                  <NavLink to="/my-claims" className={getNavLinkClassName}>My Claims</NavLink>
                </>
              )}

              {user.role === 'security' && (
                <>
                  <NavLink to="/security/receive" className={getNavLinkClassName}>Receive Item</NavLink>
                  <NavLink to="/security/pending-claims" className={getNavLinkClassName}>Pending Claims</NavLink>
                  <NavLink to="/security/transactions" className={getNavLinkClassName}>Transactions</NavLink>
                </>
              )}

              {user.role === 'admin' && (
                <>
                  <NavLink to="/admin-panel" className={getNavLinkClassName}>Admin Panel</NavLink>
                  <NavLink to="/admin/users" className={getNavLinkClassName}>Users</NavLink>
                  <NavLink to="/admin/pending-approvals" className={getNavLinkClassName}>Pending Approvals</NavLink>
                  <NavLink to="/admin/appeals" className={getNavLinkClassName}>Appeals</NavLink>
                  <NavLink to="/admin/items" className={getNavLinkClassName}>Items</NavLink>
                  <NavLink to="/admin/reports" className={getNavLinkClassName}>Reports</NavLink>
                </>
              )}

              <NavLink
                to="/notifications"
                className={({ isActive }) => (isActive ? 'nav-link notification-icon-btn notification-icon-active' : 'nav-link notification-icon-btn')}
                aria-label="Notifications"
                data-tooltip="Notifications"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 3a6 6 0 0 0-6 6v3.6l-1.6 2.6a1 1 0 0 0 .85 1.53h13.5a1 1 0 0 0 .85-1.53L18 12.6V9a6 6 0 0 0-6-6zm0 18a3 3 0 0 0 2.82-2H9.18A3 3 0 0 0 12 21z" />
                </svg>
                {unreadCount > 0 && <span className="notification-icon-badge">{unreadCount}</span>}
              </NavLink>

              <div className="ellipsis-menu" ref={moreMenuRef}>
                <button
                  type="button"
                  className="nav-link ellipsis-btn"
                  aria-haspopup="menu"
                  aria-expanded={isMoreMenuOpen}
                  aria-label="Open account menu"
                  onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                >
                  <span className="hamburger-icon" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </button>

                {isMoreMenuOpen && (
                  <div className="ellipsis-dropdown" role="menu" aria-label="Account options">
                    <Link to="/profile" className="ellipsis-item" role="menuitem" onClick={closeMoreMenu}>
                      Profile
                    </Link>
                    <Link to="/settings" className="ellipsis-item" role="menuitem" onClick={closeMoreMenu}>
                      Settings
                    </Link>
                    <button type="button" className="ellipsis-item ellipsis-item-danger" role="menuitem" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
