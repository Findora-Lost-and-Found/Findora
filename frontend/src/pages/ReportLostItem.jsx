import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { itemsAPI } from '../services/api';
import {
  NIC_HELPER_TEXT,
  NIC_VALIDATION_MESSAGE,
  isValidNic,
  normalizeNic,
  sanitizeNicInput,
} from '../utils/nicUtils';
import {
  STUDENT_STAFF_ID_VALIDATION_MESSAGE,
  STUDENT_STAFF_ID_HELPER_TEXT,
  isValidStudentStaffId,
  normalizeStudentStaffId,
  sanitizeStudentStaffIdInput,
} from '../utils/studentStaffIdUtils';
import './ReportLostItem.css';

const CATEGORY_OPTIONS = ['NIC', 'Student / Staff ID', 'Bank Card', 'Purse / Wallet', 'Others'];

const SRI_LANKA_BANKS = [
  'Bank of Ceylon',
  'National Savings Bank',
  'People\'s Bank',
  'Commercial Bank of Ceylon',
  'Hatton National Bank (HNB)',
  'Sampath Bank',
  'Seylan Bank',
  'Nations Trust Bank (NTB)',
  'National Savings Bank (NSB)',
  'Pan Asia Banking Corporation',
  'Union Bank of Colombo',
  'DFCC Bank',
  'Cargills Bank',
  'Amana Bank',
  'MCB Bank',
  'Citibank Sri Lanka',
  'Standard Chartered Bank',
  'HSBC Sri Lanka',
  'Other',
];

const ReportLostItem = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [purseOption, setPurseOption] = useState('with-id');
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
    bankDateLost: '',
    bankFromTime: '',
    bankToTime: '',
    pursePhoto: null,
    purseIdNumber: '',
    purseLocation1: '',
    purseLocation2: '',
    purseDateLost: '',
    purseFromTime: '',
    purseToTime: '',
    purseItems1: '',
    purseItems2: '',
    purseItems3: '',
    otherPhoto: null,
  });

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === 'nicNumber' || name === 'purseIdNumber') {
      nextValue = String(value)
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 13);
    } else if (name === 'studentOrStaffId') {
      nextValue = String(value)
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 7);
    }

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleFileChange = (name, file) => {
    setFormData((prev) => ({ ...prev, [name]: file || null }));
  };

  const getDefaultDate = () => new Date().toISOString().slice(0, 10);

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

    if (!category) nextErrors.category = 'Please select a category.';

    if (category === 'NIC') {
      if (!formData.nicName.trim()) nextErrors.nicName = 'Name is required.';
      if (!formData.nicNumber.trim()) nextErrors.nicNumber = 'NIC Number is required.';
      else if (!isValidNic(formData.nicNumber)) nextErrors.nicNumber = NIC_VALIDATION_MESSAGE;
    }

    if (category === 'Student / Staff ID') {
      if (!formData.idName.trim()) nextErrors.idName = 'Name is required.';
      if (!formData.studentOrStaffId.trim()) nextErrors.studentOrStaffId = 'Student ID or Staff ID is required.';
      else if (!isValidStudentStaffId(formData.studentOrStaffId)) {
        nextErrors.studentOrStaffId = STUDENT_STAFF_ID_VALIDATION_MESSAGE;
      }
    }

    if (category === 'Bank Card') {
      if (!formData.cardType) nextErrors.cardType = 'Card Type is required.';
      if (!formData.bankName.trim()) nextErrors.bankName = 'Name of the Bank is required.';
      if (formData.cardLast4.trim() && !/^\d{4}$/.test(formData.cardLast4)) {
        nextErrors.cardLast4 = 'Please enter the last 4 digits of the card number.';
      }
      if (!formData.bankLocation1.trim()) nextErrors.bankLocation1 = 'Field 1 is required.';
      if (!formData.bankDateLost) nextErrors.bankDateLost = 'Date is required.';
      else if (isFutureDate(formData.bankDateLost)) {
        nextErrors.bankDateLost = 'Invalid date. Please select today or a past date.';
      }
      if (!formData.bankFromTime) nextErrors.bankFromTime = 'From time is required.';
      else if (isFutureTimeForDate(formData.bankDateLost, formData.bankFromTime)) {
        nextErrors.bankFromTime = 'Invalid time. Please select the past time';
      }
      if (!formData.bankToTime) nextErrors.bankToTime = 'To time is required.';
      else if (isFutureTimeForDate(formData.bankDateLost, formData.bankToTime)) {
        nextErrors.bankToTime = 'Invalid time. Please select the past time';
      }
    }

    if (category === 'Purse / Wallet' && purseOption === 'with-id') {
      if (!formData.purseIdNumber.trim()) {
        nextErrors.purseIdNumber = 'NIC number or Student/Staff ID is required.';
      } else if (!isValidNic(formData.purseIdNumber) && !isValidStudentStaffId(formData.purseIdNumber)) {
        nextErrors.purseIdNumber = 'Enter a valid NIC or Student ID (6 digits + 1 letter).';
      }
    }

    if (category === 'Purse / Wallet' && purseOption === 'without-id') {
      if (!formData.purseLocation1.trim()) nextErrors.purseLocation1 = 'Field 1 is required.';
      if (!formData.purseDateLost) nextErrors.purseDateLost = 'Date is required.';
      else if (isFutureDate(formData.purseDateLost)) {
        nextErrors.purseDateLost = 'Invalid date. Please select today or a past date.';
      }
      if (!formData.purseFromTime) nextErrors.purseFromTime = 'From time is required.';
      else if (isFutureTimeForDate(formData.purseDateLost, formData.purseFromTime)) {
        nextErrors.purseFromTime = 'Invalid time. Please select the past time';
      }
      if (!formData.purseToTime) nextErrors.purseToTime = 'To time is required.';
      else if (isFutureTimeForDate(formData.purseDateLost, formData.purseToTime)) {
        nextErrors.purseToTime = 'Invalid time. Please select the past time';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const categoryMap = {
      NIC: 'NIC',
      'Student / Staff ID': 'Student ID',
      'Bank Card': 'Bank Card',
      'Purse / Wallet': 'Wallet',
      Others: 'Other',
    };

    let item_name = 'Lost Item';
    let description = '';
    let location = '';
    let date = '';
    let time = '';
    let image = null;

    if (category === 'NIC') {
      item_name = `NIC - ${formData.nicName}`;
      description = `NIC Number: ${normalizeNic(formData.nicNumber)}`;
    } else if (category === 'Student / Staff ID') {
      item_name = `Student/Staff ID - ${formData.idName}`;
      description = `ID: ${normalizeStudentStaffId(formData.studentOrStaffId)}`;
    } else if (category === 'Bank Card') {
      item_name = `${formData.cardType} Card - ${formData.bankName}`;
      description = formData.cardLast4 ? `Last 4 digits: ${formData.cardLast4}` : 'Bank card reported';
      location = [formData.bankLocation1, formData.bankLocation2].filter(Boolean).join(', ');
      date = formData.bankDateLost || '';
      time = formData.bankFromTime || '';
    } else if (category === 'Purse / Wallet') {
      item_name = 'Purse / Wallet';
      if (purseOption === 'with-id') {
        description = `Contains ID/NIC: ${formData.purseIdNumber}`;
      } else {
        const items = [formData.purseItems1, formData.purseItems2, formData.purseItems3].filter(Boolean).join(', ');
        description = items ? `Contains: ${items}` : 'Purse/wallet without ID';
        location = [formData.purseLocation1, formData.purseLocation2].filter(Boolean).join(', ');
        date = formData.purseDateLost || '';
        time = formData.purseFromTime || '';
      }
      image = formData.pursePhoto;
    } else if (category === 'Others') {
      item_name = 'Other Item';
      description = 'Lost item report';
      image = formData.otherPhoto;
    }

    try {
      setLoading(true);
      await itemsAPI.create({
        type: 'lost',
        category: categoryMap[category],
        item_name,
        description,
        location: location || '',
        date: date || '',
        time: time || '',
        image,
      });
      toast.success('Lost item reported successfully!');
      navigate('/lost-items');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit. Please try again.');
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
                <option key={option} value={option}>
                  {option}
                </option>
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
                  type="text"
                  name="nicNumber"
                  value={formData.nicNumber}
                  onChange={handleInputChange}
                  maxLength={13}
                  autoComplete="off"
                  placeholder="123456789V or 199001234567"
                />
                <small style={{ color: '#6B7280' }}>{NIC_HELPER_TEXT}</small>
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
                  type="text"
                  name="studentOrStaffId"
                  value={formData.studentOrStaffId}
                  onChange={handleInputChange}
                  placeholder="e.g. 240574S"
                  maxLength={7}
                />
                <small style={{ color: '#6B7280' }}>{STUDENT_STAFF_ID_HELPER_TEXT}</small>
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
                  <option value="">-- Select Bank --</option>
                  {SRI_LANKA_BANKS.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
                {errors.bankName && <p className="report-lost-error">{errors.bankName}</p>}
              </div>
              <div className="report-lost-form-group">
                <label>Last 4 digits (optional)</label>
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
                  <label className="required">What date did you lose it?</label>
                  <input
                    type="date"
                    name="bankDateLost"
                    max={getDefaultDate()}
                    value={formData.bankDateLost}
                    onChange={handleInputChange}
                  />
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
                <input type="file" accept="image/*" onChange={(e) => handleFileChange('pursePhoto', e.target.files?.[0])} />
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
                    type="text"
                    name="purseIdNumber"
                    value={formData.purseIdNumber}
                    onChange={handleInputChange}
                    placeholder="NIC: 200012345678 / Student ID: 123456A"
                    maxLength={13}
                  />
                  {errors.purseIdNumber && <p className="report-lost-error">{errors.purseIdNumber}</p>}
                </div>
              )}

              {purseOption === 'without-id' && (
                <div>
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
                      <label className="required">What date did you lose it?</label>
                      <input
                        type="date"
                        name="purseDateLost"
                        max={getDefaultDate()}
                        value={formData.purseDateLost}
                        onChange={handleInputChange}
                      />
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
                  </div>

                  <h4>What items were inside the purse?</h4>
                  <div className="report-lost-form-group">
                    <label>Field 1</label>
                    <input name="purseItems1" value={formData.purseItems1} onChange={handleInputChange} />
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
                <input type="file" accept="image/*" onChange={(e) => handleFileChange('otherPhoto', e.target.files?.[0])} />
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
