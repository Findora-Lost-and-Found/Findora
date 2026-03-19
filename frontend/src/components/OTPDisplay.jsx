import { useState, useEffect } from 'react';

const OTPDisplay = ({ otp, onClose, category }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      setTimeout(() => setCopied(false), 2000);
    }
  }, [copied]);

  const handleCopyOTP = () => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
  };

  return (
    <div className="claim-form otp-display">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
        <h3>Claim Submitted Successfully!</h3>
        <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
          Your claim for this {category} has been submitted for verification.
        </p>

        <div className="otp-section">
          <p style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Your Verification OTP:
          </p>
          <div
            className="otp-box"
            style={{
              backgroundColor: '#ECFDF5',
              border: '2px solid #16A34A',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '1.8rem',
              fontWeight: 'bold',
              color: '#16A34A',
              letterSpacing: '0.3rem',
              fontFamily: 'monospace'
            }}
          >
            {otp}
          </div>
          <button className="btn-copy" onClick={handleCopyOTP}>
            {copied ? '✓ Copied!' : 'Copy OTP'}
          </button>
        </div>

        <div className="security-notice" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ color: '#1F2937', fontSize: '0.95rem', lineHeight: '1.6' }}>
            📍 <strong>Next Step:</strong> Please go to the <strong>Security Office</strong> with your OTP.
          </p>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            The security team will verify your claim and hand over the item.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            className="btn-primary"
            onClick={() => window.location.href = '/my-claims'}
          >
            View My Claims
          </button>
        </div>
      </div>
    </div>
  );
};

export default OTPDisplay;
