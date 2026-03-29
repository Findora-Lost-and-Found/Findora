import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './MatchCard.css';

const MatchCard = ({ match, otpValue, onOtpChange, onClaimViaOtp, onResendOtp }) => {
  const found = match?.foundItem || {};
  const score = Number(match?.score || 0).toFixed(2);
  const threshold = match?.threshold || 70;
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

  useEffect(() => {
    if (!isOtpModalOpen) return undefined;

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
  }, [isOtpModalOpen]);

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

      {isOtpModalOpen && createPortal(
        <div className="match-modal-root" onClick={() => setIsOtpModalOpen(false)}>
          <div className="match-modal-panel" role="dialog" aria-modal="true" aria-labelledby="match-otp-title" onClick={(event) => event.stopPropagation()}>
            {/* Keep the OTP entry isolated so users cannot accidentally bypass the match flow. */}
            <h3 id="match-otp-title">Enter Match OTP</h3>
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default MatchCard;
