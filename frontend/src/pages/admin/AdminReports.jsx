import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import MobileWarning from '../../components/MobileWarning';

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

  useEffect(() => {
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;
    setIsMobile(mobile);

    const loadReports = async () => {
      try {
        const response = await adminAPI.getReports({ page: 0, size: 100 });
        setReports(response.data?.reports || []);
        setPendingReports(response.data?.pendingReports || 0);
      } catch (error) {
        setReports([]);
        setPendingReports(0);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (isMobile) {
    return <MobileWarning userRole="admin" />;
  }

  return (
    <div className="container">
      <div className="section-header" style={{ borderBottom: 'none', marginBottom: '1rem' }}>
        <h1>Admin Reports</h1>
        <span>Pending: {pendingReports}</span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Reporter</th>
              <th>Item</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={5}>No reports available.</td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.reporter_username || report.reporter_name || 'Unknown'}</td>
                  <td>{report.item_name || 'Unknown Item'}</td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{report.reason || 'N/A'}</td>
                  <td>{report.status || 'pending'}</td>
                  <td>{formatDateTime(report.created_at || report.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminReports;