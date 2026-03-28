import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeRouteForUser } from '../utils/navigation';
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from '../utils/contactValidation';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])\S{8,64}$/;
const PASSWORD_REQUIREMENTS = 'Password must be 8-64 characters and include uppercase, lowercase, number, and special character.';

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: 'student',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      const normalizedPhone = normalizePhone(value);
      setFormData((prev) => ({ ...prev, phone: normalizedPhone }));

      if (normalizedPhone && !isValidPhone(normalizedPhone)) {
        setPhoneError('Phone number invalid format');
      } else {
        setPhoneError('');
      }
      return;
    }

    if (name === 'email') {
      const normalizedEmail = normalizeEmail(value);
      setFormData((prev) => ({ ...prev, email: normalizedEmail }));

      if (normalizedEmail && !isValidEmail(normalizedEmail)) {
        setEmailError('Invalid email format');
      } else {
        setEmailError('');
      }
      return;
    }

    if (name === 'password') {
      setFormData((prev) => ({ ...prev, password: value }));
      if (value && !STRONG_PASSWORD_REGEX.test(value)) {
        setPasswordError(PASSWORD_REQUIREMENTS);
      } else {
        setPasswordError('');
      }

      if (formData.confirmPassword && value !== formData.confirmPassword) {
        setConfirmPasswordError('Passwords do not match');
      } else {
        setConfirmPasswordError('');
      }
      return;
    }

    if (name === 'confirmPassword') {
      setFormData((prev) => ({ ...prev, confirmPassword: value }));
      if (value && value !== formData.password) {
        setConfirmPasswordError('Passwords do not match');
      } else {
        setConfirmPasswordError('');
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidEmail(formData.email)) {
      setEmailError('Invalid email format');
      return;
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      setPhoneError('Phone number invalid format');
      return;
    }

    if (!STRONG_PASSWORD_REGEX.test(formData.password)) {
      setPasswordError(PASSWORD_REQUIREMENTS);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    setLoading(true);

    const { confirmPassword, ...registrationData } = formData;
    const result = await register(registrationData);

    if (result.success) {
      if (result.requiresVerification) {
        navigate('/verify-email');
      } else if (result.pendingApproval) {
        navigate('/login');
      } else {
        navigate(getHomeRouteForUser(result.user));
      }
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              placeholder="Enter full name"
            />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Choose a username"
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
            {emailError && <small style={{ color: '#DC2626' }}>{emailError}</small>}
          </div>

          <div className="form-group">
            <label>Phone Number <span style={{ color: '#9CA3AF' }}>(Optional - for contact only)</span></label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              maxLength="10"
              placeholder="Contact number (not used for OTP)"
            />
            {phoneError && <small style={{ color: '#DC2626' }}>{phoneError}</small>}
          </div>

          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange} required>
              <option value="student">Student</option>
              <option value="staff">Staff</option>
              <option value="security">Security</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="8"
                placeholder="Enter password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {passwordError && <small style={{ color: '#DC2626' }}>{passwordError}</small>}
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {confirmPasswordError && <small style={{ color: '#DC2626' }}>{confirmPasswordError}</small>}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
