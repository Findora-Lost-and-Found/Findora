import { useEffect, useMemo, useRef, useState } from 'react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import './AdminUsers.css';

const PAGE_SIZE = 8;

const toBoolean = (value) => value === true || value === 1 || value === '1' || value === 'true';

const getStatus = (user) => {
  if (user.isBanned) return 'banned';
  if (user.isSuspended) return 'suspended';
  if (!user.isApproved) return 'pending';
  return 'active';
};

const getStatusMeta = (status) => {
  if (status === 'banned') return { label: 'Banned', className: 'au-badge au-badge-banned' };
  if (status === 'suspended') return { label: 'Suspended', className: 'au-badge au-badge-suspended' };
  if (status === 'pending') return { label: 'Pending', className: 'au-badge au-badge-pending' };
  return { label: 'Active', className: 'au-badge au-badge-active' };
};

const roleLabel = (role) => {
  if (!role) return 'Unknown';
  return String(role).charAt(0).toUpperCase() + String(role).slice(1).toLowerCase();
};

const toInitials = (fullName, username) => {
  const source = String(fullName || username || 'User').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const normalizeUser = (user) => {
  const normalized = {
    id: user.id,
    username: user.username || user.userName || 'unknown',
    fullName: user.full_name || user.fullName || user.name || 'Unknown User',
    email: user.email || '-',
    role: String(user.role || '').toLowerCase(),
    isBanned: toBoolean(user.is_banned ?? user.isBanned),
    isSuspended: toBoolean(user.is_suspended ?? user.isSuspended),
    isApproved: toBoolean(user.is_approved ?? user.isApproved),
    createdAt: user.created_at || user.createdAt || ''
  };

  normalized.status = getStatus(normalized);
  normalized.initials = toInitials(normalized.fullName, normalized.username);
  return normalized;
};

const compareValues = (a, b, direction) => {
  if (a === b) return 0;
  if (a == null) return direction === 'asc' ? -1 : 1;
  if (b == null) return direction === 'asc' ? 1 : -1;

  const left = typeof a === 'string' ? a.toLowerCase() : a;
  const right = typeof b === 'string' ? b.toLowerCase() : b;

  if (left < right) return direction === 'asc' ? -1 : 1;
  if (left > right) return direction === 'asc' ? 1 : -1;
  return 0;
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'fullName', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    mode: null,
    user: null
  });

  const actionMenuRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setMenuOpenFor(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpenFor(null);
        setConfirmState((prev) => (prev.open ? { open: false, mode: null, user: null } : prev));
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const usersRes = await adminAPI.getUsers();
      const normalized = (usersRes.data.users || []).map(normalizeUser);
      setUsers(normalized);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const requestAction = (mode, user) => {
    const destructive = mode === 'ban' || mode === 'suspend';
    setMenuOpenFor(null);

    if (!destructive) {
      if (mode === 'unban') {
        handleBan(user.id, false);
      }
      if (mode === 'unsuspend') {
        handleSuspend(user.id, false);
      }
      return;
    }

    setConfirmState({ open: true, mode, user });
  };

  const executeConfirmedAction = async () => {
    const { mode, user } = confirmState;
    if (!mode || !user) return;

    if (mode === 'ban') {
      await handleBan(user.id, true);
    }

    if (mode === 'suspend') {
      await handleSuspend(user.id, true);
    }

    setConfirmState({ open: false, mode: null, user: null });
  };

  const handleBan = async (userId, banned) => {
    try {
      await adminAPI.banUser(userId, banned);
      toast.success(banned ? 'User banned' : 'User unbanned');
      await loadData();
    } catch (error) {
      toast.error('Failed to update ban status');
    }
  };

  const handleSuspend = async (userId, suspended) => {
    try {
      await adminAPI.suspendUser(userId, suspended);
      toast.success(suspended ? 'User suspended' : 'Suspension lifted');
      await loadData();
    } catch (error) {
      toast.error('Failed to update suspension status');
    }
  };

  const handleSort = (key) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();

    return users.filter((user) => {
      const roleMatch = roleFilter === 'all' || user.role === roleFilter;
      const statusMatch = statusFilter === 'all' || user.status === statusFilter;
      const searchMatch = !term
        || user.fullName.toLowerCase().includes(term)
        || user.email.toLowerCase().includes(term)
        || user.username.toLowerCase().includes(term);

      return roleMatch && statusMatch && searchMatch;
    });
  }, [users, query, roleFilter, statusFilter]);

  const sortedUsers = useMemo(() => {
    const data = [...filteredUsers];
    data.sort((a, b) => {
      if (sort.key === 'role') return compareValues(roleLabel(a.role), roleLabel(b.role), sort.direction);
      if (sort.key === 'status') return compareValues(a.status, b.status, sort.direction);
      return compareValues(a[sort.key], b[sort.key], sort.direction);
    });
    return data;
  }, [filteredUsers, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedUsers.slice(start, start + PAGE_SIZE);
  }, [sortedUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, roleFilter, statusFilter, sort]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const renderSortableHeader = (label, key) => {
    const active = sort.key === key;
    const direction = active ? sort.direction : 'none';
    const indicator = !active ? '↕' : direction === 'asc' ? '↑' : '↓';

    return (
      <button
        type="button"
        className={`au-sort-trigger ${active ? 'active' : ''}`}
        onClick={() => handleSort(key)}
        aria-label={`Sort by ${label} ${direction === 'asc' ? 'descending' : 'ascending'}`}
      >
        <span>{label}</span>
        <span className="au-sort-indicator" aria-hidden="true">{indicator}</span>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="au-page">
          <div className="au-header">
            <div className="au-header-block">
              <div className="au-skeleton au-skeleton-title" />
              <div className="au-skeleton au-skeleton-subtitle" />
            </div>
            <div className="au-skeleton au-skeleton-controls" />
          </div>
          <div className="au-panel">
            <div className="au-skeleton-table">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="au-skeleton-row" key={`skeleton-${index}`}>
                  <div className="au-skeleton au-skeleton-avatar" />
                  <div className="au-skeleton au-skeleton-line" />
                  <div className="au-skeleton au-skeleton-line short" />
                  <div className="au-skeleton au-skeleton-badge" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="au-page">
        <div className="au-header">
          <div className="au-header-block">
            <h1>User Management</h1>
            <p>Manage access, account state, and role governance across all platform users.</p>
          </div>
          <div className="au-search-wrap">
            <label htmlFor="user-search" className="au-search-label">Search users</label>
            <input
              id="user-search"
              type="search"
              className="au-search-input"
              placeholder="Search by name, email, or username"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="au-toolbar" role="region" aria-label="User filters">
          <div className="au-filter-group">
            <label htmlFor="role-filter">Role</label>
            <select id="role-filter" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="security">Security</option>
              <option value="staff">Staff</option>
              <option value="student">Student</option>
            </select>
          </div>

          <div className="au-filter-group">
            <label htmlFor="status-filter">Status</label>
            <select id="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          <div className="au-toolbar-summary" aria-live="polite">
            Showing <strong>{paginatedUsers.length}</strong> of <strong>{sortedUsers.length}</strong> users
          </div>
        </div>

        <div className="au-panel">
          {sortedUsers.length === 0 ? (
            <div className="au-empty-state" role="status" aria-live="polite">
              <h3>No users found</h3>
              <p>Try changing search text or filters to see more results.</p>
              <button
                type="button"
                className="au-soft-btn"
                onClick={() => {
                  setQuery('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="au-table-wrap" ref={actionMenuRef}>
                <table className="au-table">
                  <thead>
                    <tr>
                      <th>{renderSortableHeader('User', 'fullName')}</th>
                      <th>{renderSortableHeader('Role', 'role')}</th>
                      <th>{renderSortableHeader('Status', 'status')}</th>
                      <th>{renderSortableHeader('Created', 'createdAt')}</th>
                      <th className="au-actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => {
                      const statusMeta = getStatusMeta(user.status);
                      const menuOpen = menuOpenFor === user.id;

                      return (
                        <tr key={user.id} tabIndex={0}>
                          <td>
                            <div className="au-user-cell">
                              <div className="au-avatar" aria-hidden="true">{user.initials}</div>
                              <div className="au-user-meta">
                                <div className="au-user-line-primary">{user.fullName}</div>
                                <div className="au-user-line-secondary">{user.email}</div>
                                <div className="au-user-line-tertiary">@{user.username}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="au-role-pill">{roleLabel(user.role)}</span>
                          </td>
                          <td>
                            <span className={statusMeta.className}>{statusMeta.label}</span>
                          </td>
                          <td>
                            <span className="au-muted">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
                          </td>
                          <td className="au-actions-cell">
                            <div className="au-menu-wrap">
                              <button
                                type="button"
                                className="au-menu-trigger"
                                onClick={() => setMenuOpenFor(menuOpen ? null : user.id)}
                                aria-label={`Open actions for ${user.fullName}`}
                                aria-expanded={menuOpen}
                                aria-haspopup="menu"
                                title="More actions"
                              >
                                ⋯
                              </button>

                              {menuOpen && (
                                <div className="au-menu" role="menu" aria-label="User actions">
                                  {user.isBanned ? (
                                    <button type="button" role="menuitem" onClick={() => requestAction('unban', user)} title="Lift ban">
                                      🔓 Unban user
                                    </button>
                                  ) : (
                                    <button type="button" role="menuitem" className="danger" onClick={() => requestAction('ban', user)} title="Ban account">
                                      ⛔ Ban user
                                    </button>
                                  )}

                                  {user.isSuspended ? (
                                    <button type="button" role="menuitem" onClick={() => requestAction('unsuspend', user)} title="Lift suspension">
                                      ✅ Unsuspend user
                                    </button>
                                  ) : (
                                    <button type="button" role="menuitem" className="warning" onClick={() => requestAction('suspend', user)} title="Temporarily suspend account">
                                      ⏸ Suspend user
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="au-mobile-list" ref={actionMenuRef}>
                {paginatedUsers.map((user) => {
                  const statusMeta = getStatusMeta(user.status);
                  const menuOpen = menuOpenFor === user.id;

                  return (
                    <article key={`mobile-${user.id}`} className="au-mobile-card">
                      <div className="au-mobile-header">
                        <div className="au-user-cell">
                          <div className="au-avatar" aria-hidden="true">{user.initials}</div>
                          <div className="au-user-meta">
                            <div className="au-user-line-primary">{user.fullName}</div>
                            <div className="au-user-line-secondary">{user.email}</div>
                          </div>
                        </div>

                        <div className="au-menu-wrap">
                          <button
                            type="button"
                            className="au-menu-trigger"
                            onClick={() => setMenuOpenFor(menuOpen ? null : user.id)}
                            aria-label={`Open actions for ${user.fullName}`}
                            title="More actions"
                          >
                            ⋯
                          </button>
                          {menuOpen && (
                            <div className="au-menu" role="menu" aria-label="User actions">
                              {user.isBanned ? (
                                <button type="button" role="menuitem" onClick={() => requestAction('unban', user)}>
                                  🔓 Unban user
                                </button>
                              ) : (
                                <button type="button" role="menuitem" className="danger" onClick={() => requestAction('ban', user)}>
                                  ⛔ Ban user
                                </button>
                              )}
                              {user.isSuspended ? (
                                <button type="button" role="menuitem" onClick={() => requestAction('unsuspend', user)}>
                                  ✅ Unsuspend user
                                </button>
                              ) : (
                                <button type="button" role="menuitem" className="warning" onClick={() => requestAction('suspend', user)}>
                                  ⏸ Suspend user
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="au-mobile-grid">
                        <div>
                          <span className="au-mobile-label">Username</span>
                          <span className="au-mobile-value">@{user.username}</span>
                        </div>
                        <div>
                          <span className="au-mobile-label">Role</span>
                          <span className="au-mobile-value">{roleLabel(user.role)}</span>
                        </div>
                        <div>
                          <span className="au-mobile-label">Status</span>
                          <span className={statusMeta.className}>{statusMeta.label}</span>
                        </div>
                        <div>
                          <span className="au-mobile-label">Created</span>
                          <span className="au-mobile-value">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="au-pagination" role="navigation" aria-label="Users pagination">
                <button
                  type="button"
                  className="au-soft-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </button>
                <span className="au-pagination-meta">Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  className="au-soft-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        {confirmState.open && (
          <div className="au-modal-backdrop" role="presentation" onClick={() => setConfirmState({ open: false, mode: null, user: null })}>
            <div
              className="au-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-description"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 id="confirm-title">Confirm action</h3>
              <p id="confirm-description">
                {confirmState.mode === 'ban'
                  ? `Ban ${confirmState.user?.fullName}? This user will lose access until unbanned.`
                  : `Suspend ${confirmState.user?.fullName}? This user will be temporarily restricted.`}
              </p>
              <div className="au-modal-actions">
                <button
                  type="button"
                  className="au-soft-btn"
                  onClick={() => setConfirmState({ open: false, mode: null, user: null })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="au-danger-soft-btn"
                  onClick={executeConfirmedAction}
                >
                  Confirm
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
