import { useState } from 'react';
import ClaimDetailsFields from './ClaimDetailsFields';
import {
  buildClaimDetailsPayload,
  createInitialClaimDetails,
  validateClaimDetails
} from './claimDetailsUtils';

const OtherItemClaim = ({ item, onSubmit, onCancel }) => {
  const [step, setStep] = useState('template');
  const [claimDetails, setClaimDetails] = useState(createInitialClaimDetails());
  const [errors, setErrors] = useState({});

  const handleCollectClick = () => {
    setStep('form');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClaimDetails((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      const nextErrors = validateClaimDetails({ ...claimDetails, [name]: value });
      setErrors(nextErrors);
    }
  };

  const handleSubmit = () => {
    const nextErrors = validateClaimDetails(claimDetails);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      itemId: item.id,
      ...buildClaimDetailsPayload(claimDetails),
      // Provide stable name context for backend similarity scoring.
      itemName: item?.name || item?.item_name || ''
    });
  };

  return (
    <div className="claim-form">
      {step === 'template' && (
        <>
          <h3>Claim Other Item</h3>
          <p style={{ color: '#6B7280' }}>
            Item: <strong>{item.name}</strong>
          </p>

          <div className="template-image">
            <div style={{ fontSize: '2rem' }}>📦</div>
          </div>

          <button className="btn-collect" onClick={handleCollectClick}>
            Continue to Details
          </button>
        </>
      )}

      {step === 'form' && (
        <>
          <h3>Claim Details</h3>

          <ClaimDetailsFields
            details={claimDetails}
            errors={errors}
            onChange={handleInputChange}
          />

          <div className="form-actions">
            <button className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSubmit}>
              Submit Claim
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default OtherItemClaim;
