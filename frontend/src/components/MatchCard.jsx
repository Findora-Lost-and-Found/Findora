import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './MatchCard.css';

const MatchCard = ({ match, otpValue, onOtpChange, onClaimViaOtp, onResendOtp }) => {
  const found = match?.foundItem || {};
  const numericScore = Number(match?.score || 0);
  const score = numericScore.toFixed(2);
  const threshold = match?.threshold || 70;
  const otpEligible = typeof match?.otpEligible === 'boolean'
    ? match.otpEligible
    : numericScore >= 75;
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
        <p><strong>Status:</strong> {match?.status || 'PENDING'}</p>
      </div>

      <div className="match-card-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => otpEligible && setIsOtpModalOpen(true)}
          disabled={!otpEligible}
          title={!otpEligible ? 'OTP claim is enabled only for scores above 75%' : undefined}
        >
          Claim via Match (enter OTP)
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => otpEligible && onResendOtp(match.matchId)}
          disabled={!otpEligible}
          title={!otpEligible ? 'OTP resend is not available for possible-only matches' : undefined}
        >
          Resend OTP
        </button>
      </div>

      {!otpEligible && (
        <p style={{ marginTop: '0.6rem', color: '#6c757d', fontSize: '0.9rem' }}>
          Can't claim. The matching is too low.
        </p>
      )}

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
