import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { itemsAPI, claimsAPI } from '../services/api';
import PostModal from '../components/PostModal';
import FoundItemCard from '../components/FoundItemCard';
import { normalizeCategory } from '../utils/categoryUtils';
import { FOUND_ITEM_SORT, sortFoundItems } from '../utils/itemDisplayUtils';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ myItems: 0, myClaims: 0 });
  const [loading, setLoading] = useState(true);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [foundItems, setFoundItems] = useState([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      if (user.role === 'student' || user.role === 'staff') {
        const [itemsRes, claimsRes, foundRes] = await Promise.allSettled([
          itemsAPI.getMy(),
          claimsAPI.getMy(),
          // Dashboard keeps a latest preview, while Found Items page shows complete list.
          itemsAPI.getAll({ type: 'found', status: 'active' })
        ]);

        setStats({
          myItems: itemsRes.status === 'fulfilled' ? itemsRes.value.data.count : 0,
          myClaims: claimsRes.status === 'fulfilled' ? claimsRes.value.data.count : 0
        });

        if (foundRes.status === 'fulfilled') {
          console.log('Dashboard found items fetched:', foundRes.value.data.items || []);
          const apiItems = (foundRes.value.data.items || []).map((item) => ({
            ...item,
            name: item.name || item.item_name,
            date_found: item.date_found || item.date || item.created_at,
            image: item.image || (item.image_url ? `http://localhost:5000${item.image_url}` : 'https://via.placeholder.com/300x200?text=Item+Image'),
            category: normalizeCategory(item.category, item.name || item.item_name),
            posted_by: item.posted_by || {
              id: item.user_id,
              full_name: item.full_name || item.username || 'Unknown User'
            }
          }));
          const sortedFoundItems = sortFoundItems(apiItems, FOUND_ITEM_SORT.LATEST);
          setFoundItems(sortedFoundItems.slice(0, 6));
        } else {
          console.error('Dashboard found items fetch failed:', foundRes.reason?.response?.data || foundRes.reason?.message);
          setFoundItems([]);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setFoundItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <div className="dashboard">
        <div className="dashboard-top">
          <div>
            <h1>Welcome, {user?.full_name}!</h1>
            <p className="role-badge">Role: {user?.role}</p>
          </div>
          {(user?.role === 'student' || user?.role === 'staff') && (
            <button 
              onClick={() => setIsPostModalOpen(true)} 
              className="btn-primary btn-posts"
            >
              ➕ Posts
            </button>
          )}
        </div>

        {!user?.is_verified && (
          <div className="alert alert-warning">
            Your email is not verified. <Link to="/verify-email">Verify now</Link>
          </div>
        )}

        {(user?.role === 'security' || user?.role === 'admin') && !user?.is_approved && (
          <div className="alert alert-info">
            Your account is pending admin approval.
          </div>
        )}

        {/* Stats Cards */}
        {(user?.role === 'student' || user?.role === 'staff') && (
          <div className="stats-grid dashboard-stats-grid">
            <div className="stat-card dashboard-stat-card">
              <div className="dashboard-stat-value dashboard-accent-green">{stats.myItems}</div>
              <div className="dashboard-stat-label">My Posted Items</div>
              <Link to="/lost-items" className="dashboard-stat-link dashboard-accent-green">View →</Link>
            </div>
            <div className="stat-card dashboard-stat-card">
              <div className="dashboard-stat-value dashboard-accent-blue">{stats.myClaims}</div>
              <div className="dashboard-stat-label">My Claims</div>
              <Link to="/my-claims" className="dashboard-stat-link dashboard-accent-blue">View →</Link>
            </div>
            <div className="stat-card dashboard-stat-card">
              <div className="dashboard-stat-value dashboard-accent-amber">{foundItems.length}</div>
              <div className="dashboard-stat-label">Found Items Available</div>
              <Link to="/found-items" className="dashboard-stat-link dashboard-accent-amber">Browse →</Link>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {(user?.role === 'student' || user?.role === 'staff') && (
          <div className="dashboard-actions-row">
            <Link to="/report-lost" className="dashboard-action-card dashboard-action-danger">
              🔍 Report Lost Item
            </Link>
            <Link to="/report-found" className="dashboard-action-card dashboard-action-success">
              📦 Report Found Item
            </Link>
            <Link to="/found-items" className="dashboard-action-card dashboard-action-info">
              🗂️ Browse Found Items
            </Link>
          </div>
        )}

        {/* Security quick links */}
        {user?.role === 'security' && (
          <div className="dashboard-actions-row">
            <Link to="/security/pending-claims" className="dashboard-action-card dashboard-action-warning">
              📋 Pending Claims
            </Link>
          </div>
        )}

        {/* Admin quick links */}
        {user?.role === 'admin' && (
          <div className="dashboard-actions-row">
            <Link to="/admin/dashboard" className="dashboard-action-card dashboard-action-violet">
              🛡️ Admin Dashboard
            </Link>
            <Link to="/admin/users" className="dashboard-action-card dashboard-action-success">
              👥 Manage Users
            </Link>
          </div>
        )}

        {/* Found Items Feed Section */}
        {(user?.role === 'student' || user?.role === 'staff') && foundItems.length > 0 && (
          <div className="found-items-section">
            <div className="section-header">
              <h2>Recently Found Items</h2>
              <Link to="/found-items" className="link-more">View All →</Link>
            </div>
            <div className="found-items-grid">
              {foundItems.map((item) => (
                <FoundItemCard
                  key={item.id}
                  item={item}
                  onClaim={() => {
                    claimsAPI.create(item.id).then(() => {
                      navigate('/my-claims');
                    }).catch((err) => {
                      console.error('Claim error:', err);
                    });
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {(user?.role === 'student' || user?.role === 'staff') && foundItems.length === 0 && (
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-icon">📭</div>
            <h3 className="dashboard-empty-title">No found items yet</h3>
            <p>When someone reports a found item, it will appear here.</p>
            <Link to="/report-found" className="dashboard-empty-link">Be the first to report a found item →</Link>
          </div>
        )}
      </div>

      {/* Post Modal */}
      <PostModal 
        isOpen={isPostModalOpen} 
        onClose={() => setIsPostModalOpen(false)} 
      />
    </div>
  );
};

export default Dashboard;
