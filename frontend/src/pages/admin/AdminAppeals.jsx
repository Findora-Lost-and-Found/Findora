import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import './AdminAppeals.css';

const AdminAppeals = () => {
  const [searchParams] = useSearchParams();
  const [appeals, setAppeals] = useState([]);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [reportedPosts, setReportedPosts] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const highlightedAppealId = useMemo(() => searchParams.get('appealId'), [searchParams]);

  const loadAppeals = async () => {
    try {
      setLoadingList(true);
      const response = await adminAPI.getAppeals({ page: 0, size: 100, status: statusFilter || undefined });
      setAppeals(response.data?.appeals || []);
    } catch (error) {
      toast.error('Failed to load appeals');
      setAppeals([]);
    } finally {
      setLoadingList(false);
    }
  };

  const loadAppealDetail = async (appealId) => {
    try {
      setLoadingDetail(true);
      const response = await adminAPI.getAppealById(appealId);
      const data = response.data?.data || {};
      setSelectedAppeal(data.appeal || null);
      setReportedPosts(data.reported_posts || []);
      setSelectedUser(data.user || null);
      setAdminNotes((data.appeal?.admin_notes || '').trim());
    } catch (error) {
      toast.error('Failed to load appeal details');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadAppeals();
  }, [statusFilter]);

  useEffect(() => {
    if (highlightedAppealId) {
      loadAppealDetail(highlightedAppealId);
    }
  }, [highlightedAppealId]);

  const handleReview = (appeal) => {
    if (!appeal?.id) return;
    loadAppealDetail(appeal.id);
  };

  const handleAction = async (action) => {
    if (!selectedAppeal?.id) {
      return;
    }

    try {
      setSubmittingAction(true);
      if (action === 'approve') {
        await adminAPI.approveAppeal(selectedAppeal.id, { admin_notes: adminNotes });
        toast.success('Appeal approved');
      } else {
        await adminAPI.declineAppeal(selectedAppeal.id, { admin_notes: adminNotes });
        toast.success('Appeal declined');
      }

      await Promise.all([loadAppeals(), loadAppealDetail(selectedAppeal.id)]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update appeal');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="container admin-appeals-page">
      <div className="admin-appeals-header">
        <h1>Access Appeals</h1>
        <div className="admin-appeals-controls">
          <label htmlFor="appeal-status-filter">Status</label>
          <select
            id="appeal-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </div>

      <div className="admin-appeals-layout">
        <section className="admin-appeals-list">
          {loadingList ? (
            <p>Loading appeals...</p>
          ) : appeals.length === 0 ? (
            <p className="admin-appeals-empty">No appeals found.</p>
          ) : (
            appeals.map((appeal) => (
              <article
                key={appeal.id}
                className={`admin-appeal-item ${String(appeal.id) === String(highlightedAppealId) ? 'highlighted' : ''}`}
              >
                <div>
                  <strong>{appeal.full_name || appeal.username || 'Unknown user'}</strong>
                  <p>@{appeal.username || 'unknown'}</p>
                  <p>{appeal.action_type}</p>
                  <span className={`appeal-status-badge status-${appeal.status}`}>{appeal.status}</span>
                </div>
                <button className="btn-secondary" onClick={() => handleReview(appeal)}>
                  Review
                </button>
              </article>
            ))
          )}
        </section>

        <section className="admin-appeals-detail">
          {loadingDetail ? (
            <p>Loading appeal details...</p>
          ) : !selectedAppeal ? (
            <p>Select an appeal to review.</p>
          ) : (
            <>
              <div className="admin-appeals-card">
                <h2>Appeal Details</h2>
                <p><strong>User:</strong> {selectedUser?.full_name} ({selectedUser?.username})</p>
                <p><strong>Email:</strong> {selectedUser?.email}</p>
                <p><strong>Action:</strong> {selectedAppeal.action_type}</p>
                <p><strong>Status:</strong> <span className={`appeal-status-badge status-${selectedAppeal.status}`}>{selectedAppeal.status}</span></p>
                <p><strong>Appeal Text:</strong></p>
                <div className="admin-appeal-text">{selectedAppeal.appeal_text}</div>

                <label htmlFor="admin-notes">Admin Notes</label>
                <textarea
                  id="admin-notes"
                  rows={4}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Optional notes for this decision"
                  disabled={selectedAppeal.status !== 'pending'}
                />

                {selectedAppeal.status === 'pending' && (
                  <div className="admin-appeal-actions">
                    <button
                      className="btn-success appeal-approve-btn"
                      disabled={submittingAction}
                      onClick={() => handleAction('approve')}
                    >
                      Approve Appeal
                    </button>
                    <button
                      className="btn-danger appeal-decline-btn"
                      disabled={submittingAction}
                      onClick={() => handleAction('decline')}
                    >
                      Decline Appeal
                    </button>
                  </div>
                )}
              </div>

              <div className="admin-appeals-card">
                <h2>Reported Posts By User</h2>
                {reportedPosts.length === 0 ? (
                  <p>No reports found against this user's posts.</p>
                ) : (
                  <div className="admin-appeal-report-list">
                    {reportedPosts.map((post) => (
                      <article key={`${post.report_id}-${post.item_id}`} className="admin-appeal-report-row">
                        <h3>{post.item_name || 'Unknown Item'}</h3>
                        <p><strong>Reason:</strong> {post.reason || 'N/A'}</p>
                        <p><strong>Report status:</strong> {post.report_status || 'pending'}</p>
                        <p><strong>Item status:</strong> {post.item_status || 'active'}</p>
                        <p><strong>Reported at:</strong> {post.reported_at ? new Date(post.reported_at).toLocaleString() : 'N/A'}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminAppeals;
