import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { securityAPI } from '../../services/api';

const parseTransactions = (payload) => {
  const apiRows = payload?.transactions || payload?.items || payload?.content || [];

  return apiRows.map((row, index) => {
    const id = row.id || `${row.itemId || row.item_id || 'tx'}-${row.createdAt || row.created_at || index}`;
    const status = String(row.status || '').toUpperCase();

    return {
      id,
      itemName: row.itemName || row.item_name || 'Unnamed Item',
      location: row.location || 'Unknown location',
      owner: row.ownerName || row.finderName || row.full_name || row.username || 'Unknown user',
      status,
      date: row.createdAt || row.created_at || row.updatedAt || row.updated_at || row.date || null
    };
  });
};

const parsePendingClaims = (payload) => {
  const rows = payload?.claims || payload?.items || payload?.content || [];
  return rows.map((row, index) => ({
    id: row.id || `pending-${index}`,
    itemName: row.item_name || row.itemName || 'Unnamed Item',
    claimer: row.full_name || row.fullName || row.username || 'Unknown claimer',
    location: row.location || 'Unknown location',
    date: row.claimed_at || row.created_at || row.createdAt || null
  }));
};

const parseReceivedItems = (payload) => {
  const rows = payload?.items || payload?.content || [];
  return rows.map((row, index) => ({
    id: row.id || row.itemId || `received-${index}`,
    itemName: row.item_name || row.itemName || row.name || 'Unnamed Item',
    owner: row.full_name || row.fullName || row.username || row.finderName || 'Unknown user',
    location: row.location || 'Unknown location',
    date: row.date || row.created_at || row.createdAt || null
  }));
};

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString();
};

const SecurityTransactions = () => {
  const [loading, setLoading] = useState(true);
  const [pendingClaims, setPendingClaims] = useState([]);
  const [receivedClaims, setReceivedClaims] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const response = await securityAPI.getTransactions({ page: 0, size: 100 });
        const normalized = parseTransactions(response?.data);

        const pending = normalized.filter((tx) => tx.status === 'REQUESTED');
        const received = normalized.filter((tx) => tx.status === 'RECEIVED');

        setPendingClaims(
          pending.map((tx) => ({
            id: tx.id,
            itemName: tx.itemName,
            claimer: tx.owner,
            location: tx.location,
            date: tx.date
          }))
        );

        setReceivedClaims(
          received.map((tx) => ({
            id: tx.id,
            itemName: tx.itemName,
            owner: tx.owner,
            location: tx.location,
            date: tx.date
          }))
        );
      } catch (transactionError) {
        try {
          const [pendingResponse, receivedResponse] = await Promise.all([
            securityAPI.getPendingClaims(),
            securityAPI.getHeldItems()
          ]);

          setPendingClaims(parsePendingClaims(pendingResponse?.data));
          setReceivedClaims(parseReceivedItems(receivedResponse?.data));
        } catch (fallbackError) {
          const message = fallbackError.response?.data?.message || 'Failed to load transactions';
          toast.error(message);
          setPendingClaims([]);
          setReceivedClaims([]);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const hasData = useMemo(() => pendingClaims.length > 0 || receivedClaims.length > 0, [pendingClaims, receivedClaims]);

  if (loading) {
    return <div className="loading">Loading transactions...</div>;
  }

  return (
    <div className="container">
      <h1>Transactions</h1>

      {!hasData && <p>No transaction history available.</p>}

      <div className="found-items-section" style={{ marginBottom: '2rem' }}>
        <div className="section-header">
          <h2>Pending Claims History</h2>
          <span>Total: {pendingClaims.length}</span>
        </div>

        {pendingClaims.length === 0 ? (
          <p>No pending claim records.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Claimer</th>
                  <th>Location</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {pendingClaims.map((claim) => (
                  <tr key={claim.id}>
                    <td>{claim.itemName}</td>
                    <td>{claim.claimer}</td>
                    <td>{claim.location}</td>
                    <td>{formatDateTime(claim.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="found-items-section">
        <div className="section-header">
          <h2>Received Claims History</h2>
          <span>Total: {receivedClaims.length}</span>
        </div>

        {receivedClaims.length === 0 ? (
          <p>No received claim records.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Handled For</th>
                  <th>Location</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {receivedClaims.map((claim) => (
                  <tr key={claim.id}>
                    <td>{claim.itemName}</td>
                    <td>{claim.owner}</td>
                    <td>{claim.location}</td>
                    <td>{formatDateTime(claim.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityTransactions;
