import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { itemsAPI } from '../services/api';
import { toast } from 'react-toastify';
import {
  sanitizeNicInput,
  isValidNic,
  NIC_VALIDATION_MESSAGE,
  NIC_HELPER_TEXT
} from '../utils/nicUtils';
import {
  sanitizeStudentStaffIdInput,
  isValidStudentStaffId,
  STUDENT_STAFF_ID_VALIDATION_MESSAGE,
  STUDENT_STAFF_ID_HELPER_TEXT
} from '../utils/studentStaffIdUtils';
import './ReportFoundItem.css';

const CATEGORY_OPTIONS = [
  'NIC',
  'Student / Staff ID',
  'Bank Card',
  'Purse',
  'Others'
];

const SRI_LANKA_BANKS = [
  'Bank of Ceylon',
  'National Savings Bank',
  'People\'s Bank',
  'Pradeshiya Sanwardhana Bank (Regional Development Bank)',
  'Sri Lanka Savings Bank',
  'State Mortgage & Investment Bank',
  'Amana Bank',
  'Cargills Bank',
  'Commercial Bank of Ceylon',
  'DFCC Bank',
  'Hatton National Bank (HNB)',
  'Nations Trust Bank',
  'National Development Bank (NDB)',
  'Pan Asia Banking Corporation (PABC)',
  'Sampath Bank',
  'Sanasa Development Bank',
  'Seylan Bank',
  'Union Bank of Colombo',
  'Bank of China (Sri Lanka)',
  'Citibank (Sri Lanka)',
  'Deutsche Bank (Sri Lanka)',
  'Habib Bank (Sri Lanka)',
  'HSBC Sri Lanka',
  'Indian Bank (Sri Lanka)',
  'Indian Overseas Bank (Sri Lanka)',
  'MCB Bank (Sri Lanka)',
  'Public Bank Berhad (Sri Lanka)',
  'Standard Chartered (Sri Lanka)',
];

const ReportFoundItem = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [purseOption, setPurseOption] = useState('with-id');
  const [submitted, setSubmitted] = useState(false);
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
    bankPrivateLocation: '',
    bankPrivateDate: '',
    bankPrivateTime: '',
    cardCvv: '',
    purseName: '',
    purseIdNumber: '',
    purseMoney: '',
    purseOtherItems: '',
    pursePrivateLocation: '',
    pursePrivateDate: '',
    pursePrivateTime: '',
    otherPhoto: null,
    otherPrivateLocation: '',
    otherPrivateDate: '',
    otherPrivateTime: ''
  });

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setSubmitted(false);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'nicNumber') {
      const nicForTyping = String(value).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
      setFormData((prev) => ({ ...prev, nicNumber: nicForTyping }));
      return;
    }

    if (name === 'studentOrStaffId') {
      const idForTyping = String(value).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7);
      setFormData((prev) => ({ ...prev, studentOrStaffId: idForTyping }));
      return;
    }

    if (name === 'purseIdNumber') {
      const compact = String(value).toUpperCase().replace(/\s+/g, '');
      const asNic = sanitizeNicInput(compact);
      const nextValue = compact.length <= 7 ? sanitizeStudentStaffIdInput(compact) : asNic;
      setFormData((prev) => ({ ...prev, purseIdNumber: nextValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, otherPhoto: e.target.files?.[0] || null }));
  };

  const isFutureDate = (dateValue) => {
    if (!dateValue) return false;
    const selectedDate = new Date(dateValue);
    if (Number.isNaN(selectedDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    return selectedDate > today;
  };

  const isFutureTimeForDate = (dateValue, timeValue) => {
    if (!dateValue || !timeValue) return false;

    const [hours, minutes] = String(timeValue).split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return false;

    const selectedDateTime = new Date(dateValue);
    if (Number.isNaN(selectedDateTime.getTime())) return false;

    selectedDateTime.setHours(hours, minutes, 0, 0);
    return selectedDateTime > new Date();
  };

  const validate = () => {
    const nextErrors = {};
    const normalizedNic = sanitizeNicInput(formData.nicNumber);
    const normalizedStudentStaffId = sanitizeStudentStaffIdInput(formData.studentOrStaffId);
    const normalizedPurseId = String(formData.purseIdNumber).trim().toUpperCase();
    const purseIdLooksLikeStudentStaff = normalizedPurseId.length <= 7;
    const purseIdValid = purseIdLooksLikeStudentStaff
      ? isValidStudentStaffId(normalizedPurseId)
      : isValidNic(normalizedPurseId);

    if (!category) nextErrors.category = 'Please select a category.';

    if (category === 'NIC') {
      if (!formData.nicName.trim()) nextErrors.nicName = 'Name is required.';
      if (!formData.nicNumber.trim()) nextErrors.nicNumber = 'NIC Number is required.';
      else if (!isValidNic(normalizedNic)) nextErrors.nicNumber = NIC_VALIDATION_MESSAGE;
    }

    if (category === 'Student / Staff ID') {
      if (!formData.idName.trim()) nextErrors.idName = 'Name is required.';
      if (!formData.studentOrStaffId.trim()) nextErrors.studentOrStaffId = 'Student ID or Staff ID is required.';
      else if (!isValidStudentStaffId(normalizedStudentStaffId)) {
        nextErrors.studentOrStaffId = STUDENT_STAFF_ID_VALIDATION_MESSAGE;
      }
    }

    if (category === 'Bank Card') {
      if (!formData.cardType) nextErrors.cardType = 'Card Type is required.';
      if (!formData.bankName.trim()) nextErrors.bankName = 'Name of the Bank is required.';
      if (!/^\d{4}$/.test(formData.cardLast4.trim())) nextErrors.cardLast4 = 'Last 4 digits must be exactly 4 numbers.';
      if (!formData.bankPrivateLocation.trim()) nextErrors.bankPrivateLocation = 'Location is required.';
      if (!formData.bankPrivateDate) nextErrors.bankPrivateDate = 'Date is required.';
      else if (isFutureDate(formData.bankPrivateDate)) nextErrors.bankPrivateDate = 'Invalid date. Please select today or a past date.';
      if (!formData.bankPrivateTime) nextErrors.bankPrivateTime = 'Time is required.';
      else if (isFutureTimeForDate(formData.bankPrivateDate, formData.bankPrivateTime)) {
        nextErrors.bankPrivateTime = 'Invalid time. Please select the past time';
      }
    }

    if (category === 'Purse') {
      if (purseOption === 'with-id') {
        if (!formData.purseName.trim()) nextErrors.purseName = 'Name is required.';
        if (!formData.purseIdNumber.trim()) nextErrors.purseIdNumber = 'Student ID or NIC number is required.';
        else if (!purseIdValid) {
          nextErrors.purseIdNumber = 'Enter a valid NIC or Student/Staff ID.';
        }
      }

      if (purseOption === 'without-id') {
        if (!formData.purseMoney.trim()) nextErrors.purseMoney = 'Amount of money is required.';
        if (!formData.purseOtherItems.trim()) nextErrors.purseOtherItems = 'Other items inside purse are required.';
        if (!formData.pursePrivateLocation.trim()) nextErrors.pursePrivateLocation = 'Location is required.';
        if (!formData.pursePrivateDate) nextErrors.pursePrivateDate = 'Date is required.';
        else if (isFutureDate(formData.pursePrivateDate)) nextErrors.pursePrivateDate = 'Invalid date. Please select today or a past date.';
        if (!formData.pursePrivateTime) nextErrors.pursePrivateTime = 'Time is required.';
        else if (isFutureTimeForDate(formData.pursePrivateDate, formData.pursePrivateTime)) {
          nextErrors.pursePrivateTime = 'Invalid time. Please select the past time';
        }
      }
    }

    if (category === 'Others') {
      if (!formData.otherPhoto) nextErrors.otherPhoto = 'Photo upload is required.';
      if (!formData.otherPrivateLocation.trim()) nextErrors.otherPrivateLocation = 'Location is required.';
      if (!formData.otherPrivateDate) nextErrors.otherPrivateDate = 'Date is required.';
      else if (isFutureDate(formData.otherPrivateDate)) nextErrors.otherPrivateDate = 'Invalid date. Please select today or a past date.';
      if (!formData.otherPrivateTime) nextErrors.otherPrivateTime = 'Time is required.';
      else if (isFutureTimeForDate(formData.otherPrivateDate, formData.otherPrivateTime)) {
        nextErrors.otherPrivateTime = 'Invalid time. Please select the past time';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const mapCategoryToApi = (value) => {
    switch (value) {
      case 'NIC':
        return 'NIC';
      case 'Student / Staff ID':
        return 'Student ID';
      case 'Bank Card':
        return 'Bank Card';
      case 'Purse':
        return 'Wallet';
      default:
        return 'Other';
    }
  };

  const getDefaultDate = () => new Date().toISOString().slice(0, 10);
  const getDefaultTime = () => new Date().toTimeString().slice(0, 5);

  const buildFoundItemPayload = () => {
    const apiCategory = mapCategoryToApi(category);
    let item_name = 'Found Item';
    let description = '';
    let location = 'Security Office';
    let date = getDefaultDate();
    let time = getDefaultTime();
    let image = null;

    if (category === 'NIC') {
      item_name = `NIC - ${formData.nicName || 'Unknown'}`;
      description = `NIC Number: ${sanitizeNicInput(formData.nicNumber)}`;
    }

    if (category === 'Student / Staff ID') {
      item_name = `Student/Staff ID - ${formData.idName || 'Unknown'}`;
      description = `ID Number: ${sanitizeStudentStaffIdInput(formData.studentOrStaffId)}`;
    }

    if (category === 'Bank Card') {
      item_name = `${formData.bankName} ${formData.cardType} Card`;
      description = `Last 4 digits: ${formData.cardLast4 || 'N/A'}${formData.cardCvv ? ` | CVV (provided): ${formData.cardCvv}` : ''}`;
      location = formData.bankPrivateLocation || location;
      date = formData.bankPrivateDate || date;
      time = formData.bankPrivateTime || time;
    }

    if (category === 'Purse') {
      item_name = 'Purse / Wallet';
      if (purseOption === 'with-id') {
        const normalizedPurseId = String(formData.purseIdNumber).trim().toUpperCase();
        const compactPurseId = normalizedPurseId.length <= 7
          ? sanitizeStudentStaffIdInput(normalizedPurseId)
          : sanitizeNicInput(normalizedPurseId);
        description = `Claim with ID: ${compactPurseId}`;
      } else {
        description = `Items inside: ${formData.purseOtherItems || formData.purseMoney}`;
        location = formData.pursePrivateLocation || location;
        date = formData.pursePrivateDate || date;
        time = formData.pursePrivateTime || time;
      }
    }

    if (category === 'Others') {
      item_name = 'Other Found Item';
      description = 'General found item report';
      location = formData.otherPrivateLocation || location;
      date = formData.otherPrivateDate || date;
      time = formData.otherPrivateTime || time;
      image = formData.otherPhoto;
    }

    return {
      type: 'found',
      category: apiCategory,
      item_name,
      description,
      location,
      date,
      time,
      image
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = buildFoundItemPayload();
    console.log('Submitting found item payload:', {
      ...payload,
      image: payload.image ? payload.image.name : null
    });

    try {
      setLoading(true);
      const response = await itemsAPI.create(payload);
      console.log('Found item created successfully:', response.data);
      setSubmitted(true);
      toast.success('Found item reported successfully');

      // Refresh flow: redirect to listing where user can see newly posted found item.
      setTimeout(() => navigate('/found-items', { state: { refreshAt: Date.now() } }), 500);
    } catch (error) {
      console.error('Failed to create found item:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to report found item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-found-page">
      <div className="report-card">
        <h1>Report Found Item</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="required">Category</label>
            <select value={category} onChange={handleCategoryChange}>
              <option value="">Select category</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.category && <p className="error-text">{errors.category}</p>}
          </div>

          {category === 'NIC' && (
            <div className="category-section">
              <h3>NIC Details</h3>
              <div className="form-group">
                <label className="required">Name</label>
                <input name="nicName" value={formData.nicName} onChange={handleInputChange} />
                {errors.nicName && <p className="error-text">{errors.nicName}</p>}
              </div>
              <div className="form-group">
                <label className="required">NIC Number</label>
                <input
                  name="nicNumber"
                  value={formData.nicNumber}
                  onChange={handleInputChange}
                  maxLength="12"
                  autoComplete="off"
                  placeholder="e.g. 123456789V or 199001234567"
                />
                <small>{NIC_HELPER_TEXT}</small>
                {errors.nicNumber && <p className="error-text">{errors.nicNumber}</p>}
              </div>
            </div>
          )}

          {category === 'Student / Staff ID' && (
            <div className="category-section">
              <h3>Student / Staff ID Details</h3>
              <div className="form-group">
                <label className="required">Name</label>
                <input name="idName" value={formData.idName} onChange={handleInputChange} />
                {errors.idName && <p className="error-text">{errors.idName}</p>}
              </div>
              <div className="form-group">
                <label className="required">Student ID or Staff ID</label>
                <input
                  name="studentOrStaffId"
                  value={formData.studentOrStaffId}
                  onChange={handleInputChange}
                  maxLength="7"
                  autoComplete="off"
                  placeholder="e.g. 240574S"
                />
                <small>{STUDENT_STAFF_ID_HELPER_TEXT}</small>
                {errors.studentOrStaffId && <p className="error-text">{errors.studentOrStaffId}</p>}
              </div>
            </div>
          )}

          {category === 'Bank Card' && (
            <div className="category-section">
              <h3>Bank Card Details</h3>
              <div className="form-group">
                <label className="required">Card Type</label>
                <select name="cardType" value={formData.cardType} onChange={handleInputChange}>
                  <option value="">Select card type</option>
                  <option value="Credit">Credit</option>
                  <option value="Debit">Debit</option>
                  <option value="ATM">ATM</option>
                </select>
                {errors.cardType && <p className="error-text">{errors.cardType}</p>}
              </div>
              <div className="form-group">
                <label className="required">Name of the Bank</label>
                <select name="bankName" value={formData.bankName} onChange={handleInputChange}>
                  <option value="">Select a bank</option>
                  {SRI_LANKA_BANKS.map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
                {errors.bankName && <p className="error-text">{errors.bankName}</p>}
              </div>
              <div className="form-group">
                <label className="required">Card Number</label>
                <input
                  value={`#### #### #### ${formData.cardLast4}`}
                  onChange={(e) => {
                    const last4 = e.target.value.replace(/\D/g, '').slice(-4);
                    setFormData(prev => ({ ...prev, cardLast4: last4 }));
                  }}
                  inputMode="numeric"
                  placeholder="#### #### #### 1234"
                />
                <small>Example: #### #### #### 1234</small>
                {errors.cardLast4 && <p className="error-text">{errors.cardLast4}</p>}
              </div>

              <div className="private-block">
                <h4>Private Fields (not shown publicly)</h4>
                <div className="form-group">
                  <label className="required">Location</label>
                  <input name="bankPrivateLocation" value={formData.bankPrivateLocation} onChange={handleInputChange} />
                  {errors.bankPrivateLocation && <p className="error-text">{errors.bankPrivateLocation}</p>}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="required">Date</label>
                    <input type="date" name="bankPrivateDate" max={getDefaultDate()} value={formData.bankPrivateDate} onChange={handleInputChange} />
                    {errors.bankPrivateDate && <p className="error-text">{errors.bankPrivateDate}</p>}
                  </div>
                  <div className="form-group">
                    <label className="required">Time</label>
                    <input type="time" name="bankPrivateTime" value={formData.bankPrivateTime} onChange={handleInputChange} />
                    {errors.bankPrivateTime && <p className="error-text">{errors.bankPrivateTime}</p>}
                  </div>
                </div>
                <div className="form-group">
                  <label>CVV number (optional)</label>
                  <input name="cardCvv" value={formData.cardCvv} onChange={handleInputChange} maxLength={4} />
                </div>
              </div>
            </div>
          )}

          {category === 'Purse' && (
            <div className="category-section">
              <h3>Purse Details</h3>

              <div className="purse-options">
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
                <>
                  <div className="form-group">
                    <label className="required">Name</label>
                    <input name="purseName" value={formData.purseName} onChange={handleInputChange} />
                    {errors.purseName && <p className="error-text">{errors.purseName}</p>}
                  </div>
                  <div className="form-group">
                    <label className="required">Student ID or NIC number</label>
                    <input
                      name="purseIdNumber"
                      value={formData.purseIdNumber}
                      onChange={handleInputChange}
                      maxLength="12"
                      autoComplete="off"
                      placeholder="NIC or Student/Staff ID"
                    />
                    {errors.purseIdNumber && <p className="error-text">{errors.purseIdNumber}</p>}
                  </div>
                </>
              )}

              {purseOption === 'without-id' && (
                <div className="private-block">
                  <h4>Private Fields (not shown publicly)</h4>
                  <div className="form-group">
                    <label className="required">How much money is inside</label>
                    <input name="purseMoney" value={formData.purseMoney} onChange={handleInputChange} />
                    {errors.purseMoney && <p className="error-text">{errors.purseMoney}</p>}
                  </div>
                  <div className="form-group">
                    <label className="required">Other items inside the purse</label>
                    <textarea name="purseOtherItems" value={formData.purseOtherItems} onChange={handleInputChange} rows={3} />
                    {errors.purseOtherItems && <p className="error-text">{errors.purseOtherItems}</p>}
                  </div>
                  <div className="form-group">
                    <label className="required">Location</label>
                    <input name="pursePrivateLocation" value={formData.pursePrivateLocation} onChange={handleInputChange} />
                    {errors.pursePrivateLocation && <p className="error-text">{errors.pursePrivateLocation}</p>}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="required">Date</label>
                      <input type="date" name="pursePrivateDate" max={getDefaultDate()} value={formData.pursePrivateDate} onChange={handleInputChange} />
                      {errors.pursePrivateDate && <p className="error-text">{errors.pursePrivateDate}</p>}
                    </div>
                    <div className="form-group">
                      <label className="required">Time</label>
                      <input type="time" name="pursePrivateTime" value={formData.pursePrivateTime} onChange={handleInputChange} />
                      {errors.pursePrivateTime && <p className="error-text">{errors.pursePrivateTime}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {category === 'Others' && (
            <div className="category-section">
              <h3>Other Item Details</h3>

              <div className="form-group">
                <label className="required">Upload Photo of the item</label>
                <input type="file" accept="image/*" onChange={handleFileChange} />
                {errors.otherPhoto && <p className="error-text">{errors.otherPhoto}</p>}
              </div>

              <div className="private-block">
                <h4>Private Fields (not shown publicly)</h4>
                <div className="form-group">
                  <label className="required">Location</label>
                  <input name="otherPrivateLocation" value={formData.otherPrivateLocation} onChange={handleInputChange} />
                  {errors.otherPrivateLocation && <p className="error-text">{errors.otherPrivateLocation}</p>}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="required">Date</label>
                    <input type="date" name="otherPrivateDate" max={getDefaultDate()} value={formData.otherPrivateDate} onChange={handleInputChange} />
                    {errors.otherPrivateDate && <p className="error-text">{errors.otherPrivateDate}</p>}
                  </div>
                  <div className="form-group">
                    <label className="required">Time</label>
                    <input type="time" name="otherPrivateTime" value={formData.otherPrivateTime} onChange={handleInputChange} />
                    {errors.otherPrivateTime && <p className="error-text">{errors.otherPrivateTime}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>

        {submitted && (
          <div className="status-card success">
            <p>Item successfully reported. Redirecting to Found Items...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportFoundItem;
