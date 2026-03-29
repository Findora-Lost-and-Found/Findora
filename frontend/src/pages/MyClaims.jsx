import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { claimsAPI } from '../services/api';
import { toast } from 'react-toastify';
import SampleItemImage from '../components/SampleItemImage';
import { normalizeCategory } from '../utils/categoryUtils';
import './MyClaims.css';

const MyClaims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [otpLoadingById, setOtpLoadingById] = useState({});
  const [imageLoadFailedById, setImageLoadFailedById] = useState({});
  const [searchParams] = useSearchParams();
  const focusClaimId = searchParams.get('claimId');
  const API_BASE_URL = (import.meta.env.VITE_API_URL?.replace('/api', '')) || 'http://localhost:8080';

  const parseDateTimeValue = (value) => {
    if (!value) return null;

    // Backend may return UTC timestamps without an explicit timezone.
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)) {
      const parsedUtc = new Date(`${value}Z`);
      return Number.isNaN(parsedUtc.getTime()) ? null : parsedUtc;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const getImageSrc = (rawImageUrl) => {
    const imageUrl = String(rawImageUrl || '').trim();
    if (!imageUrl) return '';
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

    const normalizedPath = `/${imageUrl}`
      .replace(/\\/g, '/')
      .replace(/\/{2,}/g, '/');

    return `${API_BASE_URL}${normalizedPath}`;
  };

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
    const parsed = parseDateTimeValue(value);
    return parsed ? parsed.toLocaleString() : 'N/A';
  };

  const getStatusLabel = (status) => String(status || 'pending').toUpperCase();

  const getNormalizedCategory = (claim) => {
    const rawCategory = String(claim?.category || '').replace(/_/g, ' ');
    return normalizeCategory(rawCategory, claim?.item_name || '');
  };

  const hasOtp = (claim) => Boolean(String(claim?.otp || '').trim());

  const isOtpExpired = (claim) => {
    if (!claim?.otp_expiry) return true;
    const expiry = parseDateTimeValue(claim.otp_expiry);
    return !expiry || expiry.getTime() <= Date.now();
  };

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

  const handleGenerateOtp = async (claimId) => {
    try {
      setOtpLoadingById((prev) => ({ ...prev, [claimId]: true }));
      const response = await claimsAPI.generateOtp(claimId);
      const updatedClaim = response.data?.claim;

      setClaims((prev) => prev.map((claim) => {
        if (claim.id !== claimId) return claim;
        return {
          ...claim,
          otp: updatedClaim?.otp || claim.otp,
          otp_expiry: updatedClaim?.otp_expiry || claim.otp_expiry
        };
      }));

      toast.success('OTP generated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate OTP');
    } finally {
      setOtpLoadingById((prev) => ({ ...prev, [claimId]: false }));
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container my-claims-page">
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
              <div className="claim-image">
                {claim.image_url && !imageLoadFailedById[claim.id] ? (
                  <img
                    src={getImageSrc(claim.image_url)}
                    alt={claim.item_name}
                    onError={() => {
                      setImageLoadFailedById((prev) => ({ ...prev, [claim.id]: true }));
                    }}
                  />
                ) : (
                  <SampleItemImage
                    category={getNormalizedCategory(claim)}
                    item={{
                      item_name: claim.item_name,
                      name: claim.item_name,
                      category: claim.category,
                      description: claim.description
                    }}
                  />
                )}
              </div>
              <div className="claim-details">
                <h3>{claim.item_name || 'Unknown Item'}</h3>
                <p><strong>Category:</strong> {getNormalizedCategory(claim) || 'N/A'}</p>
                <p><strong>Status:</strong> <span className={`status-badge ${(claim.status || 'pending').toLowerCase()}`}>{getStatusLabel(claim.status)}</span></p>
                <p><strong>Claimed on:</strong> {formatDateTime(claim.claimed_at)}</p>
                
                {(!claim.status || claim.status === 'pending' || claim.status === 'approved') && (
                  !hasOtp(claim) ? (
                    <div className="otp-action-panel">
                      <p>Generate an OTP when you are ready to collect the item.</p>
                      <button
                        type="button"
                        className="btn-generate-otp"
                        onClick={() => handleGenerateOtp(claim.id)}
                        disabled={!!otpLoadingById[claim.id]}
                      >
                        {otpLoadingById[claim.id] ? 'Generating...' : 'Generate OTP'}
                      </button>
                    </div>
                  ) : isOtpExpired(claim) ? (
                    <div className="otp-action-panel otp-expired-panel">
                      <p>Your OTP has expired.</p>
                      <button
                        type="button"
                        className="btn-generate-otp"
                        onClick={() => handleGenerateOtp(claim.id)}
                        disabled={!!otpLoadingById[claim.id]}
                      >
                        {otpLoadingById[claim.id] ? 'Regenerating...' : 'Regenerate OTP'}
                      </button>
                    </div>
                  ) : (
                    <div className="otp-info">
                      <p><strong>Your OTP:</strong> <code>{claim.otp}</code></p>
                      <p>Please provide this OTP to the security officer to collect your item.</p>
                      <p><small>OTP expires on: {formatDateTime(claim.otp_expiry)}</small></p>
                    </div>
                  )
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
