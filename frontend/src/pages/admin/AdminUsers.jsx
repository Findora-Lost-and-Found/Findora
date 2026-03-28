import { useEffect, useMemo, useRef, useState } from 'react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import './AdminUsers.css';

const PAGE_SIZE = 10;

const toBoolean = (value) => value === true || value === 1 || value === '1' || value === 'true';

const getStatus = (user) => {
  const isBanned = toBoolean(user.is_banned);
  const isSuspended = toBoolean(user.is_suspended);
  const isApproved = toBoolean(user.is_approved);

  if (isBanned) return 'banned';
  if (isSuspended) return 'suspended';
  if (!isApproved) return 'pending';
  return 'active';
};

const getStatusMeta = (status) => {
  if (status === 'banned') return { label: 'Banned', className: 'is-banned' };
  if (status === 'suspended') return { label: 'Suspended', className: 'is-suspended' };
  if (status === 'pending') return { label: 'Pending', className: 'is-pending' };
  return { label: 'Active', className: 'is-active' };
};

const getInitials = (name, username) => {
  const source = String(name || username || 'U').trim();
  if (!source) return 'U';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const formatRole = (role) => {
  const normalized = String(role || '').toLowerCase();
  if (!normalized) return 'Unknown';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('full_name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuUserId, setOpenMenuUserId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.um-actions')) {
        setOpenMenuUserId(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenMenuUserId(null);
        setConfirmAction(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (confirmAction && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [confirmAction]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const usersRes = await adminAPI.getUsers();
      setUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  const normalizeSearch = (value) => String(value || '').trim().toLowerCase();

  const roleOptions = useMemo(() => {
    const roles = Array.from(new Set(users.map((user) => String(user.role || '').toLowerCase()).filter(Boolean)));
    return roles.sort();
  }, [users]);

  const processedUsers = useMemo(() => {
    const query = normalizeSearch(search);

    const filtered = users.filter((user) => {
      const role = String(user.role || '').toLowerCase();
      const status = getStatus(user);
      const haystack = [user.username, user.full_name, user.email, role, status]
        .map((entry) => String(entry || '').toLowerCase())
        .join(' ');

      const matchesSearch = !query || haystack.includes(query);
      const matchesRole = roleFilter === 'all' || role === roleFilter;
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      const leftStatus = getStatus(a);
      const rightStatus = getStatus(b);
      const leftRole = String(a.role || '').toLowerCase();
      const rightRole = String(b.role || '').toLowerCase();

      let leftValue = '';
      let rightValue = '';

      if (sortKey === 'status') {
        leftValue = leftStatus;
        rightValue = rightStatus;
      } else if (sortKey === 'role') {
        leftValue = leftRole;
        rightValue = rightRole;
      } else if (sortKey === 'email') {
        leftValue = String(a.email || '').toLowerCase();
        rightValue = String(b.email || '').toLowerCase();
      } else {
        leftValue = String(a.full_name || a.username || '').toLowerCase();
        rightValue = String(b.full_name || b.username || '').toLowerCase();
      }

      const compared = leftValue.localeCompare(rightValue, undefined, { sensitivity: 'base' });
      return sortDirection === 'asc' ? compared : compared * -1;
    });

    return sorted;
  }, [users, search, roleFilter, statusFilter, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(processedUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedUsers = processedUsers.slice(startIndex, startIndex + PAGE_SIZE);

  const buildAction = (user, type, value) => {
    const name = user.full_name || user.username || 'this user';
    if (type === 'ban') {
      return {
        userId: user.id,
        type,
        value,
        title: value ? 'Ban user?' : 'Lift ban?',
        message: value
          ? `This will block ${name} from accessing the platform.`
          : `This will restore access for ${name}.`,
        confirmLabel: value ? 'Confirm ban' : 'Lift ban'
      };
    }
    return {
      userId: user.id,
      type,
      value,
      title: value ? 'Suspend user?' : 'Lift suspension?',
      message: value
        ? `${name} will be temporarily restricted.`
        : `${name} will be active again if not banned.`,
      confirmLabel: value ? 'Confirm suspend' : 'Lift suspension'
    };
  };

  const requestAction = (action) => {
    setOpenMenuUserId(null);
    setConfirmAction(action);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.type === 'ban') {
        await adminAPI.banUser(confirmAction.userId, confirmAction.value);
        toast.success(confirmAction.value ? 'User banned' : 'User unbanned');
      } else {
        await adminAPI.suspendUser(confirmAction.userId, confirmAction.value);
        toast.success(confirmAction.value ? 'User suspended' : 'Suspension lifted');
      }

      setConfirmAction(null);
      loadData();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const sortIndicator = (key) => {
    if (sortKey !== key) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const renderRow = (user) => {
    const status = getStatus(user);
    const statusMeta = getStatusMeta(status);
    const isBanned = status === 'banned';
    const isSuspended = status === 'suspended';

    return (
      <tr key={user.id} className="um-row">
        <td>
          <div className="um-user-cell">
            <div className="um-avatar" aria-hidden="true">{getInitials(user.full_name, user.username)}</div>
            <div className="um-user-text">
              <div className="um-user-name">{user.full_name || user.username || 'Unknown User'}</div>
              <div className="um-user-email">{user.email || 'No email provided'}</div>
            </div>
          </div>
        </td>
        <td>
          <span className="um-username">@{user.username || 'unknown'}</span>
        </td>
        <td>
          <span className="um-role-chip">{formatRole(user.role)}</span>
        </td>
        <td>
          <span className={`um-status-badge ${statusMeta.className}`}>{statusMeta.label}</span>
        </td>
        <td>
          <div className="um-actions">
            <button
              type="button"
              className="um-menu-trigger"
              aria-label={`Open actions for ${user.full_name || user.username || 'user'}`}
              aria-haspopup="menu"
              aria-expanded={openMenuUserId === user.id}
              title="More actions"
              onClick={() => setOpenMenuUserId((prev) => (prev === user.id ? null : user.id))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setOpenMenuUserId((prev) => (prev === user.id ? null : user.id));
                }
              }}
            >
              ⋯
            </button>

            {openMenuUserId === user.id && (
              <div className="um-menu" role="menu" aria-label="User actions">
                <button
                  type="button"
                  role="menuitem"
                  className="um-menu-item"
                  title={isBanned ? 'Lift ban' : 'Ban user'}
                  onClick={() => requestAction(buildAction(user, 'ban', !isBanned))}
                >
                  <span aria-hidden="true">⛔</span>
                  <span>{isBanned ? 'Lift ban' : 'Ban user'}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="um-menu-item"
                  title={isSuspended ? 'Lift suspension' : 'Suspend user'}
                  onClick={() => requestAction(buildAction(user, 'suspend', !isSuspended))}
                >
                  <span aria-hidden="true">⏸</span>
                  <span>{isSuspended ? 'Lift suspension' : 'Suspend user'}</span>
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderCard = (user) => {
    const status = getStatus(user);
    const statusMeta = getStatusMeta(status);
    const isBanned = status === 'banned';
    const isSuspended = status === 'suspended';

    return (
      <article key={`card-${user.id}`} className="um-user-card">
        <div className="um-card-header">
          <div className="um-user-cell">
            <div className="um-avatar" aria-hidden="true">{getInitials(user.full_name, user.username)}</div>
            <div className="um-user-text">
              <div className="um-user-name">{user.full_name || user.username || 'Unknown User'}</div>
              <div className="um-user-email">{user.email || 'No email provided'}</div>
            </div>
          </div>
          <span className={`um-status-badge ${statusMeta.className}`}>{statusMeta.label}</span>
        </div>
        <div className="um-card-meta">
          <div><span className="um-meta-label">Username</span><span>@{user.username || 'unknown'}</span></div>
          <div><span className="um-meta-label">Role</span><span>{formatRole(user.role)}</span></div>
        </div>
        <div className="um-card-actions">
          <button
            type="button"
            className="um-inline-action"
            onClick={() => requestAction(buildAction(user, 'ban', !isBanned))}
            title={isBanned ? 'Lift ban' : 'Ban user'}
          >
            {isBanned ? 'Lift ban' : 'Ban'}
          </button>
          <button
            type="button"
            className="um-inline-action"
            onClick={() => requestAction(buildAction(user, 'suspend', !isSuspended))}
            title={isSuspended ? 'Lift suspension' : 'Suspend user'}
          >
            {isSuspended ? 'Lift suspension' : 'Suspend'}
          </button>
        </div>
      </article>
    );
  };

  const renderSkeleton = () => {
    return (
      <div className="um-skeleton-wrap" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`skeleton-${index}`} className="um-skeleton-row">
            <div className="um-skeleton um-skeleton-avatar" />
            <div className="um-skeleton-block">
              <div className="um-skeleton um-skeleton-line lg" />
              <div className="um-skeleton um-skeleton-line sm" />
            </div>
            <div className="um-skeleton um-skeleton-chip" />
            <div className="um-skeleton um-skeleton-chip" />
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="um-page">
          <div className="um-header">
            <h1>User Management</h1>
            <p>Manage admin, staff, security, and student access from one place.</p>
          </div>
          {renderSkeleton()}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="um-page">
        <div className="um-header">
          <h1>User Management</h1>
          <p>Manage admin, staff, security, and student access from one place.</p>
        </div>

        <div className="um-toolbar" role="region" aria-label="User filters and search">
          <div className="um-toolbar-left">
            <label className="um-filter-field">
              <span>Role</span>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="all">All roles</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>{formatRole(role)}</option>
                ))}
              </select>
            </label>

            <label className="um-filter-field">
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>
            </label>
          </div>

          <div className="um-search-wrap">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, username"
              aria-label="Search users"
            />
          </div>
        </div>

        <div className="um-results-info">
          <span>{processedUsers.length} user{processedUsers.length === 1 ? '' : 's'} found</span>
        </div>

        {processedUsers.length === 0 ? (
          <div className="um-empty-state" role="status" aria-live="polite">
            <h3>No users match the current filters</h3>
            <p>Try adjusting your search, role, or status filter.</p>
          </div>
        ) : (
          <>
            <div className="um-table-wrap">
              <table className="um-table">
                <thead>
                  <tr>
                    <th>
                      <button type="button" className="um-sort" onClick={() => handleSort('full_name')}>
                        User <span aria-hidden="true">{sortIndicator('full_name')}</span>
                      </button>
                    </th>
                    <th>Username</th>
                    <th>
                      <button type="button" className="um-sort" onClick={() => handleSort('role')}>
                        Role <span aria-hidden="true">{sortIndicator('role')}</span>
                      </button>
                    </th>
                    <th>
                      <button type="button" className="um-sort" onClick={() => handleSort('status')}>
                        Status <span aria-hidden="true">{sortIndicator('status')}</span>
                      </button>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => renderRow(user))}
                </tbody>
              </table>
            </div>

            <div className="um-card-list">
              {paginatedUsers.map((user) => renderCard(user))}
            </div>

            <div className="um-pagination" role="navigation" aria-label="User table pagination">
              <button
                type="button"
                className="um-page-btn"
                disabled={safePage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </button>
              <span className="um-page-text">Page {safePage} of {totalPages}</span>
              <button
                type="button"
                className="um-page-btn"
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
              </button>
            </div>
          </>
        )}

        {confirmAction && (
          <div className="um-modal-overlay" role="presentation" onClick={() => setConfirmAction(null)}>
            <div
              className="um-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="um-confirm-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 id="um-confirm-title">{confirmAction.title}</h3>
              <p>{confirmAction.message}</p>
              <div className="um-modal-actions">
                <button type="button" className="um-btn-ghost" onClick={() => setConfirmAction(null)}>
                  Cancel
                </button>
                <button
                  ref={confirmButtonRef}
                  type="button"
                  className="um-btn-danger-soft"
                  onClick={handleConfirmAction}
                >
                  {confirmAction.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
