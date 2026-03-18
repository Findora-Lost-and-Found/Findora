import { useNavigate } from 'react-router-dom';
import './PostModal.css';

const PostModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleReportLost = () => {
    onClose();
    navigate('/report-lost');
  };

  const handleReportFound = () => {
    onClose();
    navigate('/report-found');
  };

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose}></div>

      {/* Modal */}
      <div className="modal-container">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Create a Post</h2>
            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="modal-body">
            <p className="modal-subtitle">What would you like to report?</p>

            <div className="modal-buttons">
              <button
                onClick={handleReportLost}
                className="modal-btn modal-btn-lost"
              >
                <span className="modal-btn-icon">🔍</span>
                <span className="modal-btn-text">Report Lost Item</span>
                <span className="modal-btn-desc">Report something you've lost</span>
              </button>

              <button
                onClick={handleReportFound}
                className="modal-btn modal-btn-found"
              >
                <span className="modal-btn-icon">📦</span>
                <span className="modal-btn-text">Report Found Item</span>
                <span className="modal-btn-desc">Report something you've found</span>
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PostModal;
