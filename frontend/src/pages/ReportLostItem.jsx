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
import './ReportLostItem.css';

const CATEGORY_OPTIONS = ['NIC', 'Student / Staff ID', 'Bank Card', 'Purse / Wallet', 'Others'];

const SRI_LANKA_BANKS = [
  // State / Government Banks
  'Bank of Ceylon',
  'National Savings Bank',
  'People\'s Bank',
  'Pradeshiya Sanwardhana Bank (Regional Development Bank)',
  'Sri Lanka Savings Bank',
  'State Mortgage & Investment Bank',

  // Private Licensed Commercial Banks
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

  // Foreign Banks
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

  const handleFileChange = (name, file) => {
    setFormData((prev) => ({ ...prev, [name]: file || null }));
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
      if (!formData.bankLocation1.trim()) nextErrors.bankLocation1 = 'Field 1 is required.';
      if (!formData.bankDateLost) nextErrors.bankDateLost = 'Date is required.';
      else if (isFutureDate(formData.bankDateLost)) nextErrors.bankDateLost = 'Invalid date. Please select today or a past date.';
      if (!formData.bankFromTime) nextErrors.bankFromTime = 'From time is required.';
      else if (isFutureTimeForDate(formData.bankDateLost, formData.bankFromTime)) {
        nextErrors.bankFromTime = 'Invalid time. Please select the past time';
      }
      if (!formData.bankToTime) nextErrors.bankToTime = 'To time is required.';
      else if (isFutureTimeForDate(formData.bankDateLost, formData.bankToTime)) {
        nextErrors.bankToTime = 'Invalid time. Please select the past time';
      }
    }

    if (category === 'Purse / Wallet') {
      if (purseOption === 'with-id') {
        if (!formData.purseIdNumber.trim()) nextErrors.purseIdNumber = 'NIC number or Student/Staff ID is required.';
        else if (!purseIdValid) {
          nextErrors.purseIdNumber = 'Enter a valid NIC or Student/Staff ID.';
        }
      }

      if (purseOption === 'without-id') {
        if (!formData.purseLocation1.trim()) nextErrors.purseLocation1 = 'Field 1 is required.';
        if (!formData.purseDateLost) nextErrors.purseDateLost = 'Date is required.';
        else if (isFutureDate(formData.purseDateLost)) nextErrors.purseDateLost = 'Invalid date. Please select today or a past date.';
        if (!formData.purseFromTime) nextErrors.purseFromTime = 'From time is required.';
        else if (isFutureTimeForDate(formData.purseDateLost, formData.purseFromTime)) {
          nextErrors.purseFromTime = 'Invalid time. Please select the past time';
        }
        if (!formData.purseToTime) nextErrors.purseToTime = 'To time is required.';
        else if (isFutureTimeForDate(formData.purseDateLost, formData.purseToTime)) {
          nextErrors.purseToTime = 'Invalid time. Please select the past time';
        }
        if (!formData.purseItems1.trim()) nextErrors.purseItems1 = 'At least one item is required.';
      }
    }

    if (category === 'Others') {
      if (!formData.otherLocation1.trim()) nextErrors.otherLocation1 = 'Field 1 is required.';
      if (!formData.otherDateLost) nextErrors.otherDateLost = 'Date is required.';
      else if (isFutureDate(formData.otherDateLost)) nextErrors.otherDateLost = 'Invalid date. Please select today or a past date.';
      if (!formData.otherFromTime) nextErrors.otherFromTime = 'From time is required.';
      else if (isFutureTimeForDate(formData.otherDateLost, formData.otherFromTime)) {
        nextErrors.otherFromTime = 'Invalid time. Please select the past time';
      }
      if (!formData.otherToTime) nextErrors.otherToTime = 'To time is required.';
      else if (isFutureTimeForDate(formData.otherDateLost, formData.otherToTime)) {
        nextErrors.otherToTime = 'Invalid time. Please select the past time';
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
    let location = 'Unknown';
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
      description = `Last 4 digits: ${formData.cardLast4 || 'N/A'}${formData.cvv ? ` | CVV (provided): ${formData.cvv}` : ''}`;
      location = [formData.bankLocation1, formData.bankLocation2, formData.bankLocation3].filter(Boolean).join(', ') || location;
      date = formData.bankDateLost || date;
      time = formData.bankFromTime || time;
    }

    if (category === 'Purse / Wallet') {
      item_name = 'Purse / Wallet';
      if (purseOption === 'with-id') {
        const normalizedPurseId = String(formData.purseIdNumber).trim().toUpperCase();
        const compactPurseId = normalizedPurseId.length <= 7
          ? sanitizeStudentStaffIdInput(normalizedPurseId)
          : sanitizeNicInput(normalizedPurseId);
        description = `Claim with ID: ${compactPurseId}`;
      } else {
        description = `Items inside: ${[formData.purseItems1, formData.purseItems2, formData.purseItems3].filter(Boolean).join(', ')}`;
        location = [formData.purseLocation1, formData.purseLocation2, formData.purseLocation3].filter(Boolean).join(', ') || location;
        date = formData.purseDateLost || date;
        time = formData.purseFromTime || time;
      }
      image = formData.pursePhoto;
    }

    if (category === 'Others') {
      item_name = 'Other Lost Item';
      description = 'General lost item report';
      location = [formData.otherLocation1, formData.otherLocation2, formData.otherLocation3].filter(Boolean).join(', ') || location;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const payload = buildLostItemPayload();
      await itemsAPI.create(payload);
      setSubmitted(true);
      setVerified(false);
      setOtp('');
      toast.success('Lost item reported successfully');
      setTimeout(() => navigate('/lost-items', { state: { refreshAt: Date.now() } }), 500);
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
                <input
                  name="nicNumber"
                  value={formData.nicNumber}
                  onChange={handleInputChange}
                  maxLength="12"
                  autoComplete="off"
                  placeholder="e.g. 123456789V or 199001234567"
                />
                <small>{NIC_HELPER_TEXT}</small>
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
                <input
                  name="studentOrStaffId"
                  value={formData.studentOrStaffId}
                  onChange={handleInputChange}
                  maxLength="7"
                  autoComplete="off"
                  placeholder="e.g. 240574S"
                />
                <small>{STUDENT_STAFF_ID_HELPER_TEXT}</small>
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
                <select name="bankName" value={formData.bankName} onChange={handleInputChange}>
                  <option value="">Select a bank</option>
                  {SRI_LANKA_BANKS.map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
                {errors.bankName && <p className="report-lost-error">{errors.bankName}</p>}
              </div>
              <div className="report-lost-form-group">
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
                  <input type="date" name="bankDateLost" max={getDefaultDate()} value={formData.bankDateLost} onChange={handleInputChange} />
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

              <div className="report-lost-form-group">
                <label>Item Photo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange('pursePhoto', e.target.files?.[0])}
                />
              </div>

              <div className="report-lost-photo-box">
                <div className="report-lost-photo-emoji">👛</div>
                <p>Open purse preview</p>
              </div>

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
                  <input
                    name="purseIdNumber"
                    value={formData.purseIdNumber}
                    onChange={handleInputChange}
                    maxLength="12"
                    autoComplete="off"
                    placeholder="NIC or Student/Staff ID"
                  />
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
                    <input type="date" name="purseDateLost" max={getDefaultDate()} value={formData.purseDateLost} onChange={handleInputChange} />
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
                <input type="date" name="otherDateLost" max={getDefaultDate()} value={formData.otherDateLost} onChange={handleInputChange} />
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
