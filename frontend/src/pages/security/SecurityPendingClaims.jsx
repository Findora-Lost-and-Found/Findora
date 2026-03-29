import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { securityAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { itemsAPI } from '../../services/api';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_ORIGIN = (configuredApiUrl?.includes('localhost:5000')
  ? configuredApiUrl.replace('localhost:5000', 'localhost:8080')
  : configuredApiUrl || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

const ThemePhotoPlaceholder = ({ modal = false }) => (
  <div className={`theme-photo-placeholder${modal ? ' is-modal' : ' is-thumb'}`} aria-label="No photo uploaded">
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="2.5" ry="2.5" />
      <circle cx="9" cy="9" r="1.8" />
      <path d="M5 18l4.8-4.8a1.3 1.3 0 0 1 1.84 0L13.8 15l1.55-1.55a1.3 1.3 0 0 1 1.84 0L19 15.26V18H5z" />
    </svg>
  </div>
);

const SecurityPendingClaims = () => {
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [otpInputs, setOtpInputs] = useState({});
  const [verifyingClaimId, setVerifyingClaimId] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [brokenImageByClaimId, setBrokenImageByClaimId] = useState({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewAlt, setPreviewAlt] = useState('Claim item');

  useEffect(() => {
    const isAnyModalOpen = showSuccessPopup || isPreviewOpen;
    if (!isAnyModalOpen) return undefined;

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [showSuccessPopup, isPreviewOpen]);

  useEffect(() => {
    loadClaims();
  }, []);

  const readClaimImagePath = (claim) => claim.image_url
    || claim.imageUrl
    || claim.image
    || claim.item_image
    || claim.itemImage
    || claim.item?.image_url
    || claim.item?.imageUrl
    || claim.item?.image;

  const enrichClaimsWithItemImages = async (rawClaims) => {
    const claims = Array.isArray(rawClaims) ? rawClaims : [];

    const missingImageClaims = claims.filter((claim) => {
      const hasImage = !!readClaimImagePath(claim);
      const claimItemId = claim.item_id || claim.itemId;
      return !hasImage && claimItemId;
    });

    if (missingImageClaims.length === 0) {
      return claims;
    }

    const uniqueItemIds = [...new Set(missingImageClaims.map((claim) => claim.item_id || claim.itemId))];
    const results = await Promise.allSettled(uniqueItemIds.map((itemId) => itemsAPI.getById(itemId)));

    const imageByItemId = new Map();
    results.forEach((result, index) => {
      if (result.status !== 'fulfilled') {
        return;
      }

      const body = result.value?.data;
      const item = body?.item || body || {};
      const imagePath = item.image_url || item.imageUrl || item.image;
      if (imagePath) {
        imageByItemId.set(uniqueItemIds[index], imagePath);
      }
    });

    return claims.map((claim) => {
      const existingImage = readClaimImagePath(claim);
      if (existingImage) {
        return claim;
      }

      const itemId = claim.item_id || claim.itemId;
      const fallbackImage = imageByItemId.get(itemId);
      if (!fallbackImage) {
        return claim;
      }

      return {
        ...claim,
        imageUrl: fallbackImage,
        image_url: fallbackImage
      };
    });
  };

  const loadClaims = async () => {
    try {
      const response = await securityAPI.getPendingClaims();
      const rawClaims = response.data?.claims || [];
      const claimsWithImages = await enrichClaimsWithItemImages(rawClaims);
      setClaims(claimsWithImages);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load pending claims');
      setClaims([]);
    } finally {
      setClaimsLoading(false);
    }
  };

  const getClaimImageUrl = (claim) => {
    const imagePath = readClaimImagePath(claim);
    if (!imagePath) {
      return '';
    }

    const normalized = String(imagePath).trim().replace(/\\/g, '/');
    if (!normalized || normalized === 'null' || normalized === 'undefined') {
      return '';
    }

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }

    const normalizedPath = normalized.replace(/\/+/g, '/').replace(/^\/+/, '');
    return `${API_ORIGIN}/${normalizedPath}`;
  };

  const handleOtpChange = (claimId, value) => {
    const numericOtp = value.replace(/\D/g, '').slice(0, 6);
    setOtpInputs((prev) => ({
      ...prev,
      [claimId]: numericOtp
    }));
  };

  const formatClaimDate = (claim) => {
    const dateValue = claim.claimed_at || claim.claimedAt;
    if (!dateValue) {
      return 'N/A';
    }

    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
  };

  const handleVerify = async (claim) => {
    const enteredOtp = (otpInputs[claim.id] || '').trim();
    if (!enteredOtp) {
      return;
    }

    setVerifyingClaimId(claim.id);
    try {
      await securityAPI.verifyClaim(claim.id, claim.item_id || claim.itemId, enteredOtp);

      setClaims((prevClaims) => prevClaims.filter((row) => row.id !== claim.id));
      setOtpInputs((prev) => {
        const next = { ...prev };
        delete next[claim.id];
        return next;
      });

      toast.success('Item released successfully');
      setShowSuccessPopup(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify claim');
    } finally {
      setVerifyingClaimId(null);
    }
  };

  const openImagePreview = (imageSrc, altText) => {
    setPreviewImage(imageSrc || '');
    setPreviewAlt(altText || 'Claim item');
    setIsPreviewOpen(true);
  };

  const closeImagePreview = () => {
    setIsPreviewOpen(false);
    setPreviewImage('');
  };

  if (claimsLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <h1>Security Dashboard</h1>

      <div className="found-items-section">
        <div className="section-header">
          <h2>Pending Claims</h2>
          <span>Total: {claims.length}</span>
        </div>

        {claims.length === 0 ? (
          <p>No pending claims.</p>
        ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Photo</th>
                <th>Claimant Name</th>
                <th>Location</th>
                <th>Date</th>
                <th>OTP Input</th>
                <th>Verify Button</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => {
                const enteredOtp = otpInputs[claim.id] || '';
                const isSubmitting = verifyingClaimId === claim.id;
                const claimImageUrl = brokenImageByClaimId[claim.id] ? '' : getClaimImageUrl(claim);
                return (
                  <tr key={claim.id}>
                    <td>{claim.item_name || claim.itemName || 'Unnamed Item'}</td>
                    <td>
                      {claimImageUrl ? (
                        <button
                          type="button"
                          onClick={() => openImagePreview(claimImageUrl, claim.item_name || claim.itemName || 'Claim item')}
                          aria-label="Preview claim item image"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            cursor: 'zoom-in',
                            borderRadius: '6px'
                          }}
                        >
                          <img
                            src={claimImageUrl}
                            alt={claim.item_name || claim.itemName || 'Claim item'}
                            style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px' }}
                            onError={() => {
                              setBrokenImageByClaimId((prev) => ({ ...prev, [claim.id]: true }));
                            }}
                          />
                        </button>
                      ) : (
                        <ThemePhotoPlaceholder />
                      )}
                    </td>
                    <td>{claim.full_name || claim.fullName || 'Unknown claimer'}</td>
                    <td>{claim.location || 'Unknown location'}</td>
                    <td>{formatClaimDate(claim)}</td>
                    <td>
                      <input
                        type="text"
                        placeholder="Enter OTP"
                        value={enteredOtp}
                        onChange={(e) => handleOtpChange(claim.id, e.target.value)}
                        maxLength="6"
                        style={{ minWidth: '120px' }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-primary btn-small"
                        disabled={!enteredOtp || isSubmitting}
                        onClick={() => handleVerify(claim)}
                      >
                        {isSubmitting ? 'Verifying...' : 'Verify OTP'}
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

      {showSuccessPopup && createPortal(
        <div className="modal-overlay" onClick={() => setShowSuccessPopup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Success</h2>
            <p>OTP Verified. Item Released Successfully</p>
            <div className="form-actions" style={{ marginTop: '1.5rem', justifyContent: 'center' }}>
              <button type="button" className="btn-primary" onClick={() => setShowSuccessPopup(false)}>
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isPreviewOpen && createPortal(
        <div className="modal-overlay" onClick={closeImagePreview}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95vw', width: '95vw', maxHeight: '92vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {previewImage && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => window.open(previewImage, '_blank', 'noopener,noreferrer')}
                  aria-label="Open full image"
                  title="Open full image"
                  style={{ minWidth: '44px', width: '44px', height: '44px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <polyline points="9 3 3 3 3 9" />
                    <line x1="3" y1="3" x2="10" y2="10" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <polyline points="3 15 3 21 9 21" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                    <polyline points="21 15 21 21 15 21" />
                    <line x1="21" y1="21" x2="14" y2="14" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="icon-close-btn"
                onClick={closeImagePreview}
                aria-label="Close image preview"
                title="Close"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            {previewImage ? (
              <img
                src={previewImage}
                alt={previewAlt}
                style={{ width: 'min(90vw, 1100px)', maxHeight: '78vh', objectFit: 'contain', borderRadius: '10px', display: 'block', margin: '0 auto' }}
                onError={() => {
                  setPreviewImage('');
                }}
              />
            ) : (
              <ThemePhotoPlaceholder modal />
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SecurityPendingClaims;
