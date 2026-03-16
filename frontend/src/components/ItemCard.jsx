import { normalizeCategory } from '../utils/categoryUtils';

const ItemCard = ({ item, showActions = false, onDelete }) => {
  const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080';
  const normalizedCategory = normalizeCategory(item.category, item.item_name || item.name);

  return (
    <div className="item-card">
      {item.image_url && (
        <img src={`${API_URL}${item.image_url}`} alt={item.item_name} className="item-image" />
      )}
      <div className="item-details">
        <span className={`category-badge ${item.type}`}>{normalizedCategory}</span>
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
