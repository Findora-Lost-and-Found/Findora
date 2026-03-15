import { normalizeCategory } from '../utils/categoryUtils';

const ItemCard = ({ item, showActions = false, onDelete }) => {
  if (!item) return null;

  const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const normalizedCategory = normalizeCategory(item.category, item.item_name || item.name);
  const displayDate = item.date ? new Date(item.date).toLocaleDateString() : 'Not provided';

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
