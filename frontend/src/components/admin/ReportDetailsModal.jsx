import { useState } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import { maskSensitiveDescription } from '../../utils/itemDisplayUtils';
import './ReportDetailsModal.css';

const ReportDetailsModal = ({ report, onClose, onAction }) => {
  const [loading, setLoading] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [showHideConfirm, setShowHideConfirm] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [adminNotes, setAdminNotes] = useState(report?.admin_notes || '');
  const maskedReason = maskSensitiveDescription(report?.reason || '');

  const handleHideItem = async () => {
    if (!report?.id) {
      toast.error('Report ID is missing');
      return;
    }

    setLoading(true);
    try {
      await adminAPI.hideReportedItem(report.id);
      toast.success('Item hidden from public view');
      setShowHideConfirm(false);
      onAction?.();
      onClose();
    } catch (error) {
        console.error('Hide item error:', error);
      toast.error(error.response?.data?.message || 'Failed to hide item');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async () => {
        const userId = report?.posted_by_user_id;
        if (!userId) {
          toast.error('User ID not found. Please refresh and try again.');
          console.error('Missing posted_by_user_id:', report);
          return;
        }

    setLoading(true);
    try {
      await adminAPI.suspendUser(userId, { suspended: true });
      toast.success('User suspended');
      setShowSuspendConfirm(false);
        console.error('Suspend user error:', error);
      onAction?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to suspend user');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async () => {

    const userId = report?.posted_by_user_id;
    if (!userId) {
      toast.error('User ID not found. Please refresh and try again.');
      console.error('Missing posted_by_user_id:', report);
      return;
    }

    setLoading(true);
    try {
      await adminAPI.banUser(userId, { banned: true });
      toast.success('User banned');
      setShowBanConfirm(false);
      onAction?.();
    } catch (error) {
      console.error('Ban user error:', error);
      toast.error(error.response?.data?.message || 'Failed to ban user');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdminNotes = async () => {
    if (!report?.id) {
      toast.error('Report ID is missing');
      return;
    }

    setLoading(true);
    try {
      await adminAPI.handleReport(report.id, { admin_notes: adminNotes });
      toast.success('Admin notes updated');
      setIsEditingNotes(false);
      onAction?.();
    } catch (error) {
      console.error('Save notes error:', error);
      toast.error(error.response?.data?.message || 'Failed to save notes');
    } finally {
      setLoading(false);
    }
  };
  if (!report) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="report-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Report Details</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Report Information */}
          <section className="details-section">
            <h3>Report Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Report ID</label>
                <span>{report.id}</span>
              </div>
              <div className="detail-item">
                <label>Status</label>
                <span className={`status-badge ${report.status}`}>{report.status}</span>
              </div>
              <div className="detail-item">
                <label>Reported By</label>
                <span>{report.reporter_username || 'Unknown'}</span>
              </div>
              <div className="detail-item">
                <label>Reported At</label>
                <span>{report.created_at ? new Date(report.created_at).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
          </section>

          {/* Item Details */}
          <section className="details-section">
            <h3>Item Details</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Item Name</label>
                <span>{report.item_name || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <label>Item Status</label>
                <span className={`status-badge ${report.item_status}`}>{report.item_status || 'active'}</span>
              </div>
              <div className="detail-item full-width">
                <label>Report Reason</label>
                <p className="reason-text">{maskedReason || 'N/A'}</p>
              </div>
            </div>
          </section>

          {/* Posted By User */}
          <section className="details-section">
            <h3>Posted By</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Username</label>
                <span>{report.posted_by_username || 'Unknown'}</span>
              </div>
              <div className="detail-item">
                <label>User ID</label>
                <span>{report.posted_by_user_id || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <label>Full Name</label>
                <span>{report.posted_by_name || 'N/A'}</span>
              </div>
            </div>
          </section>

          {/* Admin Notes */}
          <section className="details-section">
            <div className="notes-header">
              <h3>Admin Notes</h3>
              {!isEditingNotes && (
                <button
                  className="btn-edit-notes"
                  onClick={() => setIsEditingNotes(true)}
                  disabled={loading}
                >
                  Edit
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="notes-editor">
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add admin notes..."
                  disabled={loading}
                />
                <div className="notes-actions">
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveAdminNotes}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsEditingNotes(false);
                      setAdminNotes(report.admin_notes || '');
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="admin-notes">{adminNotes || '(no notes yet)'}</p>
            )}
          </section>
        </div>

        <div className="modal-footer">
          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={() => setShowHideConfirm(true)}
              disabled={loading || report.item_status === 'closed'}
              title={report.item_status === 'closed' ? 'Item already hidden' : 'Hide this item from public view'}
            >
              {report.item_status === 'closed' ? 'Item Hidden' : 'Hide Item'}
            </button>
          </div>

          <div className="button-group">
            <button
              className="btn btn-warning"
              onClick={() => setShowSuspendConfirm(true)}
              disabled={loading}
            >
              Suspend User
            </button>
            <button
              className="btn btn-danger"
              onClick={() => setShowBanConfirm(true)}
              disabled={loading}
            >
              Ban User
            </button>
          </div>

          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Hide Item Confirmation */}
        {showHideConfirm && (
          <div className="confirmation-overlay" onClick={() => setShowHideConfirm(false)}>
            <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
              <h3>Hide Item From Public View?</h3>
              <p>The item "{report.item_name}" will be removed from all public listings, but this report will remain visible in the admin reports page.</p>
              <div className="confirmation-actions">
                <button
                  className="btn btn-danger"
                  onClick={handleHideItem}
                  disabled={loading}
                >
                  {loading ? 'Hiding...' : 'Yes, Hide Item'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowHideConfirm(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suspend User Confirmation */}
        {showSuspendConfirm && (
          <div className="confirmation-overlay" onClick={() => setShowSuspendConfirm(false)}>
            <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
              <h3>Suspend User?</h3>
              <p>This will prevent "{report.posted_by_username}" from posting or claiming items until they are unsuspended.</p>
              <div className="confirmation-actions">
                <button
                  className="btn btn-warning"
                  onClick={handleSuspendUser}
                  disabled={loading}
                >
                  {loading ? 'Suspending...' : 'Yes, Suspend'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowSuspendConfirm(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ban User Confirmation */}
        {showBanConfirm && (
          <div className="confirmation-overlay" onClick={() => setShowBanConfirm(false)}>
            <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
              <h3>Ban User Permanently?</h3>
              <p>This will permanently ban "{report.posted_by_username}" from the platform. This action cannot be easily undone.</p>
              <div className="confirmation-actions">
                <button
                  className="btn btn-danger"
                  onClick={handleBanUser}
                  disabled={loading}
                >
                  {loading ? 'Banning...' : 'Yes, Ban User'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowBanConfirm(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDetailsModal;
