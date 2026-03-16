import { useState } from 'react';
import { isValidNicNumber, normalizeNicNumber } from '../../utils/nicUtils';

const NICClaim = ({ item, onSubmit, onCancel }) => {
  const [step, setStep] = useState('template'); // template, verify
  const [nicNumber, setNicNumber] = useState('');

  const handleCollectClick = () => {
    setStep('verify');
  };

  const handleVerify = () => {
    const normalizedNicNumber = normalizeNicNumber(nicNumber);

    if (!normalizedNicNumber) {
      alert('Please enter your NIC number');
      return;
    }

    if (!isValidNicNumber(normalizedNicNumber)) {
      alert('NIC must be 12 digits or 9 digits followed by V.');
      return;
    }

    onSubmit({ nicNumber: normalizedNicNumber, itemId: item.id });
  };

  return (
    <div className="claim-form">
      {step === 'template' && (
        <>
          <h3>NIC Claim Verification</h3>
          <p style={{ color: '#6B7280' }}>
            Please verify the last 4 digits of your NIC to claim this item.
          </p>
          
          <div className="template-image">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🆔</div>
              <div style={{ fontSize: '1.2rem', letterSpacing: '0.1em', fontWeight: 'bold' }}>
                XXXXXXXX1234
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#9CA3AF' }}>
                NIC Template (Last 4 digits visible)
              </div>
            </div>
          </div>

          <button className="btn-collect" onClick={handleCollectClick}>
            Continue to Verification
          </button>
        </>
      )}

      {step === 'verify' && (
        <>
          <h3>Verify Your NIC</h3>
          <p style={{ color: '#6B7280' }}>
            Enter your complete NIC number for verification.
          </p>

          <div className="form-group">
            <label htmlFor="nic" className="required">NIC Number</label>
            <input
              id="nic"
              type="text"
              placeholder="Enter your NIC number"
              value={nicNumber}
              onChange={(e) => setNicNumber(normalizeNicNumber(e.target.value))}
              maxLength="12"
            />
            <small style={{ color: '#9CA3AF' }}>
              Accepted formats: 200012345678 or 901234567V
            </small>
          </div>

          <div className="form-actions">
            <button className="btn-secondary" onClick={onCancel}>
              Back
            </button>
            <button className="btn-primary" onClick={handleVerify}>
              Verify NIC
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default NICClaim;
