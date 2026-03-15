import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { itemsAPI } from '../services/api';
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
    otherToTime: '',
    nicLocation1: '',
    nicLocation2: '',
    nicDateLost: '',
    nicFromTime: '',
    nicToTime: '',
    idLocation1: '',
    idLocation2: '',
    idDateLost: '',
    idFromTime: '',
    idToTime: '',
    purseWithIdLocation1: '',
    purseWithIdLocation2: '',
    purseWithIdDateLost: '',
    purseWithIdFromTime: '',
    purseWithIdToTime: ''
  });

  const navigate = useNavigate();

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
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
      if (!formData.nicLocation1.trim()) nextErrors.nicLocation1 = 'Location is required.';
      if (!formData.nicDateLost) nextErrors.nicDateLost = 'Date is required.';
      if (!formData.nicFromTime) nextErrors.nicFromTime = 'From time is required.';
      if (!formData.nicToTime) nextErrors.nicToTime = 'To time is required.';
    }

    if (category === 'Student / Staff ID') {
      if (!formData.idName.trim()) nextErrors.idName = 'Name is required.';
      if (!formData.studentOrStaffId.trim()) nextErrors.studentOrStaffId = 'Student ID or Staff ID is required.';
      if (!formData.idLocation1.trim()) nextErrors.idLocation1 = 'Location is required.';
      if (!formData.idDateLost) nextErrors.idDateLost = 'Date is required.';
      if (!formData.idFromTime) nextErrors.idFromTime = 'From time is required.';
      if (!formData.idToTime) nextErrors.idToTime = 'To time is required.';
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
        if (!formData.purseWithIdLocation1.trim()) nextErrors.purseWithIdLocation1 = 'Location is required.';
        if (!formData.purseWithIdDateLost) nextErrors.purseWithIdDateLost = 'Date is required.';
        if (!formData.purseWithIdFromTime) nextErrors.purseWithIdFromTime = 'From time is required.';
        if (!formData.purseWithIdToTime) nextErrors.purseWithIdToTime = 'To time is required.';
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
      if (!formData.otherLocation1.trim()) nextErrors.otherLocation1 = 'Field 1 is required.';
      if (!formData.otherDateLost) nextErrors.otherDateLost = 'Date is required.';
      if (!formData.otherFromTime) nextErrors.otherFromTime = 'From time is required.';
      if (!formData.otherToTime) nextErrors.otherToTime = 'To time is required.';
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

    let item_name, description, location, date, time, image;

    if (category === 'NIC') {
      item_name = `NIC - ${formData.nicName}`;
      description = `NIC Number: ${formData.nicNumber}`;
      location = [formData.nicLocation1, formData.nicLocation2].filter(Boolean).join(', ');
      date = formData.nicDateLost;
      time = formData.nicFromTime;
      image = null;
    } else if (category === 'Student / Staff ID') {
      item_name = `Student/Staff ID - ${formData.idName}`;
      description = `ID: ${formData.studentOrStaffId}`;
      location = [formData.idLocation1, formData.idLocation2].filter(Boolean).join(', ');
      date = formData.idDateLost;
      time = formData.idFromTime;
      image = null;
    } else if (category === 'Bank Card') {
      item_name = `${formData.cardType} Card - ${formData.bankName}`;
      description = formData.cardLast4 ? `Last 4 digits: ${formData.cardLast4}` : '';
      location = [formData.bankLocation1, formData.bankLocation2, formData.bankLocation3].filter(Boolean).join(', ');
      date = formData.bankDateLost;
      time = formData.bankFromTime;
      image = null;
    } else if (category === 'Purse / Wallet') {
      item_name = 'Purse / Wallet';
      if (purseOption === 'with-id') {
        description = `Contains ID/NIC: ${formData.purseIdNumber}`;
        location = [formData.purseWithIdLocation1, formData.purseWithIdLocation2].filter(Boolean).join(', ');
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
      description = '';
      location = [formData.otherLocation1, formData.otherLocation2, formData.otherLocation3].filter(Boolean).join(', ');
      date = formData.otherDateLost;
      time = formData.otherFromTime;
      image = formData.otherPhoto;
    }

    setLoading(true);
    try {
      await itemsAPI.create({
        type: 'lost',
        category: categoryMap[category],
        item_name,
        description,
        location,
        date,
        time,
        image
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
              <div className="report-lost-private">
                <h4>Where did you lose it?</h4>
                <div className="report-lost-form-group">
                  <label className="required">Field 1</label>
                  <input name="nicLocation1" value={formData.nicLocation1} onChange={handleInputChange} />
                  {errors.nicLocation1 && <p className="report-lost-error">{errors.nicLocation1}</p>}
                </div>
                <div className="report-lost-form-group">
                  <label>Field 2 (optional)</label>
                  <input name="nicLocation2" value={formData.nicLocation2} onChange={handleInputChange} />
                </div>
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
                <label className="required">Name</label>
                <input name="idName" value={formData.idName} onChange={handleInputChange} />
                {errors.idName && <p className="report-lost-error">{errors.idName}</p>}
              </div>
              <div className="report-lost-form-group">
                <label className="required">Student ID or Staff ID</label>
                <input name="studentOrStaffId" value={formData.studentOrStaffId} onChange={handleInputChange} />
                {errors.studentOrStaffId && <p className="report-lost-error">{errors.studentOrStaffId}</p>}
              </div>
              <div className="report-lost-private">
                <h4>Where did you lose it?</h4>
                <div className="report-lost-form-group">
                  <label className="required">Field 1</label>
                  <input name="idLocation1" value={formData.idLocation1} onChange={handleInputChange} />
                  {errors.idLocation1 && <p className="report-lost-error">{errors.idLocation1}</p>}
                </div>
                <div className="report-lost-form-group">
                  <label>Field 2 (optional)</label>
                  <input name="idLocation2" value={formData.idLocation2} onChange={handleInputChange} />
                </div>
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
                    <label className="required">Enter NIC number or Student/Staff ID</label>
                    <input name="purseIdNumber" value={formData.purseIdNumber} onChange={handleInputChange} />
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
