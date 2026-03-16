import './MatchCard.css';

const MatchCard = ({ match, otpValue, onOtpChange, onClaimExisting, onClaimViaOtp, onResendOtp }) => {
  const found = match?.foundItem || {};
  const score = Number(match?.score || 0).toFixed(2);
  const threshold = match?.threshold || 80;

  return (
    <div className="match-card">
      <div className="match-card-header">
        <h4>{found.name || 'Possible match'}</h4>
        <span className={`score-badge score-${threshold}`}>{score}%</span>
      </div>

      <div className="match-card-body">
        <p><strong>Category:</strong> {found.category || 'N/A'}</p>
        <p><strong>Location:</strong> {found.location || 'Unknown'}</p>
        <p><strong>Status:</strong> {match?.status || 'PENDING'}</p>
      </div>

      <div className="match-card-actions">
        <button type="button" className="btn btn-primary" onClick={() => onClaimExisting(match)}>
          Claim (use existing flow)
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => onResendOtp(match.matchId)}>
          Resend OTP
        </button>
      </div>

      <div className="match-otp-row">
        <input
          type="text"
          maxLength={6}
          placeholder="Enter OTP"
          value={otpValue || ''}
          onChange={(event) => onOtpChange(match.matchId, event.target.value)}
        />
        <button type="button" className="btn btn-claim" onClick={() => onClaimViaOtp(match.matchId)}>
          Claim via OTP
        </button>
      </div>
    </div>
  );
};

export default MatchCard;
