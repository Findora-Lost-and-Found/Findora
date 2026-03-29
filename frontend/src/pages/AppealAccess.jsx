import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';

const AppealAccess = () => {
  const [searchParams] = useSearchParams();
  const initialIdentifier = useMemo(() => searchParams.get('identifier') || '', [searchParams]);

  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!identifier.trim()) {
      toast.error('Username or email is required');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide your appeal details');
      return;
    }

    try {
      setSubmitting(true);
      await authAPI.submitAccessAppeal({ identifier: identifier.trim(), reason: reason.trim() });
      setSubmitted(true);
      toast.success('Appeal submitted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit appeal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card appeal-access-card">
        <h2>Access Appeal</h2>
        <p className="appeal-access-subtitle">
          Suspended or banned users can submit an appeal for admin review.
        </p>

        {submitted ? (
          <div className="appeal-access-success">
            <p>Your appeal was submitted. Admins have been notified.</p>
            <Link to="/login" className="btn-primary">
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username or Email</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter username or email"
                required
              />
            </div>

            <div className="form-group">
              <label>Appeal Details</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={6}
                placeholder="Explain why your account should be restored..."
                required
              />
            </div>

            <div className="appeal-access-actions">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Appeal'}
              </button>
              <Link to="/login" className="btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AppealAccess;
