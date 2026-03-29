import { useState } from 'react';
import ClaimDetailsFields from './ClaimDetailsFields';
import {
  buildClaimDetailsPayload,
  createInitialClaimDetails,
  validateClaimDetails
} from './claimDetailsUtils';

const PurseClaim = ({ item, onSubmit, onCancel }) => {
  const [step, setStep] = useState('template'); // template, select, withId, withoutId
  const [selectedOption, setSelectedOption] = useState(null);
  const [idNumber, setIdNumber] = useState('');
  const [claimDetails, setClaimDetails] = useState(createInitialClaimDetails());
  const [errors, setErrors] = useState({});

  const handleCollectClick = () => {
    setStep('select');
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    setStep(option === 'with-id' ? 'withId' : 'withoutId');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClaimDetails((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      const nextErrors = validateClaimDetails({ ...claimDetails, [name]: value });
      setErrors(nextErrors);
    }
  };

  const handleWithIdSubmit = () => {
    if (!idNumber.trim()) {
      alert('Please enter your ID number');
      return;
    }
    onSubmit({ idNumber, itemId: item.id, claimType: 'with-id' });
  };

  const handleWithoutIdSubmit = () => {
    const nextErrors = validateClaimDetails(claimDetails);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      itemId: item.id,
      claimType: 'without-id',
      ...buildClaimDetailsPayload(claimDetails)
    });
  };

  return (
    <div className="claim-form">
      {step === 'template' && (
        <>
          <h3>Purse/Wallet Claim</h3>
          <p style={{ color: '#6B7280' }}>
            Please verify to claim this purse or wallet.
          </p>

          <div className="template-image">
            <div style={{ fontSize: '3rem' }}>👛</div>
          </div>

          <button className="btn-collect" onClick={handleCollectClick}>
            Continue to Verification
          </button>
        </>
      )}

      {step === 'select' && (
        <>
          <h3>Select Verification Method</h3>
          <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
            How would you like to verify your purse/wallet?
          </p>

          <div className="options-container">
            <button
              className={`option-button ${selectedOption === 'with-id' ? 'active' : ''}`}
              onClick={() => handleOptionSelect('with-id')}
            >
              <div style={{ textAlign: 'left' }}>
                <strong>✓ With Student/Staff ID or NIC</strong>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#6B7280' }}>
                  Verify using your ID document
                </p>
              </div>
            </button>

            <button
              className={`option-button ${selectedOption === 'without-id' ? 'active' : ''}`}
              onClick={() => handleOptionSelect('without-id')}
            >
              <div style={{ textAlign: 'left' }}>
                <strong>✓ Without ID</strong>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#6B7280' }}>
                  Provide details about location and contents
                </p>
              </div>
            </button>
          </div>
        </>
      )}

      {step === 'withId' && (
        <>
          <h3>Verify with ID</h3>
          <p style={{ color: '#6B7280' }}>
            Enter your Student/Staff ID or NIC number.
          </p>

          <div className="form-group">
            <label htmlFor="id" className="required">ID Number (NIC or Student/Staff ID)</label>
            <input
              id="id"
              type="text"
              placeholder="Enter your ID number"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
            />
          </div>

          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setStep('select')}>
              Back
            </button>
            <button className="btn-primary" onClick={handleWithIdSubmit}>
              Verify & Claim
            </button>
          </div>
        </>
      )}

      {step === 'withoutId' && (
        <>
          <h3>Verify Purse/Wallet Details</h3>

          <ClaimDetailsFields
            details={claimDetails}
            errors={errors}
            onChange={handleInputChange}
          />

          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setStep('select')}>
              Back
            </button>
            <button className="btn-primary" onClick={handleWithoutIdSubmit}>
              Submit Claim
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PurseClaim;
