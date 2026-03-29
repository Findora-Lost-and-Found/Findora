import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { itemsAPI, claimsAPI, securityAPI, adminAPI } from '../services/api';
import { toast } from 'react-toastify';
import PostModal from '../components/PostModal';
import FoundItemCard from '../components/FoundItemCard';
import SecurityDashboard from './SecurityDashboard';
import { normalizeCategory } from '../utils/categoryUtils';
import { FOUND_ITEM_SORT, getModeratedItemTitle, isModerationRemovedItem, sortFoundItems } from '../utils/itemDisplayUtils';
import { sampleFoundItems } from '../data/sampleFoundItems';
import SampleItemImage from '../components/SampleItemImage';

const ADMIN_PREVIEW_LIMIT = 5;
const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_ORIGIN = (configuredApiUrl?.includes('localhost:5000')
  ? configuredApiUrl.replace('localhost:5000', 'localhost:8080')
  : configuredApiUrl || 'http://localhost:8080/api').replace(/\/api\/?$/, '');
const DASHBOARD_IMAGE_FALLBACK = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2280%22 viewBox=%220 0 120 80%22%3E%3Crect width=%22120%22 height=%2280%22 fill=%22%23E5E7EB%22/%3E%3Ctext x=%2260%22 y=%2244%22 text-anchor=%22middle%22 fill=%22%236B7280%22 font-size=%2212%22 font-family=%22Arial%22%3ENo image%3C/text%3E%3C/svg%3E';

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
  if (!rawImage) return DASHBOARD_IMAGE_FALLBACK;
  const normalized = String(rawImage).trim().replace(/\\/g, '/');
  if (!normalized || normalized === 'null' || normalized === 'undefined') {
    return DASHBOARD_IMAGE_FALLBACK;
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  // Guard against accidentally treating plain labels as file paths.
  const looksLikePath = normalized.includes('/') || normalized.includes('.') || normalized.startsWith('uploads');
  if (!looksLikePath) {
    return DASHBOARD_IMAGE_FALLBACK;
  }

  const normalizedPath = normalized.replace(/\/+/g, '/').replace(/^\/+/, '');
  return `${API_ORIGIN}/${normalizedPath}`;
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
  const rawItemName = readFirst(item, ['name', 'item_name', 'itemName'], 'Unnamed Item');
  const moderatedItemName = getModeratedItemTitle(rawItemName);
  const dateTime = section === 'released'
    ? readFirst(item, ['released_at', 'releasedAt', 'date_released', 'dateReleased', 'created_at', 'createdAt'])
    : section === 'received'
      ? readFirst(item, ['received_at', 'receivedAt', 'date_received', 'dateReceived', 'created_at', 'createdAt'])
      : readFirst(item, ['date_found', 'dateFound', 'date_time_found', 'dateTimeFound', 'created_at', 'createdAt']);

  return {
    id: item.id,
    itemName: moderatedItemName,
    category: normalizeCategory(readFirst(item, ['category']), moderatedItemName),
    itemImage: toImageUrl(readFirst(item, ['image_url', 'imageUrl', 'image'])),
    founder: readFirst(item, ['founder_username', 'founderUsername', 'found_by_username', 'posted_by_username', 'username'], 'Unknown'),
    security: readFirst(item, ['security_username', 'securityUsername', 'received_by_username', 'released_by_username'], 'Unknown'),
    receiver: readFirst(item, ['receiver_username', 'receiverUsername', 'claimer_username', 'owner_username'], 'Unknown'),
    dateTime,
    timestamp: toTimestamp(dateTime),
    rawItem: item
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
  const [handoverLoadingById, setHandoverLoadingById] = useState({});

  useEffect(() => {
    if (user) {
      if (user.role === 'security') {
        setLoading(false);
        return;
      }

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
          itemsAPI.getAll({ type: 'found' })
        ]);

        setStats({
          myItems: itemsRes.status === 'fulfilled' ? itemsRes.value.data.count : 0,
          myClaims: claimsRes.status === 'fulfilled' ? claimsRes.value.data.count : 0
        });

        if (foundRes.status === 'fulfilled') {
          console.log('Dashboard found items fetched:', foundRes.value.data.items || foundRes.value.data.content || []);
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
          const visibleItems = apiItems.filter((item) => !isModerationRemovedItem(item));
          const sortedFoundItems = sortFoundItems(visibleItems, FOUND_ITEM_SORT.LATEST);
          setFoundItems(sortedFoundItems.length > 0 ? sortedFoundItems.slice(0, 6) : sampleFoundItems);
        } else {
          console.error('Dashboard found items fetch failed:', foundRes.reason?.response?.data || foundRes.reason?.message);
          setFoundItems(sampleFoundItems);
        }
      } else if (user.role === 'admin' || user.role === 'super_admin') {
        const [foundRes, receivedRes, releasedRes, studentFoundRes] = await Promise.allSettled([
          adminAPI.getItems({ status: 'found', page: 0, size: ADMIN_PREVIEW_LIMIT, sort: 'createdAt,desc' }),
          adminAPI.getItems({ status: 'received', page: 0, size: ADMIN_PREVIEW_LIMIT, sort: 'createdAt,desc' }),
          adminAPI.getItems({ status: 'released', page: 0, size: ADMIN_PREVIEW_LIMIT, sort: 'createdAt,desc' }),
          itemsAPI.getAll({ type: 'found', status: 'active', page: 0, size: 300, sort: 'createdAt,desc' })
        ]);

        const extractItems = (result) => {
          if (result.status !== 'fulfilled') return [];
          return result.value.data.items || result.value.data.content || [];
        };

        const studentFoundImageById = new Map(
          extractItems(studentFoundRes).map((item) => [
            Number(item.id),
            readFirst(item, ['image_url', 'imageUrl', 'image'])
          ])
        );

        const mergeStudentImage = (item) => {
          const id = Number(item?.id);
          const studentRawImage = studentFoundImageById.get(id);
          return studentRawImage
            ? { ...item, image_url: studentRawImage, imageUrl: studentRawImage }
            : item;
        };

        // Found/Receive/Release sections are sourced from backend statuses: active/claimed/closed.
        setAdminSections({
          found: extractItems(foundRes)
            .map(mergeStudentImage)
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

  const handleHandoverRequest = async (itemId) => {
    try {
      setHandoverLoadingById((prev) => ({ ...prev, [itemId]: true }));
      await securityAPI.handoverRequest(itemId);
      setFoundItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: 'handover_requested' } : item
        )
      );
      toast.success('Handover request submitted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit handover request');
    } finally {
      setHandoverLoadingById((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (user?.role === 'security') {
    return <SecurityDashboard />;
  }

  return (
    <div className="container">
      <div className="dashboard">
        <div className="dashboard-top">
          <div>
            <h1>Welcome, {user?.full_name}!</h1>
          </div>
          {(user?.role === 'student' || user?.role === 'staff') && (
            <button 
              onClick={() => setIsPostModalOpen(true)} 
              className="btn-primary btn-posts"
            >
              + Posts
            </button>
          )}
        </div>

        {!user?.is_verified && (
          <div className="alert alert-warning">
            Your email is not verified. <Link to="/verify-email">Verify now</Link>
          </div>
        )}

        {(user?.role === 'security' || user?.role === 'admin' || user?.role === 'super_admin') && !user?.is_approved && (
          <div className="alert alert-info">
            Your account is pending admin approval.
          </div>
        )}

        {/* Found Items Feed Section */}
        {(user?.role === 'student' || user?.role === 'staff') && (
          <div className="found-items-section">
            <div className="section-header">
              <h2>Recently Found Items</h2>
              <Link to="/found-items" className="link-more">View All -&gt;</Link>
            </div>
            <div className="found-items-grid">
              {foundItems.length === 0 ? (
                <p>No found items available right now.</p>
              ) : (
                foundItems.map((item) => (
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
                    onHandover={handleHandoverRequest}
                    handoverInProgress={!!handoverLoadingById[item.id]}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <>
            <div className="section" style={{ marginTop: '2rem' }}>
              <div className="section-header" style={{ borderBottom: 'none', marginBottom: '0.25rem' }}>
                <h2>Found</h2>
                <Link to="/admin/items/found" className="link-more">View All -&gt;</Link>
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
                            {item.itemImage && item.itemImage !== DASHBOARD_IMAGE_FALLBACK ? (
                              <img
                                src={item.itemImage}
                                alt={item.itemName}
                                style={{ width: '88px', height: '56px', objectFit: 'cover', borderRadius: '6px' }}
                                onError={(event) => {
                                  event.currentTarget.src = DASHBOARD_IMAGE_FALLBACK;
                                }}
                              />
                            ) : (
                              <div style={{ width: '88px', height: '56px', borderRadius: '6px', overflow: 'hidden' }}>
                                <SampleItemImage
                                  category={item.category}
                                  item={{
                                    ...item.rawItem,
                                    item_name: item.itemName,
                                    name: item.itemName,
                                    category: item.category
                                  }}
                                />
                              </div>
                            )}
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
                <Link to="/admin/items/receive" className="link-more">View All -&gt;</Link>
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
                            {item.itemImage && item.itemImage !== DASHBOARD_IMAGE_FALLBACK ? (
                              <img
                                src={item.itemImage}
                                alt={item.itemName}
                                style={{ width: '88px', height: '56px', objectFit: 'cover', borderRadius: '6px' }}
                                onError={(event) => {
                                  event.currentTarget.src = DASHBOARD_IMAGE_FALLBACK;
                                }}
                              />
                            ) : (
                              <div style={{ width: '88px', height: '56px', borderRadius: '6px', overflow: 'hidden' }}>
                                <SampleItemImage
                                  category={item.category}
                                  item={{
                                    ...item.rawItem,
                                    item_name: item.itemName,
                                    name: item.itemName,
                                    category: item.category
                                  }}
                                />
                              </div>
                            )}
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
                <Link to="/admin/items/release" className="link-more">View All -&gt;</Link>
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
                            {item.itemImage && item.itemImage !== DASHBOARD_IMAGE_FALLBACK ? (
                              <img
                                src={item.itemImage}
                                alt={item.itemName}
                                style={{ width: '88px', height: '56px', objectFit: 'cover', borderRadius: '6px' }}
                                onError={(event) => {
                                  event.currentTarget.src = DASHBOARD_IMAGE_FALLBACK;
                                }}
                              />
                            ) : (
                              <div style={{ width: '88px', height: '56px', borderRadius: '6px', overflow: 'hidden' }}>
                                <SampleItemImage
                                  category={item.category}
                                  item={{
                                    ...item.rawItem,
                                    item_name: item.itemName,
                                    name: item.itemName,
                                    category: item.category
                                  }}
                                />
                              </div>
                            )}
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
