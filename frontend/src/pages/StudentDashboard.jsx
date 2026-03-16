import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { itemsAPI, claimsAPI } from '../services/api';
import PostModal from '../components/PostModal';
import FoundItemCard from '../components/FoundItemCard';
import { normalizeCategory } from '../utils/categoryUtils';
import { FOUND_ITEM_SORT, sortFoundItems } from '../utils/itemDisplayUtils';

const DEFAULT_POST_ROLES = ['student', 'staff', 'security'];

const StudentDashboard = ({ extraPanel = null, postRoles = DEFAULT_POST_ROLES }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ myItems: 0, myClaims: 0 });
  const [loading, setLoading] = useState(true);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [foundItems, setFoundItems] = useState([]);

  const canUseItemDashboard = !!user && postRoles.includes(user.role);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!canUseItemDashboard) {
      setLoading(false);
      setFoundItems([]);
      return;
    }

    loadDashboardData();
  }, [user, canUseItemDashboard]);

  const loadDashboardData = async () => {
    try {
      const [itemsRes, claimsRes, foundRes] = await Promise.allSettled([
        itemsAPI.getMy(),
        claimsAPI.getMy(),
        // Reuse the same found-items feed for any role that shares the dashboard UI.
        itemsAPI.getAll({ type: 'found' })
      ]);

      setStats({
        myItems: itemsRes.status === 'fulfilled' ? itemsRes.value.data.count : 0,
        myClaims: claimsRes.status === 'fulfilled' ? claimsRes.value.data.count : 0
      });

      if (foundRes.status === 'fulfilled') {
        const apiItems = (foundRes.value.data.items || []).map((item) => ({
          ...item,
          name: item.name || item.item_name,
          date_found: item.date_found || item.date || item.created_at,
          image: item.image || (item.image_url ? `http://localhost:8080${item.image_url}` : 'https://via.placeholder.com/300x200?text=Item+Image'),
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
          {canUseItemDashboard && (
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

        {/* Inject role-specific controls without duplicating the shared dashboard layout. */}
        {extraPanel}

        {canUseItemDashboard && foundItems.length > 0 && (
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
      </div>

      <PostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
      />
    </div>
  );
};

export default StudentDashboard;