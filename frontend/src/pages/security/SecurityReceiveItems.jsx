import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { securityAPI } from '../../services/api';

const SecurityReceiveItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receivingItemId, setReceivingItemId] = useState(null);

  const loadReceiveItems = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await securityAPI.getReceiveItems();
      setItems(response.data?.items || []);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load receive item requests';
      setError(message);
      setItems([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceiveItems();
  }, []);

  const getImageUrl = (item) => {
    const imagePath = item.imageUrl || item.image_url;
    if (imagePath) {
      return `http://localhost:8080/${String(imagePath).replace(/^\/+/, '')}`;
    }
    return 'https://via.placeholder.com/80x80?text=No+Photo';
  };

  const formatDate = (item) => {
    const dateValue = item.date || item.created_at || item.createdAt;
    if (!dateValue) {
      return 'N/A';
    }
    return new Date(dateValue).toLocaleDateString();
  };

  const handleConfirmReceive = async (itemId) => {
    try {
      setReceivingItemId(itemId);
      await securityAPI.confirmReceive(itemId);
      toast.success('Item received by Security. It appears in Pending Claims only when a claim exists for this item.');
      await loadReceiveItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm item receive');
    } finally {
      setReceivingItemId(null);
    }
  };

  return (
    <div className="container">
      <h1>Receive Item</h1>

      <div className="found-items-section">
        <div className="section-header">
          <h2>Handover Requests</h2>
          <span>Total: {items.length}</span>
        </div>

        {loading ? (
          <p>Loading receive item requests...</p>
        ) : error ? (
          <div className="alert alert-warning">{error}</div>
        ) : items.length === 0 ? (
          <p>No handover requests available.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Photo</th>
                  <th>Finder Name</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const itemId = item.itemId || item.id;
                  return (
                    <tr key={itemId}>
                      <td>{item.itemName || item.name || item.item_name || 'Unnamed Item'}</td>
                      <td>
                        <img
                          src={getImageUrl(item)}
                          alt={item.itemName || item.name || item.item_name || 'Found item'}
                          style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px' }}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/80x80?text=No+Photo';
                          }}
                        />
                      </td>
                      <td>{item.finderName || item.full_name || 'Unknown Finder'}</td>
                      <td>{item.location || 'Unknown location'}</td>
                      <td>{formatDate(item)}</td>
                      <td>
                        <button
                          onClick={() => handleConfirmReceive(itemId)}
                          className="btn-primary"
                          disabled={receivingItemId === itemId}
                        >
                          {receivingItemId === itemId ? 'Updating...' : 'Handed Over'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityReceiveItems;
