import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './FoundItemCard.css';
import ClaimModal from './ClaimModal';
import { normalizeCategory } from '../utils/categoryUtils';
import { maskNicInText } from '../utils/itemDisplayUtils';
import SampleItemImage from './SampleItemImage';

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
<<<<<<< HEAD

    // Determine whether there is a real uploaded photo
    const hasRealImage =
      normalizedItem.image &&
      !normalizedItem.image.includes('placeholder.com') &&
      !normalizedItem.image.includes('via.placeholder');
=======
  const normalizedStatus = useMemo(() => String(normalizedItem?.status || '').toUpperCase(), [normalizedItem?.status]);
  const isAlreadyHandedOver = normalizedStatus === 'HANDOVER_REQUESTED'
    || normalizedStatus === 'HELD_BY_SECURITY'
    || normalizedStatus === 'HANDED_TO_SECURITY';
>>>>>>> b8d0cb7e513d1e7c5f80c86f8dcac51cc2a2893b
  
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
        {hasRealImage ? (
          <img
            src={normalizedItem.image}
            alt={normalizedItem.name}
            className="card-image"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <SampleItemImage category={normalizedItem.category} item={normalizedItem} />
        )}
        <div className="card-badge">{normalizedItem.category}</div>
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
