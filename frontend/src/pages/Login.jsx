import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeRouteForUser } from '../utils/navigation';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

const Login = () => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [lastLoginError, setLastLoginError] = useState('');
  const [petitionSubmitting, setPetitionSubmitting] = useState(false);
  const [petitionData, setPetitionData] = useState({
    identifier: '',
    type: 'suspend',
    reason: ''
  });
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const suspensionNotice = sessionStorage.getItem('suspensionNotice');
    if (suspensionNotice) {
      toast.error(suspensionNotice);
      sessionStorage.removeItem('suspensionNotice');
    }
  }, []);

  const showPetitionPanel = /suspend|ban/i.test(lastLoginError);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLastLoginError('');

    const result = await login(formData.identifier, formData.password);

    if (result.success) {
      navigate(getHomeRouteForUser(result.user));
    } else {
      const message = result.message || 'Login failed';
      setLastLoginError(message);
      setPetitionData((prev) => ({
        ...prev,
        identifier: prev.identifier || formData.identifier,
        type: /ban/i.test(message) ? 'ban' : 'suspend'
      }));
    }

    setLoading(false);
  };

  const handlePetitionChange = (event) => {
    const { name, value } = event.target;
    setPetitionData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePetitionSubmit = async (event) => {
    event.preventDefault();
    setPetitionSubmitting(true);

    try {
      await authAPI.submitPetition({
        identifier: petitionData.identifier,
        type: petitionData.type,
        reason: petitionData.reason
      });
      toast.success('Petition submitted. Admin will review your request.');
      setPetitionData((prev) => ({ ...prev, reason: '' }));
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit petition';
      toast.error(message);
    } finally {
      setPetitionSubmitting(false);
    }
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
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter password"
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

        {showPetitionPanel && (
          <div className="auth-petition" style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Request account review</h3>
            <p style={{ margin: '0 0 0.75rem', color: '#6b7280', fontSize: '0.9rem' }}>
              Your account is currently restricted. Submit a petition and admins will review it.
            </p>
            <form onSubmit={handlePetitionSubmit}>
              <div className="form-group">
                <label>Email or Username</label>
                <input
                  type="text"
                  name="identifier"
                  value={petitionData.identifier}
                  onChange={handlePetitionChange}
                  required
                  placeholder="Enter email or username"
                />
              </div>

              <div className="form-group">
                <label>Petition Type</label>
                <select name="type" value={petitionData.type} onChange={handlePetitionChange} required>
                  <option value="suspend">Suspension Review</option>
                  <option value="ban">Ban Appeal</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reason</label>
                <textarea
                  name="reason"
                  value={petitionData.reason}
                  onChange={handlePetitionChange}
                  required
                  rows={3}
                  placeholder="Explain why your account should be reinstated"
                />
              </div>

              <button type="submit" className="btn-primary" disabled={petitionSubmitting}>
                {petitionSubmitting ? 'Submitting...' : 'Submit Petition'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
