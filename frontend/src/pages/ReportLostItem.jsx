import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { itemsAPI } from '../services/api';
import './ReportLostItem.css';

const CATEGORY_OPTIONS = ['NIC', 'Student / Staff ID', 'Bank Card', 'Purse / Wallet', 'Others'];

const ReportLostItem = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [purseOption, setPurseOption] = useState('with-id');
  const [submitted, setSubmitted] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    nicName: '',
    nicNumber: '',
    idName: '',
    studentOrStaffId: '',
    cardType: '',
    bankName: '',
    cardLast4: '',
    bankLocation1: '',
    bankLocation2: '',
    bankLocation3: '',
    bankDateLost: '',
    bankFromTime: '',
    bankToTime: '',
    cvv: '',
    pursePhoto: null,
    purseIdNumber: '',
    purseLocation1: '',
    purseLocation2: '',
    purseLocation3: '',
    purseDateLost: '',
    purseFromTime: '',
    purseToTime: '',
    purseItems1: '',
    purseItems2: '',
    purseItems3: '',
    otherPhoto: null,
    otherItemName: '',
    otherDescription: '',
    otherLocation1: '',
    otherLocation2: '',
    otherLocation3: '',
    otherDateLost: '',
    otherFromTime: '',
    otherToTime: ''
  });

  const requiresVerification = category !== 'Others' && category !== '';

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setSubmitted(false);
    setVerified(false);
    setOtp('');
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (name, file) => {
    setFormData((prev) => ({ ...prev, [name]: file || null }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!category) nextErrors.category = 'Please select a category.';

    if (category === 'NIC') {
      if (!formData.nicName.trim()) nextErrors.nicName = 'Name is required.';
      if (!formData.nicNumber.trim()) nextErrors.nicNumber = 'NIC Number is required.';
    }

    if (category === 'Student / Staff ID') {
      if (!formData.idName.trim()) nextErrors.idName = 'Name is required.';
      if (!formData.studentOrStaffId.trim()) nextErrors.studentOrStaffId = 'Student ID or Staff ID is required.';
    }

    if (category === 'Bank Card') {
      if (!formData.cardType) nextErrors.cardType = 'Card Type is required.';
      if (!formData.bankName.trim()) nextErrors.bankName = 'Name of the Bank is required.';
      if (formData.cardLast4.trim() && !/^\d{4}$/.test(formData.cardLast4.trim())) {
        nextErrors.cardLast4 = 'Last 4 digits must be exactly 4 numbers when provided.';
      }
      if (!formData.bankLocation1.trim()) nextErrors.bankLocation1 = 'Field 1 is required.';
      if (!formData.bankDateLost) nextErrors.bankDateLost = 'Date is required.';
      if (!formData.bankFromTime) nextErrors.bankFromTime = 'From time is required.';
      if (!formData.bankToTime) nextErrors.bankToTime = 'To time is required.';
    }

    if (category === 'Purse / Wallet') {
      if (purseOption === 'with-id') {
        if (!formData.purseIdNumber.trim()) nextErrors.purseIdNumber = 'NIC number or Student/Staff ID is required.';
      }

      if (purseOption === 'without-id') {
        if (!formData.purseLocation1.trim()) nextErrors.purseLocation1 = 'Field 1 is required.';
        if (!formData.purseDateLost) nextErrors.purseDateLost = 'Date is required.';
        if (!formData.purseFromTime) nextErrors.purseFromTime = 'From time is required.';
        if (!formData.purseToTime) nextErrors.purseToTime = 'To time is required.';
        if (!formData.purseItems1.trim()) nextErrors.purseItems1 = 'At least one item is required.';
      }
    }

    if (category === 'Others') {
      if (!formData.otherItemName.trim()) nextErrors.otherItemName = 'Item name is required.';
      if (!formData.otherLocation1.trim()) nextErrors.otherLocation1 = 'Field 1 is required.';
      if (!formData.otherDateLost) nextErrors.otherDateLost = 'Date is required.';
      if (!formData.otherFromTime) nextErrors.otherFromTime = 'From time is required.';
      if (!formData.otherToTime) nextErrors.otherToTime = 'To time is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitLostItem();
  };

  const mapCategoryToApi = (value) => {
    switch (value) {
      case 'NIC':
        return 'NIC';
      case 'Student / Staff ID':
        return 'Student ID';
      case 'Bank Card':
        return 'Bank Card';
      case 'Purse / Wallet':
        return 'Wallet';
      default:
        return 'Other';
    }
  };

  const getDefaultDate = () => new Date().toISOString().slice(0, 10);
  const getDefaultTime = () => new Date().toTimeString().slice(0, 5);

  const buildLostItemPayload = () => {
    const apiCategory = mapCategoryToApi(category);
    let item_name = 'Lost Item';
    let description = '';
    let location = 'Campus';
    let date = getDefaultDate();
    let time = getDefaultTime();
    let image = null;

    if (category === 'NIC') {
      item_name = `NIC - ${formData.nicName || 'Unknown'}`;
      description = `NIC Number: ${formData.nicNumber}`;
    }

    if (category === 'Student / Staff ID') {
      item_name = `Student/Staff ID - ${formData.idName || 'Unknown'}`;
      description = `ID Number: ${formData.studentOrStaffId}`;
    }

    if (category === 'Bank Card') {
      item_name = `${formData.bankName} ${formData.cardType} Card`;
      description = `Last 4 digits: ${formData.cardLast4 || 'N/A'}${formData.cvv ? ` | CVV (remembered): ${formData.cvv}` : ''}`;
      location = formData.bankLocation1 || location;
      date = formData.bankDateLost || date;
      time = formData.bankFromTime || time;
    }

    if (category === 'Purse / Wallet') {
      item_name = 'Purse / Wallet';
      if (purseOption === 'with-id') {
        description = `Claim with ID: ${formData.purseIdNumber}`;
      } else {
        description = `Items inside: ${formData.purseItems1 || ''}${formData.purseItems2 ? `, ${formData.purseItems2}` : ''}${formData.purseItems3 ? `, ${formData.purseItems3}` : ''}`;
        location = formData.purseLocation1 || location;
        date = formData.purseDateLost || date;
        time = formData.purseFromTime || time;
      }
      image = formData.pursePhoto;
    }

    if (category === 'Others') {
      item_name = formData.otherItemName || 'Other Lost Item';
      description = formData.otherDescription || 'General lost item report';
      location = formData.otherLocation1 || location;
      date = formData.otherDateLost || date;
      time = formData.otherFromTime || time;
      image = formData.otherPhoto;
    }

    return {
      type: 'lost',
      category: apiCategory,
      item_name,
      description,
      location,
      date,
      time,
      image
    };
  };

  const submitLostItem = async () => {
    if (!validate()) return;

    const payload = buildLostItemPayload();

    try {
      setLoading(true);
      await itemsAPI.create(payload);
      setSubmitted(true);
      setVerified(false);
      setOtp('');
      toast.success('Lost item reported successfully');

      setTimeout(() => {
        navigate('/lost-items', { state: { refreshAt: Date.now() } });
      }, 500);
    } catch (error) {
      console.error('Failed to create lost item:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to report lost item');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = () => {
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtp(generatedOtp);
    setVerified(true);
  };

  return (
    <div className="report-lost-page">
      <div className="report-lost-card">
        <h1>Report Lost Item</h1>

        <form onSubmit={handleSubmit}>
          <div className="report-lost-form-group">
            <label className="required">Category</label>
            <select value={category} onChange={handleCategoryChange}>
              <option value="">Select category</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.category && <p className="report-lost-error">{errors.category}</p>}
          </div>

          {category === 'NIC' && (
            <div className="report-lost-section">
              <h3>NIC</h3>
              <div className="report-lost-form-group">
                <label className="required">Name</label>
                <input name="nicName" value={formData.nicName} onChange={handleInputChange} />
                {errors.nicName && <p className="report-lost-error">{errors.nicName}</p>}
              </div>
              <div className="report-lost-form-group">
                <label className="required">NIC Number</label>
                <input name="nicNumber" value={formData.nicNumber} onChange={handleInputChange} />
                {errors.nicNumber && <p className="report-lost-error">{errors.nicNumber}</p>}
              </div>
            </div>
          )}

          {category === 'Student / Staff ID' && (
            <div className="report-lost-section">
              <h3>Student / Staff ID</h3>
              <div className="report-lost-form-group">
                <label className="required">Name</label>
                <input name="idName" value={formData.idName} onChange={handleInputChange} />
                {errors.idName && <p className="report-lost-error">{errors.idName}</p>}
              </div>
              <div className="report-lost-form-group">
                <label className="required">Student ID or Staff ID</label>
                <input name="studentOrStaffId" value={formData.studentOrStaffId} onChange={handleInputChange} />
                {errors.studentOrStaffId && <p className="report-lost-error">{errors.studentOrStaffId}</p>}
              </div>
            </div>
          )}

          {category === 'Bank Card' && (
            <div className="report-lost-section">
              <h3>Bank Card</h3>
              <div className="report-lost-form-group">
                <label className="required">Card Type</label>
                <select name="cardType" value={formData.cardType} onChange={handleInputChange}>
                  <option value="">Select card type</option>
                  <option value="Credit">Credit</option>
                  <option value="Debit">Debit</option>
                  <option value="ATM">ATM</option>
                </select>
                {errors.cardType && <p className="report-lost-error">{errors.cardType}</p>}
              </div>
              <div className="report-lost-form-group">
                <label className="required">Name of the Bank</label>
                <input name="bankName" value={formData.bankName} onChange={handleInputChange} />
                {errors.bankName && <p className="report-lost-error">{errors.bankName}</p>}
              </div>
              <div className="report-lost-form-group">
                <label>Last 4 digits of the card number (optional)</label>
                <input name="cardLast4" value={formData.cardLast4} onChange={handleInputChange} maxLength={4} />
                {errors.cardLast4 && <p className="report-lost-error">{errors.cardLast4}</p>}
              </div>

              <div className="report-lost-private">
                <h4>Where did you lose it?</h4>
                <div className="report-lost-form-group">
                  <label className="required">Field 1</label>
                  <input name="bankLocation1" value={formData.bankLocation1} onChange={handleInputChange} />
                  {errors.bankLocation1 && <p className="report-lost-error">{errors.bankLocation1}</p>}
                </div>
                <div className="report-lost-form-group">
                  <label>Field 2 (optional)</label>
                  <input name="bankLocation2" value={formData.bankLocation2} onChange={handleInputChange} />
                </div>
                <div className="report-lost-form-group">
                  <label>Field 3 (optional)</label>
                  <input name="bankLocation3" value={formData.bankLocation3} onChange={handleInputChange} />
                </div>

                <div className="report-lost-form-group">
                  <label className="required">What date did you lose it?</label>
                  <input type="date" name="bankDateLost" value={formData.bankDateLost} onChange={handleInputChange} />
                  {errors.bankDateLost && <p className="report-lost-error">{errors.bankDateLost}</p>}
                </div>

                <div className="report-lost-form-group">
                  <label className="required">What time span did you lose it?</label>
                  <div className="report-lost-row">
                    <div>
                      <label>From</label>
                      <input type="time" name="bankFromTime" value={formData.bankFromTime} onChange={handleInputChange} />
                      {errors.bankFromTime && <p className="report-lost-error">{errors.bankFromTime}</p>}
                    </div>
                    <div>
                      <label>To</label>
                      <input type="time" name="bankToTime" value={formData.bankToTime} onChange={handleInputChange} />
                      {errors.bankToTime && <p className="report-lost-error">{errors.bankToTime}</p>}
                    </div>
                  </div>
                </div>

                <div className="report-lost-form-group">
                  <label>CVV number if you remember (optional)</label>
                  <input name="cvv" value={formData.cvv} onChange={handleInputChange} maxLength={4} />
                </div>
              </div>
            </div>
          )}

          {category === 'Purse / Wallet' && (
            <div className="report-lost-section">
              <h3>Purse / Wallet</h3>

              <div className="report-lost-options">
                <label>
                  <input
                    type="radio"
                    name="purseOption"
                    value="with-id"
                    checked={purseOption === 'with-id'}
                    onChange={(e) => setPurseOption(e.target.value)}
                  />
                  With Student / Staff ID or NIC
                </label>
                <label>
                  <input
                    type="radio"
                    name="purseOption"
                    value="without-id"
                    checked={purseOption === 'without-id'}
                    onChange={(e) => setPurseOption(e.target.value)}
                  />
                  Without Student / Staff ID or NIC
                </label>
              </div>

              {purseOption === 'with-id' && (
                <div className="report-lost-form-group">
                  <label className="required">Enter NIC number or Student/Staff ID</label>
                  <input name="purseIdNumber" value={formData.purseIdNumber} onChange={handleInputChange} />
                  {errors.purseIdNumber && <p className="report-lost-error">{errors.purseIdNumber}</p>}
                </div>
              )}

              {purseOption === 'without-id' && (
                <div className="report-lost-private">
                  <h4>Where did you lose it?</h4>
                  <div className="report-lost-form-group">
                    <label className="required">Field 1</label>
                    <input name="purseLocation1" value={formData.purseLocation1} onChange={handleInputChange} />
                    {errors.purseLocation1 && <p className="report-lost-error">{errors.purseLocation1}</p>}
                  </div>
                  <div className="report-lost-form-group">
                    <label>Field 2 (optional)</label>
                    <input name="purseLocation2" value={formData.purseLocation2} onChange={handleInputChange} />
                  </div>
                  <div className="report-lost-form-group">
                    <label>Field 3 (optional)</label>
                    <input name="purseLocation3" value={formData.purseLocation3} onChange={handleInputChange} />
                  </div>

                  <div className="report-lost-form-group">
                    <label className="required">What date did you lose it?</label>
                    <input type="date" name="purseDateLost" value={formData.purseDateLost} onChange={handleInputChange} />
                    {errors.purseDateLost && <p className="report-lost-error">{errors.purseDateLost}</p>}
                  </div>

                  <div className="report-lost-form-group">
                    <label className="required">What time span did you lose it?</label>
                    <div className="report-lost-row">
                      <div>
                        <label>From</label>
                        <input type="time" name="purseFromTime" value={formData.purseFromTime} onChange={handleInputChange} />
                        {errors.purseFromTime && <p className="report-lost-error">{errors.purseFromTime}</p>}
                      </div>
                      <div>
                        <label>To</label>
                        <input type="time" name="purseToTime" value={formData.purseToTime} onChange={handleInputChange} />
                        {errors.purseToTime && <p className="report-lost-error">{errors.purseToTime}</p>}
                      </div>
                    </div>
                  </div>

                  <h4>What items were inside the purse?</h4>
                  <div className="report-lost-form-group">
                    <label className="required">Field 1</label>
                    <input name="purseItems1" value={formData.purseItems1} onChange={handleInputChange} />
                    {errors.purseItems1 && <p className="report-lost-error">{errors.purseItems1}</p>}
                  </div>
                  <div className="report-lost-form-group">
                    <label>Field 2 (optional)</label>
                    <input name="purseItems2" value={formData.purseItems2} onChange={handleInputChange} />
                  </div>
                  <div className="report-lost-form-group">
                    <label>Field 3 (optional)</label>
                    <input name="purseItems3" value={formData.purseItems3} onChange={handleInputChange} />
                  </div>
                </div>
              )}
            </div>
          )}

          {category === 'Others' && (
            <div className="report-lost-section">
              <h3>Others</h3>

              <div className="report-lost-form-group">
                <label className="required">Item Name</label>
                <input
                  name="otherItemName"
                  value={formData.otherItemName}
                  onChange={handleInputChange}
                  placeholder="e.g. Black backpack, Umbrella, Keys..."
                />
                {errors.otherItemName && <p className="report-lost-error">{errors.otherItemName}</p>}
              </div>

              <div className="report-lost-form-group">
                <label>Description (optional)</label>
                <textarea
                  name="otherDescription"
                  value={formData.otherDescription}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe the item in detail (colour, size, brand, etc.)"
                />
              </div>

              <div className="report-lost-form-group">
                <label>Item Photo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange('otherPhoto', e.target.files?.[0])}
                />
              </div>

              <h4>Where did you lose it?</h4>
              <div className="report-lost-form-group">
                <label className="required">Field 1</label>
                <input name="otherLocation1" value={formData.otherLocation1} onChange={handleInputChange} />
                {errors.otherLocation1 && <p className="report-lost-error">{errors.otherLocation1}</p>}
              </div>
              <div className="report-lost-form-group">
                <label>Field 2 (optional)</label>
                <input name="otherLocation2" value={formData.otherLocation2} onChange={handleInputChange} />
              </div>
              <div className="report-lost-form-group">
                <label>Field 3 (optional)</label>
                <input name="otherLocation3" value={formData.otherLocation3} onChange={handleInputChange} />
              </div>

              <div className="report-lost-form-group">
                <label className="required">Date lost</label>
                <input type="date" name="otherDateLost" value={formData.otherDateLost} onChange={handleInputChange} />
                {errors.otherDateLost && <p className="report-lost-error">{errors.otherDateLost}</p>}
              </div>

              <div className="report-lost-form-group">
                <label className="required">Time span</label>
                <div className="report-lost-row">
                  <div>
                    <label>From</label>
                    <input type="time" name="otherFromTime" value={formData.otherFromTime} onChange={handleInputChange} />
                    {errors.otherFromTime && <p className="report-lost-error">{errors.otherFromTime}</p>}
                  </div>
                  <div>
                    <label>To</label>
                    <input type="time" name="otherToTime" value={formData.otherToTime} onChange={handleInputChange} />
                    {errors.otherToTime && <p className="report-lost-error">{errors.otherToTime}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="report-lost-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>

        {submitted && (
          <div className="report-lost-status notify">
            <p>We will notify you.</p>
            {requiresVerification && !verified && (
              <button className="btn-primary" onClick={handleVerify}>Verify</button>
            )}
          </div>
        )}

        {verified && otp && (
          <div className="report-lost-status otp">
            <p>OTP for security: <strong>{otp}</strong></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportLostItem;
