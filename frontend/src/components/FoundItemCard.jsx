import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './FoundItemCard.css';
import ClaimModal from './ClaimModal';
import { normalizeCategory } from '../utils/categoryUtils';
import { maskNicInText } from '../utils/itemDisplayUtils';
import { buildIdentityPreviewImage } from '../utils/cardPreviewUtils';

const CATEGORY_FALLBACK_IMAGE = {
  'Bank Card': '/assets/card-commercial.svg',
  NIC: '/assets/nic-card.svg',
  'Student ID': '/assets/student-id.svg',
  Wallet: '/assets/card-peoples.svg',
  Other: '/assets/card-boc.svg'
};

const getIdentityBadgeLabel = (normalizedCategory, item) => {
  if (normalizedCategory !== 'Student ID') return normalizedCategory;

  const combinedText = `${item?.name || item?.item_name || ''} ${item?.description || ''}`;
  return /id\s*type\s*:\s*staff|staff\s*id|\bsf[-\s]?\d+/i.test(combinedText) ? 'STAFF ID' : 'STUDENT ID';
};

const FoundItemCard = ({ item, onClaim, onHandover, handoverInProgress = false }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const normalizedItem = {
    ...item,
    category: normalizeCategory(item.category, item.name || item.item_name)
  };
  const postedByName = normalizedItem?.posted_by?.full_name || normalizedItem?.full_name || normalizedItem?.username || 'Unknown User';
  const displayDescription = normalizedItem.category === 'NIC'
    ? maskNicInText(normalizedItem.description)
    : normalizedItem.description;
  
  // Check if current user owns this item
  const isOwnItem = currentUser && (currentUser.id === normalizedItem?.posted_by?.id || currentUser.id === normalizedItem?.user_id);
  const normalizedStatus = useMemo(() => String(normalizedItem?.status || '').toUpperCase(), [normalizedItem?.status]);
  const isAlreadyHandedOver = normalizedStatus === 'HANDOVER_REQUESTED'
    || normalizedStatus === 'HELD_BY_SECURITY'
    || normalizedStatus === 'HANDED_TO_SECURITY';
  const fallbackImage = CATEGORY_FALLBACK_IMAGE[normalizedItem.category] || CATEGORY_FALLBACK_IMAGE.Other;
  const generatedPreviewImage = useMemo(() => buildIdentityPreviewImage(normalizedItem), [normalizedItem]);
  const badgeLabel = useMemo(
    () => getIdentityBadgeLabel(normalizedItem.category, normalizedItem),
    [normalizedItem.category, normalizedItem.name, normalizedItem.item_name, normalizedItem.description]
  );
  const resolvedImage = useMemo(() => {
    if (generatedPreviewImage) {
      return generatedPreviewImage;
    }

    const source = normalizedItem.image;

    if (!source || source.includes('via.placeholder.com')) {
      return fallbackImage;
    }

    return source;
  }, [normalizedItem.image, generatedPreviewImage, fallbackImage]);
  
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
        <img 
          src={resolvedImage} 
          alt={normalizedItem.name} 
          className="card-image"
          onError={(e) => {
            if (e.target.dataset.fallbackApplied === 'true') return;
            e.target.dataset.fallbackApplied = 'true';
            e.target.src = fallbackImage;
          }}
        />
        <div className="card-badge">{badgeLabel}</div>
      </div>

      <div className="card-content">
        <h3 className="card-title">{normalizedItem.name}</h3>
        
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

        <div className="card-actions">
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
            className="btn btn-report"
          >
            🚩 Report
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
