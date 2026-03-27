import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { claimsAPI } from '../services/api';
import './MyClaims.css';

const MyClaims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const focusClaimId = searchParams.get('claimId');
  const API_BASE_URL = (import.meta.env.VITE_API_URL?.replace('/api', '')) || 'http://localhost:8080';

  useEffect(() => {
    loadClaims();
  }, []);

  useEffect(() => {
    if (!focusClaimId || claims.length === 0) {
      return;
    }

    const target = document.getElementById(`claim-${focusClaimId}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusClaimId, claims]);

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleString();
  };

  const getStatusLabel = (status) => String(status || 'pending').toUpperCase();

  const loadClaims = async () => {
    try {
      setError('');
      const response = await claimsAPI.getMy();
      const claimsData = response.data.claims || [];
      setClaims(claimsData);
    } catch (error) {
      console.error('Error loading claims:', error);
      setError(error.response?.data?.message || 'Failed to load claims. Please try again.');
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

      {error && <p className="claims-error">{error}</p>}

      {!error && claims.length === 0 ? (
        <p>You haven't made any claims yet.</p>
      ) : (
        <div className="claims-list">
          {claims.map(claim => (
            <div
              key={claim.id}
              id={`claim-${claim.id}`}
              className={`claim-card ${focusClaimId === String(claim.id) ? 'claim-card-focus' : ''}`}
            >
              {claim.image_url && (
                <img src={`${API_BASE_URL}${claim.image_url}`} alt={claim.item_name} />
              )}
              <div className="claim-details">
                <h3>{claim.item_name || 'Unknown Item'}</h3>
                <p><strong>Category:</strong> {claim.category || 'N/A'}</p>
                <p><strong>Status:</strong> <span className={`status-badge ${(claim.status || 'pending').toLowerCase()}`}>{getStatusLabel(claim.status)}</span></p>
                <p><strong>Claimed on:</strong> {formatDateTime(claim.claimed_at)}</p>
                
                {(!claim.status || claim.status === 'pending') && (
                  <div className="otp-info">
                    <p><strong>Your OTP:</strong> <code>{claim.otp || 'N/A'}</code></p>
                    <p>Please provide this OTP to the security officer to collect your item.</p>
                    <p><small>OTP expires on: {formatDateTime(claim.otp_expiry)}</small></p>
                  </div>
                )}

                {claim.status === 'collected' && (
                  <p className="success-msg">✓ Item collected on {formatDateTime(claim.collected_at)}</p>
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
