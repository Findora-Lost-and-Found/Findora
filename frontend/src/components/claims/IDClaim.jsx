import { useState } from 'react';

const IDClaim = ({ item, idType, onSubmit, onCancel }) => {
  const [step, setStep] = useState('template');
  const [idNumber, setIdNumber] = useState('');

  const handleCollectClick = () => {
    setStep('verify');
  };

  const handleVerify = () => {
    if (!idNumber.trim()) {
      alert(`Please enter your ${idType} number`);
      return;
    }
    onSubmit({ idNumber, idType, itemId: item.id });
  };

  return (
    <div className="claim-form">
      {step === 'template' && (
        <>
          <h3>{idType} Verification</h3>
          <p style={{ color: '#6B7280' }}>
            Please verify your {idType} to claim this item.
          </p>

          <div className="template-image">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📇</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {idType}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                ID Card Template
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
          <h3>Verify Your {idType}</h3>
          <p style={{ color: '#6B7280' }}>
            Enter your {idType} number for verification.
          </p>

          <div className="form-group">
            <label htmlFor="id" className="required">{idType} Number</label>
            <input
              id="id"
              type="text"
              placeholder={`Enter your ${idType} number`}
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
            />
            <small style={{ color: '#9CA3AF' }}>
              Your complete {idType} number
            </small>
          </div>

          <div className="form-actions">
            <button className="btn-secondary" onClick={onCancel}>
              Back
            </button>
            <button className="btn-primary" onClick={handleVerify}>
              Verify ID
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default IDClaim;
