import { normalizeCategory } from '../utils/categoryUtils';
import SampleItemImage from './SampleItemImage';
import { maskSensitiveDescription } from '../utils/itemDisplayUtils';

const ItemCard = ({ item, showActions = false, onDelete, showPostedBy = true, onStatusClick }) => {
  if (!item) return null;

  const configuredApiUrl = import.meta.env.VITE_API_URL;
  const API_URL = configuredApiUrl?.includes('localhost:5000')
    ? configuredApiUrl.replace('localhost:5000', 'localhost:8080').replace('/api', '')
    : configuredApiUrl?.replace('/api', '') || 'http://localhost:8080';
  const normalizedCategory = normalizeCategory(item.category, item.item_name || item.name);
  const formattedDate = (() => {
    if (!item.date) return 'N/A';
    const parsed = new Date(item.date);
    return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
  })();
  const formattedTime = item.time || '--:--';
  const displayStatus = item.status || 'active';
  const statusClass = String(displayStatus).toLowerCase();
  const statusLabel = statusClass === 'active'
    ? (onStatusClick ? 'View Matches' : 'active')
    : displayStatus;
  const displayDescription = maskSensitiveDescription(item.description, normalizedCategory);
  const badgeLabel = normalizedCategory || 'Other';
  const rawImage = item.image_url || item.imageUrl || item.image;
  const normalizedImage = rawImage ? String(rawImage).trim().replace(/\\/g, '/') : '';
  const normalizedPath = normalizedImage ? normalizedImage.replace(/\/+/g, '/').replace(/^\/+/, '') : '';
  const imageSrc = !normalizedImage
    ? ''
    : normalizedImage.startsWith('http://') || normalizedImage.startsWith('https://')
      ? normalizedImage
      : `${API_URL}/${normalizedPath}`;

  return (
    <div className="item-card">
      <div className="item-image-container">
        {imageSrc ? (
          <img src={imageSrc} alt={item.item_name} className="item-image" />
        ) : (
          <SampleItemImage category={normalizedCategory} item={item} />
        )}
      </div>
      <div className="item-details">
        <span className={`category-badge ${item.type}`}>{badgeLabel}</span>
        <span className={`type-badge ${item.type}`}>{item.type}</span>
        <h3>{item.item_name || 'Unnamed Item'}</h3>
        <p className="item-description">{displayDescription || 'No description provided.'}</p>
        <div className="item-info">
          <p><strong>Date:</strong> {formattedDate}</p>
          <p><strong>Time:</strong> {formattedTime}</p>
          <p>
            <strong>Status:</strong>{' '}
            {onStatusClick ? (
              <button
                type="button"
                className={`status-badge status-clickable ${statusClass}`}
                aria-label={`View matches for ${item.item_name || 'this item'}`}
                onClick={() => onStatusClick(item)}
              >
                {statusLabel}
              </button>
            ) : (
              <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
            )}
          </p>
        </div>
        {showPostedBy && item.full_name && <p className="posted-by"><small>Posted by: {item.full_name}</small></p>}
        
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
