import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import './PostModal.css';

const PostModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return undefined;

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReportLost = () => {
    onClose();
    navigate('/report-lost');
  };

  const handleReportFound = () => {
    onClose();
    navigate('/report-found');
  };

  return createPortal(
    <div className="modal-root" onClick={onClose}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="post-modal-title" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <h2 id="post-modal-title">Create a Post</h2>
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
    </div>,
    document.body
  );
};

export default PostModal;
