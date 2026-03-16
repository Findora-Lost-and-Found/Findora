import { useEffect, useState } from 'react';
import { securityAPI } from '../../services/api';
import { toast } from 'react-toastify';

const SecurityPendingClaims = () => {
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [heldItems, setHeldItems] = useState([]);
  const [heldItemsLoading, setHeldItemsLoading] = useState(true);
  const [heldItemsError, setHeldItemsError] = useState('');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    loadClaims();
  }, []);

  useEffect(() => {
    loadHeldItems();
  }, []);

  const loadClaims = async () => {
    try {
      const response = await securityAPI.getPendingClaims();
      setClaims(response.data.claims);
    } catch (error) {
      console.error('Error loading claims:', error);
    } finally {
      setClaimsLoading(false);
    }
  };

  const loadHeldItems = async () => {
    try {
      setHeldItemsLoading(true);
      setHeldItemsError('');

      const response = await securityAPI.getHeldItems();

      const apiItems = response.data?.content || response.data?.items || [];
      setHeldItems(apiItems);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load pending handover items';
      setHeldItems([]);
      setHeldItemsError(message);
      toast.error(message);
    } finally {
      setHeldItemsLoading(false);
    }
  };

  const getImageUrl = (item) => {
    const imagePath = item.imageUrl || item.image_url;
    if (imagePath) {
      return `http://localhost:8080/${String(imagePath).replace(/^\/+/, '')}`;
    }

    if (item.image_url) {
      return `http://localhost:8080/${item.image_url}`;
    }
    if (item.imageUrl) {
      return `http://localhost:8080/${item.imageUrl}`;
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

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      await securityAPI.verifyClaim(selectedClaim.id, otp);
      toast.success('Item released successfully');
      setSelectedClaim(null);
      setOtp('');
      loadClaims();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify claim');
    }
  };

  if (claimsLoading && heldItemsLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <h1>Security Dashboard</h1>

      <div className="found-items-section">
        <div className="section-header">
          <h2>Pending Handover Items</h2>
          <span>Total: {heldItems.length}</span>
        </div>

        {heldItemsLoading ? (
          <p>Loading pending handover items...</p>
        ) : heldItemsError ? (
          <div className="alert alert-warning">{heldItemsError}</div>
        ) : heldItems.length === 0 ? (
          <p>No pending handover items available.</p>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Photo</th>
                    <th>Owner Name</th>
                    <th>Location</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {heldItems.map((item) => (
                    <tr key={item.id}>
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
                      <td>{item.full_name || item.fullName || item.username || 'Unknown User'}</td>
                      <td>{item.location || 'Unknown location'}</td>
                      <td>{formatDate(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <h1>Pending Claims</h1>

      {claimsLoading ? (
        <p>Loading pending claims...</p>
      ) : claims.length === 0 ? (
        <p>No pending claims.</p>
      ) : (
        <div className="claims-list">
          {claims.map(claim => (
            <div key={claim.id} className="claim-card">
              <div className="claim-details">
                <h3>{claim.item_name}</h3>
                <p><strong>Category:</strong> {claim.category}</p>
                <p><strong>Location:</strong> {claim.location}</p>
                <p><strong>Claimer:</strong> {claim.full_name}</p>
                <p><strong>Phone:</strong> {claim.phone}</p>
                <p><strong>Claimed on:</strong> {new Date(claim.claimed_at).toLocaleString()}</p>
                <button onClick={() => setSelectedClaim(claim)} className="btn-primary">
                  Verify & Release
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedClaim && (
        <div className="modal-overlay" onClick={() => setSelectedClaim(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Verify Claim</h2>
            <p>Item: <strong>{selectedClaim.item_name}</strong></p>
            <p>Claimer: <strong>{selectedClaim.full_name}</strong></p>
            <form onSubmit={handleVerify}>
              <div className="form-group">
                <label>Enter OTP from Claimer</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                  required
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Verify & Release</button>
                <button type="button" onClick={() => setSelectedClaim(null)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityPendingClaims;
