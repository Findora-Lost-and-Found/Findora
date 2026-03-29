import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { itemsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { NIC_HELPER_TEXT, NIC_VALIDATION_MESSAGE, isValidNic, isValidNicNumber, normalizeNic, normalizeNicNumber, sanitizeNicInput } from '../utils/nicUtils';
import { isValidStudentIdNumber, normalizeStudentIdNumber, validateStudentID } from '../utils/studentIdUtils';
import {
  formatCardNumber,
  getCardCursorPosition,
  getCardLast4,
  isValidCardNumber,
  maskCardNumber,
  normalizeCardNumber
} from '../utils/cardUtils';
import { validateLostTimeWithDate } from '../utils/timeUtils';
import { BANK_OPTIONS } from '../data/bankOptions';
import './ReportLostItem.css';

const CATEGORY_OPTIONS = ['NIC', 'Student / Staff ID', 'Bank Card', 'Purse / Wallet', 'Others'];

const ReportLostItem = () => {
  const [category, setCategory] = useState('');
  const [purseOption, setPurseOption] = useState('with-id');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    nicName: '',
    nicNumber: '',
    idHolderType: '',
    idName: '',
    studentOrStaffId: '',
    cardType: '',
    bankName: '',
    cardNumber: '',
    bankLocation1: '',
    bankLocation2: '',
    bankLocation3: '',
    bankDateLost: '',
    bankFromTime: '',
    bankToTime: '',
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
    otherDescription: '',
    otherLocation1: '',
    otherLocation2: '',
    otherLocation3: '',
    otherDateLost: '',
    otherFromTime: '',
    otherToTime: '',
    nicLocation1: '',
    nicLocation2: '',
    nicLocation3: '',
    nicDateLost: '',
    nicFromTime: '',
    nicToTime: '',
    idLocation1: '',
    idLocation2: '',
    idLocation3: '',
    idDateLost: '',
    idFromTime: '',
    idToTime: '',
    purseWithIdLocation1: '',
    purseWithIdLocation2: '',
    purseWithIdLocation3: '',
    purseWithIdDateLost: '',
    purseWithIdFromTime: '',
    purseWithIdToTime: ''
  });

  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const inputEl = e.target;
    const normalizePurseId = (rawValue) => String(rawValue).trim().toUpperCase();

    const nextValue =
      name === 'nicNumber'
        ? sanitizeNicInput(value)
        : name === 'studentOrStaffId'
          ? normalizeStudentIdNumber(value)
          : name === 'purseIdNumber'
            ? normalizePurseId(value)
          : name === 'cardNumber'
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

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleFileChange = (name, file) => {
    setFormData((prev) => ({ ...prev, [name]: file || null }));
  };

  const validate = () => {
    const nextErrors = {};
    const isFutureDate = (dateValue) => {
      if (!dateValue) return false;
      const selectedDate = new Date(`${dateValue}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate > today;
    };
    const assignInvalidTimeError = (fieldName, dateValue, timeValue) => {
      if (!timeValue) {
        return;
      }

      const validationResult = validateLostTimeWithDate(dateValue, timeValue);
      if (validationResult !== true) {
        nextErrors[fieldName] = validationResult;
      }
    };

    if (!category) nextErrors.category = 'Please select a category.';

    if (category === 'NIC') {
      if (!formData.nicName.trim()) nextErrors.nicName = 'Name is required.';
      if (!formData.nicNumber.trim()) nextErrors.nicNumber = 'NIC Number is required.';
      else if (!isValidNic(formData.nicNumber)) nextErrors.nicNumber = NIC_VALIDATION_MESSAGE;
      if (formData.nicNumber.trim() && !isValidNicNumber(formData.nicNumber)) {
        nextErrors.nicNumber = 'NIC must be 12 digits or 9 digits followed by V.';
      }
      if (!formData.nicDateLost) nextErrors.nicDateLost = 'Date is required.';
      if (formData.nicDateLost && isFutureDate(formData.nicDateLost)) {
        nextErrors.nicDateLost = 'Invalid date. Please select today or a past date.';
      }
      if (!formData.nicFromTime) nextErrors.nicFromTime = 'From time is required.';
      if (!formData.nicToTime) nextErrors.nicToTime = 'To time is required.';
      assignInvalidTimeError('nicFromTime', formData.nicDateLost, formData.nicFromTime);
      assignInvalidTimeError('nicToTime', formData.nicDateLost, formData.nicToTime);
    }

    if (category === 'Student / Staff ID') {
      if (!formData.idHolderType) nextErrors.idHolderType = 'Please choose Student or Staff.';
      if (!formData.idName.trim()) nextErrors.idName = 'Name is required.';
      if (!formData.studentOrStaffId.trim()) nextErrors.studentOrStaffId = 'Student ID or Staff ID is required.';
      if (formData.studentOrStaffId.trim()) {
        const validationResult = validateStudentID(formData.studentOrStaffId);
        if (validationResult !== true) {
          nextErrors.studentOrStaffId = validationResult;
        }
      }
      if (!formData.idDateLost) nextErrors.idDateLost = 'Date is required.';
      if (formData.idDateLost && isFutureDate(formData.idDateLost)) {
        nextErrors.idDateLost = 'Invalid date. Please select today or a past date.';
      }
      if (!formData.idFromTime) nextErrors.idFromTime = 'From time is required.';
      if (!formData.idToTime) nextErrors.idToTime = 'To time is required.';
      assignInvalidTimeError('idFromTime', formData.idDateLost, formData.idFromTime);
      assignInvalidTimeError('idToTime', formData.idDateLost, formData.idToTime);
    }

    if (category === 'Bank Card') {
      if (!formData.cardType) nextErrors.cardType = 'Card Type is required.';
      if (!formData.bankName.trim()) nextErrors.bankName = 'Name of the Bank is required.';
      if (!isValidCardNumber(formData.cardNumber)) nextErrors.cardNumber = 'Please enter a valid 16-digit card number.';
      if (!formData.bankLocation1.trim()) nextErrors.bankLocation1 = 'Field 1 is required.';
      if (!formData.bankDateLost) nextErrors.bankDateLost = 'Date is required.';
      if (formData.bankDateLost && isFutureDate(formData.bankDateLost)) {
        nextErrors.bankDateLost = 'Invalid date. Please select today or a past date.';
      }
      if (!formData.bankFromTime) nextErrors.bankFromTime = 'From time is required.';
      if (!formData.bankToTime) nextErrors.bankToTime = 'To time is required.';
      assignInvalidTimeError('bankFromTime', formData.bankDateLost, formData.bankFromTime);
      assignInvalidTimeError('bankToTime', formData.bankDateLost, formData.bankToTime);
    }

    if (category === 'Purse / Wallet') {
      if (purseOption === 'with-id') {
        if (!formData.purseIdNumber.trim()) nextErrors.purseIdNumber = 'NIC number or Student/Staff ID is required.';
        if (
          formData.purseIdNumber.trim() &&
          !isValidNicNumber(formData.purseIdNumber) &&
          !isValidStudentIdNumber(formData.purseIdNumber)
        ) {
          nextErrors.purseIdNumber = 'Enter a valid NIC or Student ID (6 digits + 1 letter).';
        }
        if (!formData.purseWithIdLocation1.trim()) nextErrors.purseWithIdLocation1 = 'Location is required.';
        if (!formData.purseWithIdDateLost) nextErrors.purseWithIdDateLost = 'Date is required.';
        if (formData.purseWithIdDateLost && isFutureDate(formData.purseWithIdDateLost)) {
          nextErrors.purseWithIdDateLost = 'Invalid date. Please select today or a past date.';
        }
        if (!formData.purseWithIdFromTime) nextErrors.purseWithIdFromTime = 'From time is required.';
        if (!formData.purseWithIdToTime) nextErrors.purseWithIdToTime = 'To time is required.';
        assignInvalidTimeError('purseWithIdFromTime', formData.purseWithIdDateLost, formData.purseWithIdFromTime);
        assignInvalidTimeError('purseWithIdToTime', formData.purseWithIdDateLost, formData.purseWithIdToTime);
      }

      if (purseOption === 'without-id') {
        if (!formData.purseLocation1.trim()) nextErrors.purseLocation1 = 'Field 1 is required.';
        if (!formData.purseDateLost) nextErrors.purseDateLost = 'Date is required.';
        if (formData.purseDateLost && isFutureDate(formData.purseDateLost)) {
          nextErrors.purseDateLost = 'Invalid date. Please select today or a past date.';
        }
        if (!formData.purseFromTime) nextErrors.purseFromTime = 'From time is required.';
        if (!formData.purseToTime) nextErrors.purseToTime = 'To time is required.';
        assignInvalidTimeError('purseFromTime', formData.purseDateLost, formData.purseFromTime);
        assignInvalidTimeError('purseToTime', formData.purseDateLost, formData.purseToTime);
        if (!formData.purseItems1.trim()) nextErrors.purseItems1 = 'At least one item is required.';
      }
    }

    if (category === 'Others') {
      if (!formData.otherDescription.trim()) nextErrors.otherDescription = 'Description is required.';
      if (!formData.otherLocation1.trim()) nextErrors.otherLocation1 = 'Field 1 is required.';
      if (!formData.otherDateLost) nextErrors.otherDateLost = 'Date is required.';
      if (formData.otherDateLost && isFutureDate(formData.otherDateLost)) {
        nextErrors.otherDateLost = 'Invalid date. Please select today or a past date.';
      }
      if (!formData.otherFromTime) nextErrors.otherFromTime = 'From time is required.';
      if (!formData.otherToTime) nextErrors.otherToTime = 'To time is required.';
      assignInvalidTimeError('otherFromTime', formData.otherDateLost, formData.otherFromTime);
      assignInvalidTimeError('otherToTime', formData.otherDateLost, formData.otherToTime);
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const categoryMap = {
      'NIC': 'NIC',
      'Student / Staff ID': 'Student ID',
      'Bank Card': 'Bank Card',
      'Purse / Wallet': 'Wallet',
      'Others': 'Other'
    };
    const defaultLocation = 'Not specified';

    let item_name, description, location, date, time, image;

    if (category === 'NIC') {
      item_name = `NIC - ${formData.nicName}`;
      description = `NIC Number: ${normalizeNic(formData.nicNumber)}`;
      location = [formData.nicLocation1, formData.nicLocation2, formData.nicLocation3].filter(Boolean).join(', ') || defaultLocation;
      date = formData.nicDateLost;
      time = formData.nicFromTime;
      image = null;
    } else if (category === 'Student / Staff ID') {
      const idType = formData.idHolderType || 'Student';
      item_name = `${idType} ID - ${formData.idName}`;
      description = `ID Type: ${idType} | Name: ${formData.idName || 'Unknown'} | ID Number: ${formData.studentOrStaffId}`;
      location = [formData.idLocation1, formData.idLocation2, formData.idLocation3].filter(Boolean).join(', ') || defaultLocation;
      date = formData.idDateLost;
      time = formData.idFromTime;
      image = null;
    } else if (category === 'Bank Card') {
      item_name = `${formData.cardType} Card - ${formData.bankName}`;
      const last4 = getCardLast4(formData.cardNumber);
      description = `Card: ${maskCardNumber(formData.cardNumber) || '**** **** **** ****'}${last4 ? ` (last 4: ${last4})` : ''}`;
      location = [formData.bankLocation1, formData.bankLocation2, formData.bankLocation3].filter(Boolean).join(', ');
      date = formData.bankDateLost;
      time = formData.bankFromTime;
      image = null;
    } else if (category === 'Purse / Wallet') {
      item_name = 'Purse / Wallet';
      if (purseOption === 'with-id') {
        description = `Contains ID/NIC: ${formData.purseIdNumber}`;
        location = [formData.purseWithIdLocation1, formData.purseWithIdLocation2, formData.purseWithIdLocation3].filter(Boolean).join(', ');
        date = formData.purseWithIdDateLost;
        time = formData.purseWithIdFromTime;
      } else {
        const items = [formData.purseItems1, formData.purseItems2, formData.purseItems3].filter(Boolean).join(', ');
        description = items ? `Contains: ${items}` : '';
        location = [formData.purseLocation1, formData.purseLocation2, formData.purseLocation3].filter(Boolean).join(', ');
        date = formData.purseDateLost;
        time = formData.purseFromTime;
      }
      image = formData.pursePhoto;
    } else {
      item_name = 'Other Item';
      description = formData.otherDescription;
      location = [formData.otherLocation1, formData.otherLocation2, formData.otherLocation3].filter(Boolean).join(', ');
      date = formData.otherDateLost;
      time = formData.otherFromTime;
      image = formData.otherPhoto;
    }

    setLoading(true);
    try {
      const payload = {
        type: 'lost',
        category: categoryMap[category],
        item_name,
        description,
        location,
        date,
        time,
        image
      };

      if (category === 'Bank Card') {
        payload.private_card_number = normalizeCardNumber(formData.cardNumber);
      }

      await itemsAPI.create(payload);
      toast.success('Lost item reported successfully!');
      navigate('/lost-items');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit. Please try again.';
      toast.error(message);

      if (/suspend|banned|ban/i.test(String(message))) {
        logout();
        navigate('/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
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
                {/* OTP note only for fields where user might expect OTP */}
                <label className="required">NIC Number</label>
                <small style={{ color: '#A1A5AB', fontSize: '0.75rem', marginBottom: '0.5rem', display: 'block', opacity: 0.85 }}>Not used for OTP</small>
                <input
                  name="nicNumber"
                  value={formData.nicNumber}
                  onChange={handleInputChange}
                  maxLength={12}
                  autoComplete="off"
                  placeholder="123456789V or 199001234567"
                />
                <small style={{ color: '#6B7280' }}>{NIC_HELPER_TEXT}</small>
                {errors.nicNumber && <p className="report-lost-error">{errors.nicNumber}</p>}
              </div>
              <div className="report-lost-private">
                <h4>When did you lose it?</h4>
                <div className="report-lost-form-group">
                  <label className="required">What date did you lose it?</label>
                  <input type="date" name="nicDateLost" value={formData.nicDateLost} onChange={handleInputChange} />
                  {errors.nicDateLost && <p className="report-lost-error">{errors.nicDateLost}</p>}
                </div>
                <div className="report-lost-form-group">
                  <label className="required">What time span did you lose it?</label>
                  <div className="report-lost-row">
                    <div>
                      <label>From</label>
                      <input type="time" name="nicFromTime" value={formData.nicFromTime} onChange={handleInputChange} />
                      {errors.nicFromTime && <p className="report-lost-error">{errors.nicFromTime}</p>}
                    </div>
                    <div>
                      <label>To</label>
                      <input type="time" name="nicToTime" value={formData.nicToTime} onChange={handleInputChange} />
                      {errors.nicToTime && <p className="report-lost-error">{errors.nicToTime}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {category === 'Student / Staff ID' && (
            <div className="report-lost-section">
              <h3>Student / Staff ID</h3>
              <div className="report-lost-form-group">
                <label className="required">Student or Staff</label>
                <select name="idHolderType" value={formData.idHolderType} onChange={handleInputChange}>
                  <option value="">Select one</option>
                  <option value="Student">Student</option>
                  <option value="Staff">Staff</option>
                </select>
                {errors.idHolderType && <p className="report-lost-error">{errors.idHolderType}</p>}
              </div>
              <div className="report-lost-form-group">
                <label className="required">Name</label>
                <input name="idName" value={formData.idName} onChange={handleInputChange} />
                {errors.idName && <p className="report-lost-error">{errors.idName}</p>}
              </div>
              <div className="report-lost-form-group">
                {/* OTP note only for fields where user might expect OTP */}
                <label className="required">Student ID or Staff ID</label>
                <small style={{ color: '#A1A5AB', fontSize: '0.75rem', marginBottom: '0.5rem', display: 'block', opacity: 0.85 }}>Not used for OTP</small>
                <input
                  name="studentOrStaffId"
                  value={formData.studentOrStaffId}
                  onChange={handleInputChange}
                  placeholder="e.g. 123456A"
                />
                {errors.studentOrStaffId && <p className="report-lost-error">{errors.studentOrStaffId}</p>}
              </div>
              <div className="report-lost-private">
                <h4>When did you lose it?</h4>
                <div className="report-lost-form-group">
                  <label className="required">What date did you lose it?</label>
                  <input type="date" name="idDateLost" value={formData.idDateLost} onChange={handleInputChange} />
                  {errors.idDateLost && <p className="report-lost-error">{errors.idDateLost}</p>}
                </div>
                <div className="report-lost-form-group">
                  <label className="required">What time span did you lose it?</label>
                  <div className="report-lost-row">
                    <div>
                      <label>From</label>
                      <input type="time" name="idFromTime" value={formData.idFromTime} onChange={handleInputChange} />
                      {errors.idFromTime && <p className="report-lost-error">{errors.idFromTime}</p>}
                    </div>
                    <div>
                      <label>To</label>
                      <input type="time" name="idToTime" value={formData.idToTime} onChange={handleInputChange} />
                      {errors.idToTime && <p className="report-lost-error">{errors.idToTime}</p>}
                    </div>
                  </div>
                </div>
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
                  <option value="">-- Select Bank --</option>
                  {BANK_OPTIONS.map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
                {errors.bankName && <p className="report-lost-error">{errors.bankName}</p>}
              </div>
              <div className="report-lost-form-group">
                <label className="required">Card number</label>
                <input
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleInputChange}
                  placeholder="xxxx xxxx xxxx xxxx"
                  maxLength={19}
                  autoComplete="off"
                  inputMode="numeric"
                  pattern="[0-9 ]*"
                />
                <small className="report-lost-helper">Enter 16 digits. The number is grouped automatically as xxxx xxxx xxxx xxxx.</small>
                {errors.cardNumber && <p className="report-lost-error">{errors.cardNumber}</p>}
              </div>

              <div className="report-lost-private">
                <h4>Where did you lose it?</h4>
                <div className="report-lost-form-group">
                  <label className="required">Field 1</label>
                  <input name="bankLocation1" value={formData.bankLocation1} onChange={handleInputChange} />
                  {errors.bankLocation1 && <p className="report-lost-error">{errors.bankLocation1}</p>}
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
                <div>
                  <div className="report-lost-form-group">
                    {/* OTP note only for fields where user might expect OTP */}
                    <label className="required">Enter NIC number or Student/Staff ID</label>
                    <small style={{ color: '#A1A5AB', fontSize: '0.75rem', marginBottom: '0.5rem', display: 'block', opacity: 0.85 }}>Not used for OTP</small>
                    <input
                      name="purseIdNumber"
                      value={formData.purseIdNumber}
                      onChange={handleInputChange}
                      placeholder="NIC: 200012345678 / Student ID: 123456A"
                    />
                    {errors.purseIdNumber && <p className="report-lost-error">{errors.purseIdNumber}</p>}
                  </div>
                  <div className="report-lost-private">
                    <h4>Where did you lose it?</h4>
                    <div className="report-lost-form-group">
                      <label className="required">Field 1</label>
                      <input name="purseWithIdLocation1" value={formData.purseWithIdLocation1} onChange={handleInputChange} />
                      {errors.purseWithIdLocation1 && <p className="report-lost-error">{errors.purseWithIdLocation1}</p>}
                    </div>
                    <div className="report-lost-form-group">
                      <label>Field 2 (optional)</label>
                      <input name="purseWithIdLocation2" value={formData.purseWithIdLocation2} onChange={handleInputChange} />
                    </div>
                    <div className="report-lost-form-group">
                      <label>Field 3 (optional)</label>
                      <input name="purseWithIdLocation3" value={formData.purseWithIdLocation3} onChange={handleInputChange} />
                    </div>
                    <div className="report-lost-form-group">
                      <label className="required">What date did you lose it?</label>
                      <input type="date" name="purseWithIdDateLost" value={formData.purseWithIdDateLost} onChange={handleInputChange} />
                      {errors.purseWithIdDateLost && <p className="report-lost-error">{errors.purseWithIdDateLost}</p>}
                    </div>
                    <div className="report-lost-form-group">
                      <label className="required">What time span did you lose it?</label>
                      <div className="report-lost-row">
                        <div>
                          <label>From</label>
                          <input type="time" name="purseWithIdFromTime" value={formData.purseWithIdFromTime} onChange={handleInputChange} />
                          {errors.purseWithIdFromTime && <p className="report-lost-error">{errors.purseWithIdFromTime}</p>}
                        </div>
                        <div>
                          <label>To</label>
                          <input type="time" name="purseWithIdToTime" value={formData.purseWithIdToTime} onChange={handleInputChange} />
                          {errors.purseWithIdToTime && <p className="report-lost-error">{errors.purseWithIdToTime}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
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
                <label>Item Photo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange('otherPhoto', e.target.files?.[0])}
                />
              </div>

              <div className="report-lost-form-group">
                <label className="required">Describe the lost item</label>
                <textarea
                  name="otherDescription"
                  value={formData.otherDescription}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Describe the item in detail (color, size, brand, material, distinctive features, etc.)"
                />
                {errors.otherDescription && <p className="report-lost-error">{errors.otherDescription}</p>}
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
      </div>
    </div>
  );
};

export default ReportLostItem;
