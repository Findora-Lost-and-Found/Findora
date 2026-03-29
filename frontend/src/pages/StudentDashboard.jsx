import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { itemsAPI, claimsAPI } from '../services/api';
import PostModal from '../components/PostModal';
import FoundItemCard from '../components/FoundItemCard';
import { normalizeCategory } from '../utils/categoryUtils';
import { FOUND_ITEM_SORT, sortFoundItems } from '../utils/itemDisplayUtils';

const DEFAULT_POST_ROLES = ['student', 'staff', 'security'];
const INITIAL_FOUND_VISIBLE = 6;
const FOUND_LOAD_STEP = 3;
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
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    sortBy: FOUND_ITEM_SORT.LATEST
  });
  const [searchInput, setSearchInput] = useState('');
  const [visibleFoundCount, setVisibleFoundCount] = useState(INITIAL_FOUND_VISIBLE);

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
        itemsAPI.getMy({ type: 'found', page: 0, size: 100, sort: 'createdAt,desc' })
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
        setFoundItems(sortedFoundItems);
        setVisibleFoundCount(INITIAL_FOUND_VISIBLE);
      } else {
        console.error('Dashboard found items fetch failed:', foundRes.reason?.response?.data || foundRes.reason?.message);
        setFoundItems([]);
        setVisibleFoundCount(INITIAL_FOUND_VISIBLE);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setFoundItems([]);
      setVisibleFoundCount(INITIAL_FOUND_VISIBLE);
    } finally {
      setLoading(false);
    }
  };

  const filteredFoundItems = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    const filtered = foundItems.filter((item) => {
      const category = normalizeCategory(item.category, item.name || item.item_name);
      const categoryMatches = !filters.category || category === filters.category;

      if (!searchTerm) {
        return categoryMatches;
      }

      const haystack = [item.name, item.description, item.location]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');

      return categoryMatches && haystack.includes(searchTerm);
    });

    return sortFoundItems(filtered, filters.sortBy);
  }, [foundItems, filters.category, filters.search, filters.sortBy]);

  const visibleFoundItems = filteredFoundItems.slice(0, visibleFoundCount);
  const hasMoreFoundItems = visibleFoundCount < filteredFoundItems.length;
  const canToggleFoundItems = filteredFoundItems.length > INITIAL_FOUND_VISIBLE;

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setVisibleFoundCount(INITIAL_FOUND_VISIBLE);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput.trim() }));
    setVisibleFoundCount(INITIAL_FOUND_VISIBLE);
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

        {canUseItemDashboard && (
          <div className="found-items-section">
            <div className="section-header">
              <h2>Recently Found Items</h2>
            </div>
            <div className="filters">
              <select name="category" value={filters.category} onChange={handleFilterChange}>
                <option value="">All Categories</option>
                <option value="NIC">NIC</option>
                <option value="Student ID">Student ID</option>
                <option value="Bank Card">Bank Card</option>
                <option value="Wallet">Wallet</option>
                <option value="Other">Other</option>
              </select>

              <form className="search-form" onSubmit={handleSearchSubmit}>
                <input
                  type="text"
                  name="search"
                  placeholder="Search items..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button type="submit" className="search-icon-btn" aria-label="Search dashboard found items">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                    <path d="M10.5 3a7.5 7.5 0 0 1 5.93 12.1l4.24 4.23a1 1 0 1 1-1.41 1.42l-4.24-4.24A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11z" fill="currentColor"/>
                  </svg>
                </button>
              </form>

              <select name="sortBy" value={filters.sortBy} onChange={handleFilterChange}>
                <option value={FOUND_ITEM_SORT.LATEST}>Latest</option>
                <option value={FOUND_ITEM_SORT.NAME_ASC}>Alphabetical A → Z</option>
                <option value={FOUND_ITEM_SORT.NAME_DESC}>Alphabetical Z → A</option>
              </select>
            </div>
            <div className="found-items-grid">
              {filteredFoundItems.length === 0 ? (
                <p>No found items available right now.</p>
              ) : (
                visibleFoundItems.map((item) => (
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
                ))
              )}
            </div>
            {canToggleFoundItems && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="link-more"
                  onClick={() => {
                    if (hasMoreFoundItems) {
                      setVisibleFoundCount((prev) => Math.min(prev + FOUND_LOAD_STEP, foundItems.length));
                    } else {
                      setVisibleFoundCount(INITIAL_FOUND_VISIBLE);
                    }
                  }}
                  style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, cursor: 'pointer' }}
                >
                  {hasMoreFoundItems ? 'Show more ▼' : 'Show less ▲'}
                </button>
              </div>
            )}
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
