import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeRouteForUser } from '../utils/navigation';
import PasswordInput from '../components/PasswordInput';

const Login = () => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [accessBlockedMessage, setAccessBlockedMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const isAppealCooldownActive = /appeal blocked for inappropriate language|submit another appeal after/i.test(accessBlockedMessage);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.identifier, formData.password);

    if (result.success) {
      setAccessBlockedMessage('');
      navigate(getHomeRouteForUser(result.user));
    } else {
      const message = String(result.message || '');
      const isAccessBlocked = /suspend|banned|ban|appeal blocked|submit another appeal/i.test(message);
      setAccessBlockedMessage(isAccessBlocked ? message : '');
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login to Findora</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email or Username</label>
            <input
              type="text"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              required
              placeholder="Enter email or username"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <PasswordInput
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/forgot-password">Forgot Password?</Link>
          <span>|</span>
          <Link to="/signup">Create Account</Link>
        </div>

        {accessBlockedMessage && (
          <div className="login-appeal-block">
            <p>{accessBlockedMessage}</p>
            {!isAppealCooldownActive && (
              <Link
                to={`/appeal-access?identifier=${encodeURIComponent(formData.identifier || '')}`}
                className="btn-secondary login-appeal-link"
              >
                Submit Access Appeal
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
