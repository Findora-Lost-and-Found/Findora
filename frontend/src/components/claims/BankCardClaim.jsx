import { useState } from 'react';

const BankCardClaim = ({ item, onSubmit, onCancel }) => {
  const [step, setStep] = useState('template');
  const [formData, setFormData] = useState({
    location1: '',
    fromTime: '',
    toTime: '',
    cardNumber: '',
    foundFromDate: '',
  });

  const handleCollectClick = () => {
    setStep('form');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'cardNumber'
      ? String(value).replace(/\D/g, '').slice(0, 16)
      : value;
    setFormData({ ...formData, [name]: nextValue });
  };

  const handleSubmit = () => {
    if (!formData.location1.trim() || !formData.fromTime || !formData.toTime) {
      alert('Please fill in all required fields');
      return;
    }
    if (!formData.foundFromDate) {
      alert('Please enter the date you lost the item');
      return;
    }
    if (!/^\d{16}$/.test(formData.cardNumber)) {
      alert('Please enter a valid full 16-digit card number');
      return;
    }
    onSubmit({
      itemId: item.id,
      cardNumber: formData.cardNumber,
      location1: formData.location1,
      fromTime: formData.fromTime,
      toTime: formData.toTime,
      foundFromDate: formData.foundFromDate
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
                XXXXXXXX1234
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

          <div className="form-group">
            <label className="required">Where did you lose it?</label>
            <input
              type="text"
              name="location1"
              placeholder="Primary location"
              value={formData.location1}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label className="required">Time Span</label>
            <div className="form-row">
              <div>
                <label style={{ fontSize: '0.9rem' }}>From Time</label>
                <input
                  type="time"
                  name="fromTime"
                  value={formData.fromTime}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.9rem' }}>To Time</label>
                <input
                  type="time"
                  name="toTime"
                  value={formData.toTime}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="required">When was the item lost?</label>
            <input
              type="date"
              name="foundFromDate"
              value={formData.foundFromDate}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cardNumber" className="required">Full Card Number</label>
            <input
              id="cardNumber"
              type="text"
              name="cardNumber"
              placeholder="Enter full 16-digit card number"
              value={formData.cardNumber}
              onChange={handleInputChange}
              maxLength="16"
              inputMode="numeric"
            />
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
