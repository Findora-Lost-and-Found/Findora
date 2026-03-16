import { useMemo } from 'react';
import { normalizeCategory } from '../utils/categoryUtils';
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
  return /id\s*type\s*:\s*staff|staff\s*id/i.test(combinedText) ? 'STAFF ID' : 'STUDENT ID';
};

const ItemCard = ({ item, showActions = false, onDelete }) => {
  const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080';
  const normalizedCategory = normalizeCategory(item.category, item.item_name || item.name);
  const normalizedItem = {
    ...item,
    category: normalizedCategory,
    name: item.name || item.item_name
  };

  const fallbackImage = CATEGORY_FALLBACK_IMAGE[normalizedCategory] || CATEGORY_FALLBACK_IMAGE.Other;
  const generatedPreviewImage = useMemo(() => buildIdentityPreviewImage(normalizedItem), [normalizedItem]);
  const badgeLabel = useMemo(
    () => getIdentityBadgeLabel(normalizedCategory, normalizedItem),
    [normalizedCategory, normalizedItem.name, normalizedItem.item_name, normalizedItem.description]
  );
  const resolvedImage = useMemo(() => {
    if (generatedPreviewImage) {
      return generatedPreviewImage;
    }

    if (item.image_url) {
      return `${API_URL}${item.image_url}`;
    }

    if (item.image) {
      return item.image;
    }

    return fallbackImage;
  }, [generatedPreviewImage, item.image_url, item.image, API_URL, fallbackImage]);

  return (
    <div className="item-card">
      <img
        src={resolvedImage}
        alt={item.item_name}
        className="item-image"
        onError={(e) => {
          if (e.target.dataset.fallbackApplied === 'true') return;
          e.target.dataset.fallbackApplied = 'true';
          e.target.src = fallbackImage;
        }}
      />
      <div className="item-details">
        <span className={`category-badge ${item.type}`}>{badgeLabel}</span>
        <span className={`type-badge ${item.type}`}>{item.type}</span>
        <h3>{item.item_name}</h3>
        <p className="item-description">{item.description}</p>
        <div className="item-info">
          <p><strong>Date:</strong> {new Date(item.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> {item.time}</p>
          <p><strong>Status:</strong> <span className={`status-badge ${item.status}`}>{item.status}</span></p>
        </div>
        {item.full_name && <p className="posted-by"><small>Posted by: {item.full_name}</small></p>}
        
        {showActions && onDelete && (
          <div className="item-actions">
            <button onClick={() => onDelete(item.id)} className="btn-danger">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemCard;
