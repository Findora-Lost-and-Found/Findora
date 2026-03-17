import { normalizeCategory } from '../utils/categoryUtils';

const ItemCard = ({ item, showActions = false, onDelete }) => {
  if (!item) return null;

  const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080';
  const normalizedCategory = normalizeCategory(item.category, item.item_name || item.name);
  const formattedDate = (() => {
    if (!item.date) return 'N/A';
    const parsed = new Date(item.date);
    return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
  })();
  const formattedTime = item.time || '--:--';
  const displayStatus = item.status || 'active';

  return (
    <div className="item-card">
      {item.image_url && (
        <img src={`${API_URL}${item.image_url}`} alt={item.item_name || 'Lost item'} className="item-image" />
      )}
      <div className="item-details">
        <span className={`category-badge ${item.type}`}>{normalizedCategory}</span>
        <span className={`type-badge ${item.type}`}>{item.type}</span>
        <h3>{item.item_name || 'Unnamed Item'}</h3>
        <p className="item-description">{item.description || 'No description provided.'}</p>
        <div className="item-info">
          <p><strong>Date:</strong> {formattedDate}</p>
          <p><strong>Time:</strong> {formattedTime}</p>
          <p><strong>Status:</strong> <span className={`status-badge ${displayStatus}`}>{displayStatus}</span></p>
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
