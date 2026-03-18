import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { reportsAPI } from '../services/api';
import './ReportPost.css';

const ReportPost = () => {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reportReasons = [
    {
      id: 'terms',
      title: 'Violates Terms and Conditions',
      description: 'This post violates our community guidelines'
    },
    {
      id: 'spam',
      title: 'Spam or Misleading Information',
      description: 'This post contains false or misleading information'
    },
    {
      id: 'wrong_info',
      title: 'Wrong Item Information',
      description: 'The item information is incorrect or incomplete'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReason) {
      toast.error('Please select a report reason');
      return;
    }

    const selectedOption = reportReasons.find((reason) => reason.id === selectedReason);

    try {
      setSubmitting(true);
      await reportsAPI.create({
        itemId,
        reason: selectedOption?.title || selectedReason,
        description
      });
      toast.success('Report submitted successfully');
      setSubmitted(true);

      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="container">
        <div className="report-success">
          <div className="success-icon">✓</div>
          <h2>Report Submitted</h2>
          <p>Thank you! Our admin team will review your report.</p>
          <p className="redirect-text">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="report-page">
        <div className="report-header">
          <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
          <h1>Report This Post</h1>
        </div>

        <form onSubmit={handleSubmit} className="report-form">
          <div className="form-section">
            <h2>Select a Report Reason</h2>
            
            <div className="reason-options">
              {reportReasons.map((reason) => (
                <label key={reason.id} className="reason-option">
                  <input
                    type="radio"
                    name="report-reason"
                    value={reason.id}
                    checked={selectedReason === reason.id}
                    onChange={(e) => setSelectedReason(e.target.value)}
                  />
                  <div className="reason-content">
                    <strong>{reason.title}</strong>
                    <p>{reason.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label htmlFor="description">Additional Details (Optional)</label>
            <textarea
              id="description"
              className="form-input"
              placeholder="Provide any additional information about this report..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="5"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportPost;
