import { normalizeCategory } from '../utils/categoryUtils';
import SampleItemImage from './SampleItemImage';
import { maskSensitiveDescription } from '../utils/itemDisplayUtils';

const ItemCard = ({ item, showActions = false, onDelete }) => {
  if (!item) return null;

  const configuredApiUrl = import.meta.env.VITE_API_URL;
  const API_URL = configuredApiUrl?.includes('localhost:5000')
    ? configuredApiUrl.replace('localhost:5000', 'localhost:8080').replace('/api', '')
    : configuredApiUrl?.replace('/api', '') || 'http://localhost:8080';
  const normalizedCategory = normalizeCategory(item.category, item.item_name || item.name);
  const displayDescription = maskSensitiveDescription(item.description, normalizedCategory);
  const displayDate = item.date ? new Date(item.date).toLocaleDateString() : 'Not provided';
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
        <span className={`category-badge ${item.type}`}>{normalizedCategory}</span>
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
