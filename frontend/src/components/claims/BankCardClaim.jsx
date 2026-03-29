import { useState } from 'react';
import {
  formatCardNumber,
  getCardCursorPosition,
  normalizeCardNumber
} from '../../utils/cardUtils';
import ClaimDetailsFields from './ClaimDetailsFields';
import {
  buildClaimDetailsPayload,
  createInitialClaimDetails,
  validateClaimDetails
} from './claimDetailsUtils';

const BankCardClaim = ({ item, onSubmit, onCancel }) => {
  const [step, setStep] = useState('template');
  const [claimDetails, setClaimDetails] = useState(createInitialClaimDetails());
  const [formData, setFormData] = useState({ cardNumber: '' });
  const [errors, setErrors] = useState({});

  const handleCollectClick = () => {
    setStep('form');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const inputEl = e.target;
    const nextValue = name === 'cardNumber'
      ? formatCardNumber(value)
      : value;

    if (name === 'cardNumber') {
      const cursor = inputEl.selectionStart ?? value.length;
      const digitsBeforeCursor = value.slice(0, cursor).replace(/\D/g, '').length;

      requestAnimationFrame(() => {
        const nextCursor = getCardCursorPosition(nextValue, digitsBeforeCursor);
        inputEl.setSelectionRange(nextCursor, nextCursor);
      });
    }

    setFormData({ ...formData, [name]: nextValue });
  };

  const handleDetailsChange = (e) => {
    const { name, value } = e.target;
    setClaimDetails((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      const nextErrors = validateClaimDetails({ ...claimDetails, [name]: value });
      setErrors(nextErrors);
    }
  };

  const handleSubmit = () => {
    const nextErrors = validateClaimDetails(claimDetails);
    const normalizedCardNumber = normalizeCardNumber(formData.cardNumber);
    if (!/^\d{16}$/.test(normalizedCardNumber)) {
      nextErrors.cardNumber = 'Please enter a valid full 16-digit card number';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      itemId: item.id,
      cardNumber: normalizedCardNumber,
      ...buildClaimDetailsPayload(claimDetails)
    });
  };

  return (
    <div className="claim-form">
      {step === 'template' && (
        <>
          <h3>Bank Card Claim</h3>
          <p style={{ color: '#6B7280' }}>
            Please provide details to verify and claim this bank card.
          </p>

          <div className="template-image">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💳</div>
              <div style={{ fontSize: '1.2rem', letterSpacing: '0.2em', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                **** **** **** 1234
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                Bank Card (Masked Number)
              </div>
            </div>
          </div>

          <button className="btn-collect" onClick={handleCollectClick}>
            Continue to Details
          </button>
        </>
      )}

      {step === 'form' && (
        <>
          <h3>Verify Card Details</h3>

          <ClaimDetailsFields
            details={claimDetails}
            errors={errors}
            onChange={handleDetailsChange}
          />

          <div className="form-group">
            <label htmlFor="cardNumber" className="required">Full Card Number</label>
            <input
              id="cardNumber"
              type="text"
              name="cardNumber"
              placeholder="xxxx xxxx xxxx xxxx"
              value={formData.cardNumber}
              onChange={handleInputChange}
              maxLength="19"
              autoComplete="off"
              inputMode="numeric"
              pattern="[0-9 ]*"
              className={errors.cardNumber ? 'input-invalid' : ''}
            />
            {errors.cardNumber && <small className="field-error">{errors.cardNumber}</small>}
          </div>

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

export default BankCardClaim;
