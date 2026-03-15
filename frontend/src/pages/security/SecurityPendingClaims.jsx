import { useEffect, useState } from 'react';
import { securityAPI } from '../../services/api';
import { toast } from 'react-toastify';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 10;

const SecurityPendingClaims = () => {
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [foundItems, setFoundItems] = useState([]);
  const [foundItemsLoading, setFoundItemsLoading] = useState(true);
  const [foundItemsError, setFoundItemsError] = useState('');
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState({
    pageNumber: 0,
    totalPages: 0,
    totalElements: 0,
    pageSize: PAGE_SIZE
  });
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    loadClaims();
  }, []);

  useEffect(() => {
    loadFoundItems(page);
  }, [page]);

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

  const loadFoundItems = async (requestedPage) => {
    try {
      setFoundItemsLoading(true);
      setFoundItemsError('');

      const response = await securityAPI.getFoundItems({
        page: requestedPage,
        size: PAGE_SIZE,
        sort: 'createdAt,desc'
      });

      const apiItems = response.data?.content || response.data?.items || [];
      setFoundItems(apiItems);
      setPagination({
        pageNumber: response.data?.pageNumber ?? requestedPage,
        totalPages: response.data?.totalPages ?? 0,
        totalElements: response.data?.totalElements ?? 0,
        pageSize: response.data?.pageSize ?? PAGE_SIZE
      });
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load found items';
      setFoundItems([]);
      setPagination({ pageNumber: 0, totalPages: 0, totalElements: 0, pageSize: PAGE_SIZE });
      setFoundItemsError(message);
      toast.error(message);
    } finally {
      setFoundItemsLoading(false);
    }
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
  };

  const getImageUrl = (item) => {
    if (item.image_url) {
      return `http://localhost:8080/${item.image_url}`;
    }
    if (item.imageUrl) {
      return `http://localhost:8080/${item.imageUrl}`;
    }
    return 'https://via.placeholder.com/80x80?text=No+Photo';
  };

  const formatDate = (item) => {
    const dateValue = item.created_at || item.createdAt || item.date;
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

  if (claimsLoading && foundItemsLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <h1>Security Dashboard</h1>

      <div className="found-items-section">
        <div className="section-header">
          <h2>Found Items</h2>
          <span>Total: {pagination.totalElements}</span>
        </div>

        {foundItemsLoading ? (
          <p>Loading found items...</p>
        ) : foundItemsError ? (
          <div className="alert alert-warning">{foundItemsError}</div>
        ) : foundItems.length === 0 ? (
          <p>No found items available.</p>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Photo</th>
                    <th>Location</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {foundItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name || item.item_name || 'Unnamed Item'}</td>
                      <td>
                        <img
                          src={getImageUrl(item)}
                          alt={item.name || item.item_name || 'Found item'}
                          style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px' }}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/80x80?text=No+Photo';
                          }}
                        />
                      </td>
                      <td>{item.location || 'Unknown location'}</td>
                      <td>{formatDate(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={pagination.pageNumber}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
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
