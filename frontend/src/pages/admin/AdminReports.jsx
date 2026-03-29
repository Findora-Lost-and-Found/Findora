import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import MobileWarning from '../../components/MobileWarning';
import ReportDetailsModal from '../../components/admin/ReportDetailsModal';
import { maskSensitiveDescription } from '../../utils/itemDisplayUtils';
import './AdminReports.css';

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [pendingReports, setPendingReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getReports({ 
        page: 0, 
        size: 100,
        status: filterStatus || undefined 
      });
      setReports(response.data?.reports || []);
      setPendingReports(response.data?.pendingReports || 0);
    } catch (error) {
      toast.error('Failed to load reports');
      setReports([]);
      setPendingReports(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;
    setIsMobile(mobile);

    loadReports();
  }, [filterStatus]);

  if (loading) {
    return <div className="ar-loading">Loading reports...</div>;
  }

  if (isMobile) {
    return <MobileWarning userRole="admin" />;
  }

  return (
    <div className="admin-reports-page">
      <div className="ar-section-header">
        <h1>Admin Reports</h1>
        <div className="ar-header-controls">
          <span className="ar-pending-badge">Pending: {pendingReports}</span>
          <div className="ar-filter-group">
            <label htmlFor="status-filter">Filter by Status:</label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="ar-filter-select"
            >
              <option value="">All Reports</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      <div className="ar-table-container">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Reporter</th>
              <th>Item</th>
              <th>Reason</th>
              <th>Posted By</th>
              <th>Item Status</th>
              <th>Report Status</th>
              <th>Reported At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state">
                  {filterStatus ? 'No reports found with this status.' : 'No reports available.'}
                </td>
              </tr>
            ) : (
              reports.map((report) => {
                const maskedReason = maskSensitiveDescription(report.reason || '');
                return (
                  <tr key={report.id} className={`report-row status-${report.status}`}>
                  <td>
                    <button
                      className="ar-item-link"
                      onClick={() => setSelectedReport(report)}
                      title="Click to view details"
                    >
                      <span className="ar-username">{report.reporter_username || 'Unknown'}</span>
                    </button>
                    <span className="ar-user-id">{report.reporter_name}</span>
                  </td>
                  <td>
                    <button
                      className="ar-item-link"
                      onClick={() => setSelectedReport(report)}
                      title="Click to view details"
                    >
                      {report.item_name || 'Unknown Item'}
                    </button>
                  </td>
                  <td>
                    <div className="ar-reason-cell">
                      {maskedReason.split('\n')[0] || 'N/A'}
                      {maskedReason.length > 50 && '...'}
                    </div>
                  </td>
                  <td>
                    <button
                      className="ar-item-link"
                      onClick={() => setSelectedReport(report)}
                      title="Click to view details"
                    >
                      <span className="ar-username">{report.posted_by_username || 'Unknown'}</span>
                    </button>
                    <span className="ar-user-id">{report.posted_by_name}</span>
                  </td>
                  <td>
                    <span className={`status-badge status-${report.item_status || 'active'}`}>
                      {report.item_status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${report.status}`}>
                      {report.status || 'Pending'}
                    </span>
                  </td>
                  <td>
                    <span className="ar-datetime">{formatDateTime(report.created_at)}</span>
                  </td>
                  <td>
                    <button
                      className="ar-btn-action"
                      onClick={() => setSelectedReport(report)}
                      title="View and manage"
                    >
                      Details
                    </button>
                  </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onAction={loadReports}
        />
      )}
    </div>
  );
};

export default AdminReports;