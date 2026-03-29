import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { itemsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { NIC_HELPER_TEXT, NIC_VALIDATION_MESSAGE, isValidNic, normalizeNic, sanitizeNicInput } from '../utils/nicUtils';
import { isValidStudentIdNumber } from '../utils/studentIdUtils';
import { getCardLast4, maskCardNumber } from '../utils/cardUtils';
import './ReportFoundItem.css';

const CATEGORY_OPTIONS = [
  'NIC',
  'Student / Staff ID',
  'Bank Card',
  'Purse',
  'Others'
];

const ReportFoundItem = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [category, setCategory] = useState('');
  const [purseOption, setPurseOption] = useState('with-id');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    nicName: '',
    nicNumber: '',
    idHolderType: '',
    idName: '',
    studentOrStaffId: '',
    idLocation1: '',
    idLocation2: '',
    idLocation3: '',
    cardType: '',
    bankName: '',
    cardNumber: '',
    bankPrivateLocation: '',
    bankPrivateLocation2: '',
    bankPrivateLocation3: '',
    bankPrivateDate: '',
    bankPrivateTime: '',
    purseName: '',
    purseIdNumber: '',
    purseWithIdLocation1: '',
    purseWithIdLocation2: '',
    purseWithIdLocation3: '',
    purseMoney: '',
    purseOtherItems: '',
    pursePrivateLocation: '',
    pursePrivateLocation2: '',
    pursePrivateLocation3: '',
    pursePrivateDate: '',
    pursePrivateTime: '',
    pursePhoto: null,
    otherPhoto: null,
    otherItemName: '',
    otherDescription: '',
    otherPrivateLocation: '',
    otherPrivateLocation2: '',
    otherPrivateLocation3: '',
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
    let nextValue = value;
    if (name === 'nicNumber') {
      nextValue = sanitizeNicInput(value);
    }
    if (name === 'cardNumber') {
      nextValue = String(value).replace(/\D/g, '').slice(0, 16);
    }
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, otherPhoto: e.target.files?.[0] || null }));
  };

  const handlePurseFileChange = (e) => {
    setFormData((prev) => ({ ...prev, pursePhoto: e.target.files?.[0] || null }));
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
      if (!formData.idHolderType) nextErrors.idHolderType = 'Please choose Student or Staff.';
      if (!formData.idName.trim()) nextErrors.idName = 'Name is required.';
      if (!formData.studentOrStaffId.trim()) nextErrors.studentOrStaffId = 'Student ID or Staff ID is required.';
      if (formData.studentOrStaffId.trim() && !isValidStudentIdNumber(formData.studentOrStaffId)) {
        nextErrors.studentOrStaffId = 'Student ID must be 6 digits followed by 1 letter.';
      }
    }

    if (category === 'Bank Card') {
      if (!formData.cardType) nextErrors.cardType = 'Card Type is required.';
      if (!formData.bankName.trim()) nextErrors.bankName = 'Name of the Bank is required.';
      if (!/^\d{16}$/.test(formData.cardNumber)) nextErrors.cardNumber = 'Full 16-digit card number is required.';
      if (!formData.bankPrivateLocation.trim()) nextErrors.bankPrivateLocation = 'Location is required.';
      if (!formData.bankPrivateDate) nextErrors.bankPrivateDate = 'Date is required.';
      if (!formData.bankPrivateTime) nextErrors.bankPrivateTime = 'Time is required.';
    }

    if (category === 'Purse') {
      if (purseOption === 'with-id') {
        if (!formData.purseName.trim()) nextErrors.purseName = 'Name is required.';
        if (!formData.purseIdNumber.trim()) nextErrors.purseIdNumber = 'Student ID or NIC number is required.';
        if (
          formData.purseIdNumber.trim() &&
          !isValidNicNumber(formData.purseIdNumber) &&
          !isValidStudentIdNumber(formData.purseIdNumber)
        ) {
          nextErrors.purseIdNumber = 'Enter a valid NIC or Student ID (6 digits + 1 letter).';
        }
        if (!formData.purseWithIdLocation1.trim()) nextErrors.purseWithIdLocation1 = 'Location is required.';
      }

      if (purseOption === 'without-id') {
        if (!formData.purseMoney.trim()) nextErrors.purseMoney = 'Amount of money is required.';
        if (!formData.purseOtherItems.trim()) nextErrors.purseOtherItems = 'Other items inside purse are required.';
        if (!formData.pursePrivateLocation.trim()) nextErrors.pursePrivateLocation = 'Location is required.';
        if (!formData.pursePrivateDate) nextErrors.pursePrivateDate = 'Date is required.';
        if (!formData.pursePrivateTime) nextErrors.pursePrivateTime = 'Time is required.';
      }
    }

    if (category === 'Others') {
      if (!formData.otherItemName.trim()) nextErrors.otherItemName = 'Item name is required.';
      if (!formData.otherPhoto) nextErrors.otherPhoto = 'Photo upload is required.';
      if (!formData.otherPrivateLocation.trim()) nextErrors.otherPrivateLocation = 'Location is required.';
      if (!formData.otherPrivateDate) nextErrors.otherPrivateDate = 'Date is required.';
      if (!formData.otherPrivateTime) nextErrors.otherPrivateTime = 'Time is required.';
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
      description = `NIC Number: ${normalizeNic(formData.nicNumber)}`;
      // location defaults to 'Security Office'
    }

    if (category === 'Student / Staff ID') {
      item_name = `Student/Staff ID - ${formData.idName || 'Unknown'}`;
      description = `ID Number: ${formData.studentOrStaffId}`;
      // location defaults to 'Security Office'
    }

    if (category === 'Bank Card') {
      item_name = `${formData.bankName} ${formData.cardType} Card`;
      const last4 = getCardLast4(formData.cardNumber);
      description = `Card: ${maskCardNumber(formData.cardNumber) || '**** **** **** ****'}${last4 ? ` (last 4: ${last4})` : ''}`;
      location = formData.bankPrivateLocation.trim() || location;
      date = formData.bankPrivateDate || date;
      time = formData.bankPrivateTime || time;
    }

    if (category === 'Purse') {
      item_name = 'Purse / Wallet';
      image = formData.pursePhoto;
      if (purseOption === 'with-id') {
        description = `Claim with ID: ${formData.purseIdNumber}`;
        location = formData.purseWithIdLocation1.trim() || location;
      } else {
        description = `Items inside: ${formData.purseOtherItems || formData.purseMoney}`;
        location = formData.pursePrivateLocation.trim() || location;
        date = formData.pursePrivateDate || date;
        time = formData.pursePrivateTime || time;
      }
    }

    if (category === 'Others') {
      item_name = formData.otherItemName || 'Other Found Item';
      description = formData.otherDescription || 'General found item report';
      location = formData.otherPrivateLocation.trim() || location;
      date = formData.otherPrivateDate || date;
      time = formData.otherPrivateTime || time;
      image = formData.otherPhoto;
    }

    const payload = {
      type: 'found',
      category: apiCategory,
      item_name,
      description,
      location,
      date,
      time,
      image
    };

    if (category === 'Bank Card') {
      payload.private_card_number = formData.cardNumber;
    }

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = buildFoundItemPayload();

    console.log('Submitting found item payload:', {
      ...payload,
      private_card_number: payload.private_card_number ? '***hidden***' : undefined,
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
      const message = error.response?.data?.message || 'Failed to report found item';
      console.error('Failed to create found item:', error.response?.data || error.message);
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
                  maxLength={12}
                  autoComplete="off"
                  placeholder="123456789V or 199001234567"
                />
                <small style={{ color: '#6B7280' }}>{NIC_HELPER_TEXT}</small>
                {errors.nicNumber && <p className="error-text">{errors.nicNumber}</p>}
              </div>
            </div>
          )}

          {category === 'Student / Staff ID' && (
            <div className="category-section">
              <h3>Student / Staff ID Details</h3>
              <div className="form-group">
                <label className="required">Student or Staff</label>
                <select name="idHolderType" value={formData.idHolderType} onChange={handleInputChange}>
                  <option value="">Select one</option>
                  <option value="Student">Student</option>
                  <option value="Staff">Staff</option>
                </select>
                {errors.idHolderType && <p className="error-text">{errors.idHolderType}</p>}
              </div>
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
                  placeholder="e.g. 123456A"
                  maxLength={7}
                />
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
                  <option value="">-- Select Bank --</option>
                  <option>Bank of Ceylon</option>
                  <option>People's Bank</option>
                  <option>Commercial Bank of Ceylon</option>
                  <option>Hatton National Bank (HNB)</option>
                  <option>Sampath Bank</option>
                  <option>Seylan Bank</option>
                  <option>Nations Trust Bank (NTB)</option>
                  <option>National Savings Bank (NSB)</option>
                  <option>Pan Asia Banking Corporation</option>
                  <option>Union Bank of Colombo</option>
                  <option>DFCC Bank</option>
                  <option>Cargills Bank</option>
                  <option>Amana Bank</option>
                  <option>MCB Bank</option>
                  <option>Citibank Sri Lanka</option>
                  <option>Standard Chartered Bank</option>
                  <option>HSBC Sri Lanka</option>
                  <option>Other</option>
                </select>
                {errors.bankName && <p className="error-text">{errors.bankName}</p>}
              </div>
              <div className="form-group">
                <label className="required">Card number</label>
                <input
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleInputChange}
                  placeholder="Enter full 16-digit card number"
                  maxLength={16}
                  inputMode="numeric"
                />
                {errors.cardNumber && <p className="error-text">{errors.cardNumber}</p>}
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
                    <input type="date" name="bankPrivateDate" value={formData.bankPrivateDate} onChange={handleInputChange} />
                    {errors.bankPrivateDate && <p className="error-text">{errors.bankPrivateDate}</p>}
                  </div>
                  <div className="form-group">
                    <label className="required">Time</label>
                    <input type="time" name="bankPrivateTime" value={formData.bankPrivateTime} onChange={handleInputChange} />
                    {errors.bankPrivateTime && <p className="error-text">{errors.bankPrivateTime}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {category === 'Purse' && (
            <div className="category-section">
              <h3>Purse Details</h3>

              <div className="form-group">
                <label>Upload Photo of the Purse</label>
                <input type="file" accept="image/*" onChange={handlePurseFileChange} />
              </div>

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
                      placeholder="NIC: 200012345678 / Student ID: 123456A"
                      maxLength={12}
                    />
                    {errors.purseIdNumber && <p className="error-text">{errors.purseIdNumber}</p>}
                  </div>
                  <div className="private-block">
                    <h4>Where did you find it?</h4>
                    <div className="form-group">
                      <label className="required">Location</label>
                      <input
                        name="purseWithIdLocation1"
                        value={formData.purseWithIdLocation1}
                        onChange={handleInputChange}
                        placeholder="e.g. Bus stand"
                      />
                      {errors.purseWithIdLocation1 && <p className="error-text">{errors.purseWithIdLocation1}</p>}
                    </div>
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
                      <input type="date" name="pursePrivateDate" value={formData.pursePrivateDate} onChange={handleInputChange} />
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
                <label className="required">Item Name</label>
                <input
                  name="otherItemName"
                  value={formData.otherItemName}
                  onChange={handleInputChange}
                  placeholder="e.g. Black backpack, Umbrella, Keys..."
                />
                {errors.otherItemName && <p className="error-text">{errors.otherItemName}</p>}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="otherDescription"
                  value={formData.otherDescription}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe the item in detail (colour, size, brand, etc.)"
                />
              </div>

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
                    <input type="date" name="otherPrivateDate" value={formData.otherPrivateDate} onChange={handleInputChange} />
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
