import { useMemo, useState } from 'react';
import { authAPI } from '../../services/api';
import { toast } from 'react-toastify';

const normalizePhone = (value = '') => String(value).replace(/\D/g, '').slice(0, 10);

const PhoneNumberUpdate = ({ user, onVerified }) => {
  const [newPhone, setNewPhone] = useState(user?.pending_phone || user?.phone || '');
  const [otp, setOtp] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpRequested, setOtpRequested] = useState(Boolean(user?.pending_phone));

  const activePhone = user?.phone || 'Not set';
  const pendingPhone = user?.pending_phone || '';
  const isPhoneVerified = Boolean(user?.is_phone_verified ?? true);
  const hasPendingVerification = Boolean(pendingPhone);

  const phoneStatusLabel = useMemo(() => {
    if (hasPendingVerification) {
      return `Pending verification for ${pendingPhone}`;
    }
    return isPhoneVerified ? 'Verified' : 'Not verified';
  }, [hasPendingVerification, pendingPhone, isPhoneVerified]);

  const requestPhoneUpdate = async () => {
    const normalizedPhone = normalizePhone(newPhone);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setRequesting(true);
      const response = await authAPI.updatePhone(normalizedPhone);
      toast.success(response.data?.message || 'OTP sent for phone verification');
      setOtpRequested(true);
      setOtp('');
      await onVerified?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request phone update');
    } finally {
      setRequesting(false);
    }
  };

  const verifyOtp = async () => {
    const trimmedOtp = String(otp).trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    try {
      setVerifying(true);
      const response = await authAPI.verifyPhoneOtp(trimmedOtp);
      toast.success(response.data?.message || 'Phone number verified successfully');
      setOtp('');
      setOtpRequested(false);
      await onVerified?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setVerifying(false);
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
          <span className={hasPendingVerification ? 'pending' : (isPhoneVerified ? 'verified' : 'not-verified')}>
            {phoneStatusLabel}
          </span>
        </div>
      </div>

      {hasPendingVerification && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
          Phone verification is pending. Actions that require a verified phone should remain blocked until OTP verification completes.
        </div>
      )}

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
          disabled={requesting || verifying}
        >
          {requesting ? 'Sending OTP...' : 'Update Phone'}
        </button>
      </div>

      {(otpRequested || hasPendingVerification) && (
        <>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label htmlFor="phoneOtp">Enter OTP</label>
            <input
              id="phoneOtp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <small>OTP is sent to your registered email and expires in 15 minutes.</small>
          </div>

          <div className="form-actions" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="btn-success"
              onClick={verifyOtp}
              disabled={verifying || requesting}
            >
              {verifying ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PhoneNumberUpdate;
