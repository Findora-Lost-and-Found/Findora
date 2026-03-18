import { useState } from 'react';
import './MatchCard.css';

const MatchCard = ({ match, otpValue, onOtpChange, onClaimViaOtp, onResendOtp }) => {
  const found = match?.foundItem || {};
  const score = Number(match?.score || 0).toFixed(2);
  const threshold = match?.threshold || 70;
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

  const handleOtpSubmit = () => {
    const otp = String(otpValue || '').trim();
    if (!otp) {
      return;
    }

    onClaimViaOtp(match.matchId, otp);
    setIsOtpModalOpen(false);
  };

  return (
    <div className="match-card">
      <div className="match-card-header">
        <h4>{found.name || 'Possible match'}</h4>
        <span className={`score-badge score-${threshold}`}>{score}%</span>
      </div>

      <div className="match-card-body">
        <p><strong>Category:</strong> {found.category || 'N/A'}</p>
        <p><strong>Location:</strong> {found.location || 'Unknown'}</p>
        <p><strong>Status:</strong> {match?.status || 'PENDING'}</p>
      </div>

      <div className="match-card-actions">
        <button type="button" className="btn btn-primary" onClick={() => setIsOtpModalOpen(true)}>
          Claim via Match (enter OTP)
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => onResendOtp(match.matchId)}>
          Resend OTP
        </button>
      </div>

      {isOtpModalOpen && (
        <div className="modal-overlay" onClick={() => setIsOtpModalOpen(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            {/* Keep the OTP entry isolated so users cannot accidentally bypass the match flow. */}
            <h3>Enter Match OTP</h3>
            <p>Please enter the OTP from your match notification to create the claim.</p>
            <div className="match-otp-row" style={{ marginTop: '1rem' }}>
              <input
                type="text"
                maxLength={6}
                placeholder="Enter OTP"
                value={otpValue || ''}
                onChange={(event) => onOtpChange(match.matchId, event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
            <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsOtpModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-claim" onClick={handleOtpSubmit}>
                Submit OTP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchCard;
