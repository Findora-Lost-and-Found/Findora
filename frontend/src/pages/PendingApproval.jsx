import { Link } from 'react-router-dom';

const PendingApproval = () => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Approval Pending</h2>
        <p>
          Your registration request has been submitted. Please wait for approval before accessing
          security or admin features.
        </p>
        <div className="auth-links" style={{ marginTop: '1rem' }}>
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
