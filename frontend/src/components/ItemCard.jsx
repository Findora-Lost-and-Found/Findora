<<<<<<< HEAD
import { useMemo } from 'react';
import { normalizeCategory } from '../utils/categoryUtils';
import { buildIdentityPreviewImage } from '../utils/cardPreviewUtils';

const CATEGORY_FALLBACK_IMAGE = {
  'Bank Card': '/assets/card-commercial.svg',
  NIC: '/assets/nic-card.svg',
  'Student ID': '/assets/student-id.svg',
  Wallet: 'https://via.placeholder.com/300x200?text=Wallet+Photo',
  Other: 'https://via.placeholder.com/300x200?text=Item+Photo'
};

const getIdentityBadgeLabel = (normalizedCategory, item) => {
  if (normalizedCategory !== 'Student ID') return normalizedCategory;

  const combinedText = `${item?.name || item?.item_name || ''} ${item?.description || ''}`;
  return /id\s*type\s*:\s*staff|staff\s*id|\bsf[-\s]?\d+/i.test(combinedText) ? 'STAFF ID' : 'STUDENT ID';
};
=======
import { normalizeCategory } from '../utils/categoryUtils';
import SampleItemImage from './SampleItemImage';
import { maskSensitiveDescription } from '../utils/itemDisplayUtils';
>>>>>>> develop-i

const ItemCard = ({ item, showActions = false, onDelete }) => {
  if (!item) return null;

<<<<<<< HEAD
  const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');
  const normalizedCategory = normalizeCategory(item.category, item.item_name || item.name);

  const normalizedItem = {
    ...item,
    category: normalizedCategory,
    name: item.name || item.item_name
  };

=======
  const configuredApiUrl = import.meta.env.VITE_API_URL;
  const API_URL = configuredApiUrl?.includes('localhost:5000')
    ? configuredApiUrl.replace('localhost:5000', 'localhost:8080').replace('/api', '')
    : configuredApiUrl?.replace('/api', '') || 'http://localhost:8080';
  const normalizedCategory = normalizeCategory(item.category, item.item_name || item.name);
  const displayDescription = maskSensitiveDescription(item.description, normalizedCategory);
>>>>>>> develop-i
  const displayDate = item.date ? new Date(item.date).toLocaleDateString() : 'Not provided';
  const rawImage = item.image_url || item.imageUrl || item.image;
  const normalizedImage = rawImage ? String(rawImage).trim().replace(/\\/g, '/') : '';
  const normalizedPath = normalizedImage ? normalizedImage.replace(/\/+/g, '/').replace(/^\/+/, '') : '';
  const imageSrc = !normalizedImage
    ? ''
    : normalizedImage.startsWith('http://') || normalizedImage.startsWith('https://')
      ? normalizedImage
      : `${API_URL}/${normalizedPath}`;

  const fallbackImage = CATEGORY_FALLBACK_IMAGE[normalizedCategory] || CATEGORY_FALLBACK_IMAGE.Other;
  const generatedPreviewImage = useMemo(() => buildIdentityPreviewImage(normalizedItem), [normalizedItem]);
  const badgeLabel = useMemo(
    () => getIdentityBadgeLabel(normalizedCategory, normalizedItem),
    [normalizedCategory, normalizedItem.name, normalizedItem.item_name, normalizedItem.description]
  );
  const resolvedImage = useMemo(() => {
    if (item.image_url) {
      const normalizedPath = String(item.image_url).trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
      return `${API_URL}/${normalizedPath}`;
    }

    if (item.image) {
      const source = String(item.image).trim().replace(/\\/g, '/');
      if (source.startsWith('http://') || source.startsWith('https://')) {
        return source;
      }
      const normalizedPath = source.replace(/\/+/g, '/').replace(/^\/+/, '');
      return `${API_URL}/${normalizedPath}`;
    }

    if (generatedPreviewImage) {
      return generatedPreviewImage;
    }

    return fallbackImage;
  }, [generatedPreviewImage, item.image_url, item.image, API_URL, fallbackImage]);

  return (
    <div className="item-card">
<<<<<<< HEAD
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
=======
      <div className="item-image-container">
        {imageSrc ? (
          <img src={imageSrc} alt={item.item_name} className="item-image" />
        ) : (
          <SampleItemImage category={normalizedCategory} item={item} />
        )}
      </div>
>>>>>>> develop-i
      <div className="item-details">
        <span className={`category-badge ${item.type}`}>{badgeLabel}</span>
        <span className={`type-badge ${item.type}`}>{item.type}</span>
        <h3>{item.item_name || 'Unnamed Item'}</h3>
        <p className="item-description">{displayDescription || 'No description provided.'}</p>
        <div className="item-info">
          <p><strong>Date:</strong> {displayDate}</p>
          <p><strong>Time:</strong> {item.time || '--:--'}</p>
          <p><strong>Status:</strong> <span className={`status-badge ${item.status || 'active'}`}>{item.status || 'active'}</span></p>
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
