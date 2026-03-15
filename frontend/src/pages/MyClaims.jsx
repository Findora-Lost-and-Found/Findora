import { useEffect, useState } from 'react';
import { claimsAPI } from '../services/api';
import './MyClaims.css';

const MyClaims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      const response = await claimsAPI.getMy();
      const claimsData = response.data.claims || [];
      setClaims(claimsData);
      console.log('Claims loaded:', claimsData); // Debug log
    } catch (error) {
      console.error('Error loading claims:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <h1>My Claims</h1>

      {claims.length === 0 ? (
        <p>You haven't made any claims yet.</p>
      ) : (
        <div className="claims-list">
          {claims.map(claim => (
            <div key={claim.id} className="claim-card">
              {claim.image_url && (
                <img src={`http://localhost:5000${claim.image_url}`} alt={claim.item_name} />
              )}
              <div className="claim-details">
                <h3>{claim.item_name || 'Unknown Item'}</h3>
                <p><strong>Category:</strong> {claim.category || 'N/A'}</p>
                <p><strong>Status:</strong> <span className={`status-badge ${(claim.status || 'pending').toLowerCase()}`}>{claim.status ? claim.status.toUpperCase() : 'PENDING'}</span></p>
                <p><strong>Claimed on:</strong> {claim.claimed_at ? new Date(claim.claimed_at).toLocaleString() : 'N/A'}</p>
                
                {(!claim.status || claim.status === 'pending') && (
                  <div className="otp-info">
                    <p><strong>Your OTP:</strong> <code>{claim.otp || 'N/A'}</code></p>
                    <p>Please provide this OTP to the security officer to collect your item.</p>
                    <p><small>OTP expires on: {claim.otp_expiry ? new Date(claim.otp_expiry).toLocaleString() : 'N/A'}</small></p>
                  </div>
                )}

                {claim.status === 'collected' && (
                  <p className="success-msg">✓ Item collected on {claim.collected_at ? new Date(claim.collected_at).toLocaleString() : 'N/A'}</p>
                )}

                {claim.status === 'approved' && (
                  <p className="success-msg">✓ Claim approved! Please visit security office with your OTP.</p>
                )}

                {claim.status === 'rejected' && (
                  <p className="reject-msg">✗ Claim rejected. Please contact security for details.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyClaims;
