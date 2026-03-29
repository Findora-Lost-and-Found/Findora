import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { itemsAPI, claimsAPI } from '../services/api';
import PostModal from '../components/PostModal';
import FoundItemCard from '../components/FoundItemCard';
import { normalizeCategory } from '../utils/categoryUtils';
import { FOUND_ITEM_SORT, sortFoundItems } from '../utils/itemDisplayUtils';

const DEFAULT_POST_ROLES = ['student', 'staff', 'security'];
const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_ORIGIN = (configuredApiUrl?.includes('localhost:5000')
  ? configuredApiUrl.replace('localhost:5000', 'localhost:8080')
  : configuredApiUrl || 'http://localhost:8080/api').replace(/\/api\/?$/, '');
const STUDENT_DASHBOARD_IMAGE_FALLBACK = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22 viewBox=%220 0 300 200%22%3E%3Crect width=%22300%22 height=%22200%22 fill=%22%23E5E7EB%22/%3E%3Ctext x=%22150%22 y=%22106%22 text-anchor=%22middle%22 fill=%22%236B7280%22 font-size=%2216%22 font-family=%22Arial%22%3EItem image%3C/text%3E%3C/svg%3E';

const readFirst = (obj, keys, fallback = '') => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return fallback;
};

const toImageUrl = (rawImage) => {
  if (!rawImage) {
    return STUDENT_DASHBOARD_IMAGE_FALLBACK;
  }

  const normalized = String(rawImage).trim().replace(/\\/g, '/');

  if (!normalized || normalized === 'null' || normalized === 'undefined') {
    return STUDENT_DASHBOARD_IMAGE_FALLBACK;
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  const looksLikePath = normalized.includes('/') || normalized.includes('.') || normalized.startsWith('uploads');
  if (!looksLikePath) {
    return STUDENT_DASHBOARD_IMAGE_FALLBACK;
  }

  const normalizedPath = normalized.replace(/\/+/g, '/').replace(/^\/+/, '');
  return `${API_ORIGIN}/${normalizedPath}`;
};

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
        itemsAPI.getMy({ type: 'found', page: 0, size: 6, sort: 'createdAt,desc' })
      ]);

      setStats({
        myItems: itemsRes.status === 'fulfilled' ? itemsRes.value.data.count : 0,
        myClaims: claimsRes.status === 'fulfilled' ? claimsRes.value.data.count : 0
      });

      if (foundRes.status === 'fulfilled') {
        const apiItems = (foundRes.value.data.items || foundRes.value.data.content || []).map((item) => ({
          ...item,
          name: item.name || item.item_name,
          date_found: item.date_found || item.date || item.created_at,
          image: toImageUrl(readFirst(item, ['image_url', 'imageUrl', 'image'])),
          category: normalizeCategory(item.category, item.name || item.item_name),
          posted_by: item.posted_by || {
            id: item.userId || item.user_id,
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