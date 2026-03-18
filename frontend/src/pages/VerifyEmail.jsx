import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { getHomeRouteForUser } from '../utils/navigation';

const VerifyEmail = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyEmail, resendOTP, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyEmail(otp);
      toast.success(result?.message || 'Email verified successfully!');
      navigate(getHomeRouteForUser(user));
    } catch (error) {
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await resendOTP();
      toast.success('New OTP sent to your email');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <h2>Verify Your Email</h2>
        </div>
        
        <div style={{ 
          background: '#EFF6FF', 
          border: '1px solid #BFDBFE', 
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <p style={{ color: '#166534', margin: 0, fontSize: '0.9rem' }}>
            📨 A 6-digit OTP has been sent to <strong>{user?.email}</strong>
          </p>
          <p style={{ color: '#166534', margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
            ⚠️ Check your spam folder if you don't see it
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Enter OTP Code</label>
            <input
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              style={{ 
                textAlign: 'center', 
                fontSize: '1.5rem', 
                letterSpacing: '0.5rem',
                fontWeight: 'bold'
              }}
            />
            <small style={{ color: '#6B7280', display: 'block', marginTop: '0.5rem' }}>
              OTP expires in 24 hours
            </small>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', marginBottom: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p style={{ color: '#6B7280', marginBottom: '0.5rem' }}>
            Didn't receive the OTP?
          </p>
          <button 
            onClick={handleResendOTP}
            className="btn-secondary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Resend OTP'}
          </button>
        </div>

        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1rem',
          background: '#FEF2F2',
          border: '1px solid #FEE2E2',
          borderRadius: '8px'
        }}>
          <p style={{ color: '#991B1B', margin: 0, fontSize: '0.85rem' }}>
            ⚠️ You must verify your email to access the application
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
