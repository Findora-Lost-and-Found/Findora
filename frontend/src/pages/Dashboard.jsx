import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { getHomeRouteForUser } from '../utils/navigation';
import StudentDashboard from './StudentDashboard';

const ADMIN_PREVIEW_LIMIT = 5;
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

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
  if (!rawImage) return 'https://via.placeholder.com/120x80?text=No+Image';
  if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
    return rawImage;
  }
  return `${API_ORIGIN}${rawImage.startsWith('/') ? rawImage : `/${rawImage}`}`;
};

const toTimestamp = (value) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const normalizeAdminDashboardItem = (item, section) => {
  const dateTime = section === 'released'
    ? readFirst(item, ['released_at', 'releasedAt', 'date_released', 'dateReleased', 'created_at', 'createdAt'])
    : section === 'received'
      ? readFirst(item, ['received_at', 'receivedAt', 'date_received', 'dateReceived', 'created_at', 'createdAt'])
      : readFirst(item, ['date_found', 'dateFound', 'date_time_found', 'dateTimeFound', 'created_at', 'createdAt']);

  return {
    id: item.id,
    itemName: readFirst(item, ['name', 'item_name', 'itemName'], 'Unnamed Item'),
    itemImage: toImageUrl(readFirst(item, ['image', 'image_url', 'imageUrl'])),
    founder: readFirst(item, ['founder_username', 'founderUsername', 'found_by_username', 'posted_by_username', 'username'], 'Unknown'),
    security: readFirst(item, ['security_username', 'securityUsername', 'received_by_username', 'released_by_username'], 'Unknown'),
    receiver: readFirst(item, ['receiver_username', 'receiverUsername', 'claimer_username', 'owner_username'], 'Unknown'),
    dateTime,
    timestamp: toTimestamp(dateTime)
  };
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ myItems: 0, myClaims: 0 });
  const [loading, setLoading] = useState(true);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [foundItems, setFoundItems] = useState([]);
  const [adminSections, setAdminSections] = useState({ found: [], received: [], released: [] });

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
      } else if (user.role === 'admin') {
        const [foundRes, receivedRes, releasedRes] = await Promise.allSettled([
          itemsAPI.getAll({ type: 'found', status: 'active', page: 0, size: ADMIN_PREVIEW_LIMIT, sort: 'createdAt,desc' }),
          itemsAPI.getAll({ type: 'found', status: 'claimed', page: 0, size: ADMIN_PREVIEW_LIMIT, sort: 'createdAt,desc' }),
          itemsAPI.getAll({ type: 'found', status: 'closed', page: 0, size: ADMIN_PREVIEW_LIMIT, sort: 'createdAt,desc' })
        ]);

        const extractItems = (result) => {
          if (result.status !== 'fulfilled') return [];
          return result.value.data.items || result.value.data.content || [];
        };

        // Found/Receive/Release sections are sourced from backend statuses: active/claimed/closed.
        setAdminSections({
          found: extractItems(foundRes)
            .map((item) => normalizeAdminDashboardItem(item, 'found'))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, ADMIN_PREVIEW_LIMIT),
          received: extractItems(receivedRes)
            .map((item) => normalizeAdminDashboardItem(item, 'received'))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, ADMIN_PREVIEW_LIMIT),
          released: extractItems(releasedRes)
            .map((item) => normalizeAdminDashboardItem(item, 'released'))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, ADMIN_PREVIEW_LIMIT)
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setFoundItems([]);
      setAdminSections({ found: [], received: [], released: [] });
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

<<<<<<< HEAD
        {(user?.role === 'student' || user?.role === 'staff') && foundItems.length === 0 && (
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-icon">📭</div>
            <h3 className="dashboard-empty-title">No found items yet</h3>
            <p>When someone reports a found item, it will appear here.</p>
            <Link to="/report-found" className="dashboard-empty-link">Be the first to report a found item →</Link>
          </div>
=======
        {user?.role === 'admin' && (
          <>
            <div className="section" style={{ marginTop: '2rem' }}>
              <div className="section-header" style={{ borderBottom: 'none', marginBottom: '0.25rem' }}>
                <h2>Found</h2>
                <Link to="/admin/items/found" className="link-more">View All →</Link>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Founder username</th>
                      <th>Item name</th>
                      <th>Item picture</th>
                      <th>Date and time found</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminSections.found.length === 0 ? (
                      <tr>
                        <td colSpan={4}>No found items available.</td>
                      </tr>
                    ) : (
                      adminSections.found.map((item) => (
                        <tr key={`dashboard-found-${item.id}`}>
                          <td>{item.founder}</td>
                          <td>{item.itemName}</td>
                          <td>
                            <img src={item.itemImage} alt={item.itemName} style={{ width: '88px', height: '56px', objectFit: 'cover', borderRadius: '6px' }} />
                          </td>
                          <td>{formatDateTime(item.dateTime)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="section" style={{ marginTop: '2rem' }}>
              <div className="section-header" style={{ borderBottom: 'none', marginBottom: '0.25rem' }}>
                <h2>Receive</h2>
                <Link to="/admin/items/receive" className="link-more">View All →</Link>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Security username</th>
                      <th>Founder student username</th>
                      <th>Item name</th>
                      <th>Item picture</th>
                      <th>Date and time received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminSections.received.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No receive items available.</td>
                      </tr>
                    ) : (
                      adminSections.received.map((item) => (
                        <tr key={`dashboard-received-${item.id}`}>
                          <td>{item.security}</td>
                          <td>{item.founder}</td>
                          <td>{item.itemName}</td>
                          <td>
                            <img src={item.itemImage} alt={item.itemName} style={{ width: '88px', height: '56px', objectFit: 'cover', borderRadius: '6px' }} />
                          </td>
                          <td>{formatDateTime(item.dateTime)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="section" style={{ marginTop: '2rem' }}>
              <div className="section-header" style={{ borderBottom: 'none', marginBottom: '0.25rem' }}>
                <h2>Release</h2>
                <Link to="/admin/items/release" className="link-more">View All →</Link>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Security username</th>
                      <th>Receiver student username</th>
                      <th>Item name</th>
                      <th>Item picture</th>
                      <th>Date and time released</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminSections.released.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No release items available.</td>
                      </tr>
                    ) : (
                      adminSections.released.map((item) => (
                        <tr key={`dashboard-released-${item.id}`}>
                          <td>{item.security}</td>
                          <td>{item.receiver}</td>
                          <td>{item.itemName}</td>
                          <td>
                            <img src={item.itemImage} alt={item.itemName} style={{ width: '88px', height: '56px', objectFit: 'cover', borderRadius: '6px' }} />
                          </td>
                          <td>{formatDateTime(item.dateTime)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
>>>>>>> origin/develop
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
