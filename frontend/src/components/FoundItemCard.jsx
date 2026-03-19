import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './FoundItemCard.css';
import ClaimModal from './ClaimModal';
import { normalizeCategory } from '../utils/categoryUtils';
import { maskSensitiveDescription } from '../utils/itemDisplayUtils';
import SampleItemImage from './SampleItemImage';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_ORIGIN = (configuredApiUrl?.includes('localhost:5000')
  ? configuredApiUrl.replace('localhost:5000', 'localhost:8080')
  : configuredApiUrl || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

const FoundItemCard = ({ item, onClaim, onHandover, handoverInProgress = false }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const normalizedItem = {
    ...item,
    category: normalizeCategory(item.category, item.name || item.item_name)
  };
  const postedByName = normalizedItem?.posted_by?.full_name || normalizedItem?.full_name || normalizedItem?.username || 'Unknown User';
  const displayDescription = maskSensitiveDescription(normalizedItem.description, normalizedItem.category);

  // Treat ownership as true only when both IDs are present and equal.
  const currentUserId = Number(currentUser?.id);
  const ownerIdRaw = normalizedItem?.posted_by?.id ?? normalizedItem?.user_id ?? normalizedItem?.userId;
  const ownerId = Number(ownerIdRaw);
  const isOwnItem = Number.isFinite(currentUserId)
    && Number.isFinite(ownerId)
    && currentUserId === ownerId;

  const rawImage = normalizedItem.image || normalizedItem.image_url || normalizedItem.imageUrl || '';
  const normalizedRawImage = String(rawImage || '').trim();
  const hasRealImage =
    normalizedRawImage !== ''
    && !normalizedRawImage.includes('placeholder.com')
    && !normalizedRawImage.includes('via.placeholder');

  const resolvedImageSrc = useMemo(() => {
    if (!hasRealImage) {
      return '';
    }

    const source = normalizedRawImage.replace(/\\/g, '/');
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return source;
    }

    const normalizedPath = source.replace(/\/+/g, '/').replace(/^\/+/, '');
    return `${API_ORIGIN}/${normalizedPath}`;
  }, [hasRealImage, normalizedRawImage]);

  const showOriginalPhotoNote = normalizedItem.category === 'Other' && hasRealImage && !imageLoadFailed;

  const normalizedStatus = useMemo(() => String(normalizedItem?.status || '').toUpperCase(), [normalizedItem?.status]);
  const isAlreadyHandedOver = normalizedStatus === 'HANDOVER_REQUESTED'
    || normalizedStatus === 'HELD_BY_SECURITY'
    || normalizedStatus === 'HANDED_TO_SECURITY';
  
  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const handleClaimClick = () => {
    setIsClaimModalOpen(true);
  };

  const handleReportClick = () => {
    navigate(`/report-post/${normalizedItem.id}`);
  };

  return (
    <div className="found-item-card" id={`found-item-${normalizedItem.id}`}>
      <div className="card-image-container">
        {hasRealImage && !imageLoadFailed ? (
          <img
            src={resolvedImageSrc}
            alt={normalizedItem.name}
            className="card-image"
            onError={(e) => {
              setImageLoadFailed(true);
            }}
          />
        ) : (
          <SampleItemImage category={normalizedItem.category} item={normalizedItem} />
        )}
        <div className="card-badge">{normalizedItem.category}</div>
      </div>

      <div className="card-content">
        <h3 className="card-title">{normalizedItem.name}</h3>
        {isAlreadyHandedOver && (
          <div className="handed-over-label" style={{ color: '#219653', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Handed Over to Security
          </div>
        )}
        
        <div className="card-meta">
          <div className="meta-item">
            <span className="meta-icon">📅</span>
            <span className="meta-text">{formatDate(normalizedItem.date_found)}</span>
          </div>
        </div>

        <p className="card-description">{displayDescription}</p>

        <div className="card-posted-by">
          <small>Posted by <strong>{postedByName}</strong></small>
        </div>

        {showOriginalPhotoNote && (
          <div className="original-photo-note">Founder uploaded the original photo</div>
        )}

        <div className={`card-actions flex items-center gap-3${isOwnItem ? ' single-action' : ''}`}>
          {isOwnItem ? (
            isAlreadyHandedOver ? (
              <button className="btn btn-secondary" disabled>
                Handed Over to Security
              </button>
            ) : (
              <button
                onClick={() => onHandover && onHandover(normalizedItem.id)}
                className="btn btn-claim"
                disabled={handoverInProgress}
              >
                {handoverInProgress ? 'Submitting...' : 'Hand Over to Security'}
              </button>
            )
          ) : (
            <button 
              onClick={handleClaimClick}
              className="btn btn-claim"
            >
              🏷️ Claim This Item
            </button>
          )}
          <button
            onClick={handleReportClick}
            className="report-icon-btn group relative flex items-center justify-center p-2.5 rounded-lg border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300 dark:border-red-700 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-800 dark:focus:ring-red-600"
            title="Report"
            aria-label="Report"
          >
            <span className="report-tooltip absolute -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-white bg-red-600 shadow-sm opacity-0 pointer-events-none group-hover:opacity-100 group-focus:opacity-100 transition-opacity" role="tooltip">Report</span>
            <span aria-hidden="true" role="img">🚩</span>
          </button>
        </div>
      </div>

      <ClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        item={normalizedItem}
      />
    </div>
  );
};

export default FoundItemCard;
