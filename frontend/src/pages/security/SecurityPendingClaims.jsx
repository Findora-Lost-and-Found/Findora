import { useEffect, useState } from 'react';
import { securityAPI } from '../../services/api';
import { toast } from 'react-toastify';

const SecurityPendingClaims = () => {
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [otpInputs, setOtpInputs] = useState({});
  const [verifyingClaimId, setVerifyingClaimId] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      const response = await securityAPI.getPendingClaims();
      setClaims(response.data?.claims || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load pending claims');
      setClaims([]);
    } finally {
      setClaimsLoading(false);
    }
  };

  const getClaimImageUrl = (claim) => {
    const imagePath = claim.image_url || claim.imageUrl;
    if (!imagePath) {
      return 'https://via.placeholder.com/80x80?text=No+Photo';
    }

    return `http://localhost:8080/${String(imagePath).replace(/^\/+/, '')}`;
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
                return (
                  <tr key={claim.id}>
                    <td>{claim.item_name || claim.itemName || 'Unnamed Item'}</td>
                    <td>
                      <img
                        src={getClaimImageUrl(claim)}
                        alt={claim.item_name || claim.itemName || 'Claim item'}
                        style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px' }}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/80x80?text=No+Photo';
                        }}
                      />
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

      {showSuccessPopup && (
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
        </div>
      )}
    </div>
  );
};

export default SecurityPendingClaims;
