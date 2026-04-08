import { useMemo, useState } from 'react';
import { authAPI } from '../../services/api';
import { toast } from 'react-toastify';

const normalizePhone = (value = '') => String(value).replace(/\D/g, '').slice(0, 10);

const PhoneNumberUpdate = ({ user, onVerified }) => {
  const [newPhone, setNewPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const activePhone = user?.phone || 'Not set';
  const isPhoneVerified = Boolean(user?.is_phone_verified ?? true);

  const phoneStatusLabel = useMemo(() => {
    return isPhoneVerified ? 'Verified' : 'Not verified';
  }, [isPhoneVerified]);

  const requestPhoneUpdate = async () => {
    const normalizedPhone = normalizePhone(newPhone);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setSaving(true);
      const response = await authAPI.updatePhone(normalizedPhone);
      toast.success(response.data?.message || 'Phone number updated successfully');
      await onVerified?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update phone number');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-card" style={{ marginTop: '1rem' }}>
      <h2 style={{ marginBottom: '0.75rem' }}>Phone Number</h2>

      <div className="profile-details" style={{ marginTop: 0, marginBottom: '1rem' }}>
        <div className="detail-row">
          <strong>Active Phone:</strong>
          <span>{activePhone}</span>
        </div>
        <div className="detail-row">
          <strong>Phone Status:</strong>
          <span className={isPhoneVerified ? 'verified' : 'not-verified'}>
            {phoneStatusLabel}
          </span>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="newPhone">New Phone Number</label>
        <input
          id="newPhone"
          type="text"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={14}
          placeholder="07XXXXXXXX"
          value={newPhone}
          onChange={(e) => setNewPhone(normalizePhone(e.target.value))}
        />
      </div>

      <div className="form-actions" style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={requestPhoneUpdate}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Update Phone'}
        </button>
      </div>
    </div>
  );
};

export default PhoneNumberUpdate;
