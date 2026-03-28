import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import MobileWarning from '../../components/MobileWarning';
import SampleItemImage from '../../components/SampleItemImage';
import { normalizeCategory } from '../../utils/categoryUtils';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_ORIGIN = (configuredApiUrl?.includes('localhost:5000')
  ? configuredApiUrl.replace('localhost:5000', 'localhost:8080')
  : configuredApiUrl || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

const STATUS_PAGE_CONFIG = {
  found: {
    apiStatus: 'found',
    title: 'Found',
    backPath: '/admin-panel',
    dateHeader: 'Date and time found'
  },
  receive: {
    apiStatus: 'received',
    title: 'Receive',
    backPath: '/admin-panel',
    dateHeader: 'Date and time received'
  },
  release: {
    apiStatus: 'released',
    title: 'Release',
    backPath: '/admin-panel',
    dateHeader: 'Date and time released'
  }
};

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
  if (!rawImage) return '';

  const normalized = String(rawImage).trim().replace(/\\/g, '/');
  if (!normalized || normalized === 'null' || normalized === 'undefined') {
    return '';
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized.includes('localhost:5000')
      ? normalized.replace('localhost:5000', 'localhost:8080')
      : normalized;
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

const normalizeItem = (item, status) => {
  const dateTime = status === 'released'
    ? readFirst(item, ['released_at', 'releasedAt', 'date_released', 'dateReleased'])
    : status === 'received'
      ? readFirst(item, ['received_at', 'receivedAt', 'date_received', 'dateReceived'])
      : readFirst(item, ['date_found', 'dateFound', 'date_time_found', 'dateTimeFound', 'created_at', 'createdAt']);

  return {
    id: item.id,
    security: readFirst(item, ['security_username', 'securityUsername', 'received_by_username', 'released_by_username', 'processed_by_username'], 'Unknown'),
    founder: readFirst(item, ['founder_username', 'founderUsername', 'found_by_username', 'posted_by_username', 'username'], 'Unknown'),
    receiver: readFirst(item, ['receiver_username', 'receiverUsername', 'claimer_username', 'owner_username', 'claimed_by_username'], 'Unknown'),
    itemName: readFirst(item, ['name', 'item_name', 'itemName'], 'Unnamed Item'),
    itemImage: toImageUrl(readFirst(item, ['image', 'image_url', 'imageUrl'])),
    category: normalizeCategory(readFirst(item, ['category'], 'Other'), readFirst(item, ['name', 'item_name', 'itemName'], '')),
    description: readFirst(item, ['description'], ''),
    dateTime,
    timestamp: toTimestamp(dateTime)
  };
};

const AdminItemsByStatus = () => {
  const { section = 'found' } = useParams();
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [brokenImages, setBrokenImages] = useState({});

  const config = STATUS_PAGE_CONFIG[section] || STATUS_PAGE_CONFIG.found;

  useEffect(() => {
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;
    setIsMobile(mobile);
  }, []);

  useEffect(() => {
    loadItems();
  }, [config.apiStatus]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getItems({
        page: 0,
        size: 300,
        status: config.apiStatus,
        sort: 'created_at,desc'
      });

      const rawItems = response.data.items || response.data.content || [];

      // Keep this page status-specific by filtering again client-side for API compatibility.
      const filteredItems = rawItems
        .filter((item) => {
          const status = String(item.status || '').toLowerCase();
          return status === config.apiStatus;
        })
        .map((item) => normalizeItem(item, config.apiStatus))
        .sort((a, b) => b.timestamp - a.timestamp);

      setItems(filteredItems);
    } catch (error) {
      console.error(`Error loading ${config.title.toLowerCase()} items:`, error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const headers = useMemo(() => {
    if (config.apiStatus === 'found') {
      return ['Founder username', 'Item name', 'Item picture', config.dateHeader];
    }
    if (config.apiStatus === 'received') {
      return ['Security username', 'Founder student username', 'Item name', 'Item picture', config.dateHeader];
    }
    return ['Security username', 'Receiver student username', 'Item name', 'Item picture', config.dateHeader];
  }, [config.apiStatus, config.dateHeader]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (isMobile) {
    return <MobileWarning userRole="admin" />;
  }

  return (
    <div className="container">
      <div className="section-header" style={{ borderBottom: 'none', marginBottom: '1rem' }}>
        <h1>{config.title} Items</h1>
        <Link to={config.backPath} className="link-more">Back to Dashboard</Link>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={headers.length}>No {config.title.toLowerCase()} items available.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  {config.apiStatus !== 'found' && <td>{item.security}</td>}
                  <td>{config.apiStatus === 'released' ? item.receiver : item.founder}</td>
                  <td>{item.itemName}</td>
                  <td>
                    {item.itemImage && !brokenImages[item.id] ? (
                      <img
                        src={item.itemImage}
                        alt={item.itemName}
                        onError={() => setBrokenImages((prev) => ({ ...prev, [item.id]: true }))}
                        style={{ width: '88px', height: '56px', objectFit: 'cover', borderRadius: '6px' }}
                      />
                    ) : (
                      <div style={{ width: '88px', height: '56px', overflow: 'hidden', borderRadius: '6px' }}>
                        <SampleItemImage
                          category={item.category}
                          item={{
                            name: item.itemName,
                            item_name: item.itemName,
                            description: item.description
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
  );
};

export default AdminItemsByStatus;
