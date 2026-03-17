import React, { useState } from 'react';

const PurseClaim = ({ item, onSubmit, onCancel }) => {
  const [step, setStep] = useState('template'); // template, select, withId, withoutId
  const [selectedOption, setSelectedOption] = useState(null);
  const [idNumber, setIdNumber] = useState('');
  const [formData, setFormData] = useState({
    location1: '',
    location2: '',
    location3: '',
    fromTime: '',
    toTime: '',
    items1: '',
    items2: '',
    items3: '',
    foundFromDate: '',
    foundToDate: ''
  });

  const handleCollectClick = () => {
    setStep('select');
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    setStep(option === 'with-id' ? 'withId' : 'withoutId');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleWithIdSubmit = () => {
    if (!idNumber.trim()) {
      alert('Please enter your ID number');
      return;
    }
    onSubmit({ idNumber, itemId: item.id, claimType: 'with-id' });
  };

  const handleWithoutIdSubmit = () => {
    if (!formData.location1.trim() || !formData.items1.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    if (!formData.foundFromDate) {
      alert('Please enter the date you lost the item');
      return;
    }
    onSubmit({ ...formData, itemId: item.id, claimType: 'without-id' });
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
            <label className="required">What items were inside?</label>
            <input
              type="text"
              name="items1"
              placeholder="Main item (required)"
              value={formData.items1}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="items2"
              placeholder="Another item (optional)"
              value={formData.items2}
              onChange={handleInputChange}
              style={{ marginTop: '0.5rem' }}
            />
            <input
              type="text"
              name="items3"
              placeholder="Additional item (optional)"
              value={formData.items3}
              onChange={handleInputChange}
              style={{ marginTop: '0.5rem' }}
            />
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
