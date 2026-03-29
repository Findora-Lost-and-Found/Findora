import { useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';
import PasswordInput from '../components/PasswordInput';

const Settings = () => {
  const [theme, setTheme] = useState('light');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const storedTheme = localStorage.getItem('findora-theme') || 'light';
    setTheme(storedTheme);
  }, []);

  const switchTheme = (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem('findora-theme', nextTheme);
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(`${nextTheme}-mode`);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
    setSuccessMessage('');
    setLoading(false);
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validatePasswordForm = () => {
    const nextErrors = {};

    if (!formData.currentPassword) {
      nextErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      nextErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      nextErrors.newPassword = 'New password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = 'Confirm new password is required';
    } else if (formData.confirmPassword !== formData.newPassword) {
      nextErrors.confirmPassword = 'Confirm new password must match new password';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validatePasswordForm()) return;

    try {
      setLoading(true);
      const response = await authAPI.changePassword(formData);
      const message = response.data?.message || 'Password updated successfully.';
      setSuccessMessage(message);
      toast.success(message);
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
      setTimeout(() => {
        closePasswordModal();
      }, 900);
    } catch (error) {
      const apiMessage = error.response?.data?.message || 'Failed to update password';
      const apiErrors = error.response?.data?.errors;

      if (Array.isArray(apiErrors)) {
        const mappedErrors = {};
        apiErrors.forEach((err) => {
          if (err.path) mappedErrors[err.path] = err.msg;
        });
        setErrors((prev) => ({ ...prev, ...mappedErrors }));
      }

      if (apiMessage.toLowerCase().includes('current password')) {
        setErrors((prev) => ({ ...prev, currentPassword: apiMessage }));
      }

      toast.error(apiMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="profile-container">
        <h1>Settings</h1>

        <div className="theme-switcher">
          <strong>Theme:</strong>
          <div className="theme-switcher-actions">
            <button
              type="button"
              className={`btn-small ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => switchTheme('light')}
            >
              Light Mode
            </button>
            <button
              type="button"
              className={`btn-small ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => switchTheme('dark')}
            >
              Dark Mode
            </button>
          </div>
        </div>

        <div className="profile-card" style={{ marginTop: '1rem' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Security</h2>
          <p style={{ marginBottom: '1rem', color: '#6B7280' }}>
            Manage your account security settings.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsPasswordModalOpen(true)}
          >
            Change Password
          </button>
        </div>

        {isPasswordModalOpen && (
          <div className="profile-password-overlay" onClick={closePasswordModal}>
            <div className="profile-password-modal" onClick={(e) => e.stopPropagation()}>
              <div className="profile-password-header">
                <h3>Change Password</h3>
                <button type="button" className="profile-password-close" onClick={closePasswordModal}>✕</button>
              </div>

              {successMessage && (
                <div className="profile-password-success">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <PasswordInput
                    id="currentPassword"
                    name="currentPassword"
                    autoComplete="current-password"
                    value={formData.currentPassword}
                    onChange={handlePasswordChange}
                  />
                  {errors.currentPassword && <small style={{ color: '#DC2626' }}>{errors.currentPassword}</small>}
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <PasswordInput
                    id="newPassword"
                    name="newPassword"
                    autoComplete="new-password"
                    value={formData.newPassword}
                    onChange={handlePasswordChange}
                  />
                  {errors.newPassword && <small style={{ color: '#DC2626' }}>{errors.newPassword}</small>}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handlePasswordChange}
                  />
                  {errors.confirmPassword && <small style={{ color: '#DC2626' }}>{errors.confirmPassword}</small>}
                </div>

                <div className="form-actions" style={{ marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={closePasswordModal} disabled={loading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Updating Password...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;