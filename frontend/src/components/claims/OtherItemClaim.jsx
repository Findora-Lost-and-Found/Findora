import { useState } from 'react';

const OtherItemClaim = ({ item, onSubmit, onCancel }) => {
  const [step, setStep] = useState('template');
  const [formData, setFormData] = useState({
    location1: '',
    location2: '',
    location3: '',
    fromTime: '',
    toTime: '',
    foundFromDate: '',
    foundToDate: ''
  });

  const handleCollectClick = () => {
    setStep('form');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
    onSubmit({ ...formData, itemId: item.id });
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

          <div className="form-group">
            <label className="required">Where did you lose it?</label>
            <input
              type="text"
              name="location1"
              placeholder="Primary location"
              value={formData.location1}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="location2"
              placeholder="Secondary location (optional)"
              value={formData.location2}
              onChange={handleInputChange}
              style={{ marginTop: '0.5rem' }}
            />
            <input
              type="text"
              name="location3"
              placeholder="Additional details (optional)"
              value={formData.location3}
              onChange={handleInputChange}
              style={{ marginTop: '0.5rem' }}
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
            <label className="required">When was the item found? (approximate date range)</label>
            <div className="form-row">
              <div>
                <label style={{ fontSize: '0.9rem' }}>From Date</label>
                <input
                  type="date"
                  name="foundFromDate"
                  value={formData.foundFromDate}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.9rem' }}>To Date</label>
                <input
                  type="date"
                  name="foundToDate"
                  value={formData.foundToDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>
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

export default OtherItemClaim;
