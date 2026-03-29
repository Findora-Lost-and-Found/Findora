import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { securityAPI } from '../../services/api';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_ORIGIN = (configuredApiUrl?.includes('localhost:5000')
  ? configuredApiUrl.replace('localhost:5000', 'localhost:8080')
  : configuredApiUrl || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

const ThemePhotoPlaceholder = ({ modal = false }) => (
  <div className={`theme-photo-placeholder${modal ? ' is-modal' : ' is-thumb'}`} aria-label="No photo uploaded">
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="2.5" ry="2.5" />
      <circle cx="9" cy="9" r="1.8" />
      <path d="M5 18l4.8-4.8a1.3 1.3 0 0 1 1.84 0L13.8 15l1.55-1.55a1.3 1.3 0 0 1 1.84 0L19 15.26V18H5z" />
    </svg>
  </div>
);

const SecurityReceiveItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receivingItemId, setReceivingItemId] = useState(null);
  const [brokenImageByItemId, setBrokenImageByItemId] = useState({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewAlt, setPreviewAlt] = useState('Found item');

  const loadReceiveItems = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await securityAPI.getReceiveItems();
      setItems(response.data?.items || []);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load receive item requests';
      setError(message);
      setItems([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceiveItems();
  }, []);

  const getImageUrl = (item) => {
    const imagePath = item.imageUrl || item.image_url || item.image;
    if (imagePath) {
      const normalized = String(imagePath).trim().replace(/\\/g, '/');
      if (!normalized || normalized === 'null' || normalized === 'undefined') {
        return '';
      }

      if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        return normalized;
      }

      const normalizedPath = normalized.replace(/\/+/g, '/').replace(/^\/+/, '');
      return `${API_ORIGIN}/${normalizedPath}`;
    }
    return '';
  };

  const formatDate = (item) => {
    const dateValue = item.date || item.created_at || item.createdAt;
    if (!dateValue) {
      return 'N/A';
    }
    return new Date(dateValue).toLocaleDateString();
  };

  const handleConfirmReceive = async (itemId) => {
    try {
      setReceivingItemId(itemId);
      await securityAPI.confirmReceive(itemId);
      toast.success('Item received by Security. It appears in Pending Claims only when a claim exists for this item.');
      await loadReceiveItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm item receive');
    } finally {
      setReceivingItemId(null);
    }
  };

  const openImagePreview = (imageSrc, altText) => {
    setPreviewImage(imageSrc || '');
    setPreviewAlt(altText || 'Found item');
    setIsPreviewOpen(true);
  };

  const closeImagePreview = () => {
    setIsPreviewOpen(false);
    setPreviewImage('');
  };

  return (
    <div className="container">
      <h1>Receive Item</h1>

      <div className="found-items-section">
        <div className="section-header">
          <h2>Handover Requests</h2>
          <span>Total: {items.length}</span>
        </div>

        {loading ? (
          <p>Loading receive item requests...</p>
        ) : error ? (
          <div className="alert alert-warning">{error}</div>
        ) : items.length === 0 ? (
          <p>No handover requests available.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Photo</th>
                  <th>Finder</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const itemId = item.itemId || item.id;
                  const itemImageUrl = brokenImageByItemId[itemId] ? '' : getImageUrl(item);
                  return (
                    <tr key={itemId}>
                      <td>{item.itemName || item.name || item.item_name || 'Unnamed Item'}</td>
                      <td>
                        {itemImageUrl ? (
                          <button
                            type="button"
                            onClick={() => openImagePreview(itemImageUrl, item.itemName || item.name || item.item_name || 'Found item')}
                            aria-label="Preview found item image"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: 0,
                              cursor: 'zoom-in',
                              borderRadius: '6px'
                            }}
                          >
                            <img
                              src={itemImageUrl}
                              alt={item.itemName || item.name || item.item_name || 'Found item'}
                              style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px' }}
                              onError={() => {
                                setBrokenImageByItemId((prev) => ({ ...prev, [itemId]: true }));
                              }}
                            />
                          </button>
                        ) : (
                          <ThemePhotoPlaceholder />
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span>{item.finderName || item.full_name || 'Unknown Finder'}</span>
                          <small style={{ color: '#64748b' }}>
                            ID: {item.student_id || item.studentId || 'Not available'}
                          </small>
                        </div>
                      </td>
                      <td>{item.location || 'Unknown location'}</td>
                      <td>{formatDate(item)}</td>
                      <td>
                        <button
                          onClick={() => handleConfirmReceive(itemId)}
                          className="btn-primary"
                          disabled={receivingItemId === itemId}
                        >
                          {receivingItemId === itemId ? 'Updating...' : 'Handed Over'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isPreviewOpen && (
        <div className="modal-overlay" onClick={closeImagePreview}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95vw', width: '95vw', maxHeight: '92vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {previewImage && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => window.open(previewImage, '_blank', 'noopener,noreferrer')}
                  aria-label="Open full image"
                  title="Open full image"
                  style={{ minWidth: '44px', width: '44px', height: '44px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <polyline points="9 3 3 3 3 9" />
                    <line x1="3" y1="3" x2="10" y2="10" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <polyline points="3 15 3 21 9 21" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                    <polyline points="21 15 21 21 15 21" />
                    <line x1="21" y1="21" x2="14" y2="14" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="icon-close-btn"
                onClick={closeImagePreview}
                aria-label="Close image preview"
                title="Close"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            {previewImage ? (
              <img
                src={previewImage}
                alt={previewAlt}
                style={{ width: 'min(90vw, 1100px)', maxHeight: '78vh', objectFit: 'contain', borderRadius: '10px', display: 'block', margin: '0 auto' }}
                onError={() => {
                  setPreviewImage('');
                }}
              />
            ) : (
              <ThemePhotoPlaceholder modal />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityReceiveItems;
