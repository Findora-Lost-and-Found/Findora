import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { notificationsAPI } from '../services/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMoreMenuOpen(false);
  }, [location.pathname]);

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
    setIsMoreMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const getNavLinkClassName = ({ isActive }) => (
    isActive ? 'nav-link nav-link-active' : 'nav-link'
  );

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-header" aria-label="Application header">
          {user ? (
            <span className="nav-logo" aria-label="Findora home title">
              <img src="/findora-logo.png" alt="Findora logo" className="nav-logo-image" />
              <span>Findora</span>
            </span>
          ) : (
            <Link to="/" className="nav-logo" aria-label="Findora home title">
              <img src="/findora-logo.png" alt="Findora logo" className="nav-logo-image" />
              <span>Findora</span>
            </Link>
          )}

          {user && (
            <button
              type="button"
              className="nav-link mobile-nav-toggle"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={toggleMobileMenu}
            >
              <span className="hamburger-icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          )}
        </div>

        {user && (
          <div className={`nav-actions ${isMobileMenuOpen ? 'is-open' : ''}`} aria-label="Navigation actions" id="mobile-navigation">
            <div className="nav-menu">
              <NavLink to="/dashboard" className={getNavLinkClassName} onClick={closeMobileMenu}>Dashboard</NavLink>

              {(user.role === 'student' || user.role === 'staff' || user.role === 'security') && (
                <>
                  <NavLink to="/lost-items" className={getNavLinkClassName} onClick={closeMobileMenu}>My Lost Items</NavLink>
                  <NavLink to="/found-items" className={getNavLinkClassName} onClick={closeMobileMenu}>My Found Items</NavLink>
                </>
              )}

              {(user.role === 'student' || user.role === 'staff') && (
                <>
                  <NavLink to="/my-claims" className={getNavLinkClassName} onClick={closeMobileMenu}>My Claims</NavLink>
                </>
              )}

              {user.role === 'security' && (
                <>
                  <NavLink to="/security/receive" className={getNavLinkClassName} onClick={closeMobileMenu}>Receive Item</NavLink>
                  <NavLink to="/security/pending-claims" className={getNavLinkClassName} onClick={closeMobileMenu}>Pending Claims</NavLink>
                  <NavLink to="/security/transactions" className={getNavLinkClassName} onClick={closeMobileMenu}>Transactions</NavLink>
                </>
              )}

              {user.role === 'admin' && (
                <>
                  <Link to="/admin-panel" className="nav-link" onClick={closeMobileMenu}>Admin Panel</Link>
                  <Link to="/admin/users" className="nav-link" onClick={closeMobileMenu}>Users</Link>
                  <Link to="/admin/pending-approvals" className="nav-link" onClick={closeMobileMenu}>Pending Approvals</Link>
                  <Link to="/admin/appeals" className="nav-link" onClick={closeMobileMenu}>Appeals</Link>
                  <Link to="/admin/items" className="nav-link" onClick={closeMobileMenu}>Items</Link>
                  <Link to="/admin/reports" className="nav-link" onClick={closeMobileMenu}>Reports</Link>
                </>
              )}

              {user.role === 'super_admin' && (
                <>
                  <Link to="/admin-panel" className="nav-link" onClick={closeMobileMenu}>Super Admin Panel</Link>
                  <Link to="/admin/users" className="nav-link" onClick={closeMobileMenu}>Admins</Link>
                  <Link to="/admin/pending-approvals" className="nav-link" onClick={closeMobileMenu}>Pending Approvals</Link>
                  <Link to="/admin/appeals" className="nav-link" onClick={closeMobileMenu}>Appeals</Link>
                </>
              )}

              <NavLink
                to="/notifications"
                className={({ isActive }) => (isActive ? 'nav-link notification-icon-btn notification-icon-active' : 'nav-link notification-icon-btn')}
                aria-label="Notifications"
                data-tooltip="Notifications"
                onClick={closeMobileMenu}
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
                    <Link to="/profile" className="ellipsis-item" role="menuitem" onClick={() => { closeMoreMenu(); closeMobileMenu(); }}>
                      Profile
                    </Link>
                    <Link to="/settings" className="ellipsis-item" role="menuitem" onClick={() => { closeMoreMenu(); closeMobileMenu(); }}>
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
