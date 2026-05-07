import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Plus, Search, Shield, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createAdminUser,
  deactivateAdminUser,
  listAdminUsers,
  updateAdminUser,
} from './adminApi';

const ROLE_OPTIONS = ['admin', 'manager', 'agent'];
const STATUS_OPTIONS = ['active', 'invited', 'disabled'];

const INITIAL_FORM = {
  full_name: '',
  email: '',
  role: 'manager',
  status: 'invited',
  password: '',
};

const getErrorMessage = (error, fallback) =>
  error?.message || error?.data?.detail || fallback;

const isAdminUser = (user) => {
  if (!user) return false;
  if (user.is_admin || user.is_superuser) return true;
  const role = (user.role || '').toString().toLowerCase();
  return ['admin', 'administrator', 'system manager', 'superuser'].includes(role);
};

const isCurrentUserRecord = (record, currentUser) => {
  const recordId = String(record?.id || '');
  const currentId = String(currentUser?.id || '');
  if (recordId && currentId && recordId === currentId) return true;

  const recordEmail = String(record?.email || '').toLowerCase();
  const currentEmail = String(currentUser?.email || '').toLowerCase();
  return Boolean(recordEmail && currentEmail && recordEmail === currentEmail);
};

const AdminUsers = ({ currentUser }) => {
  const navigate = useNavigate();
  const adminActor = isAdminUser(currentUser);
  const allowedCreateRoles = adminActor ? ROLE_OPTIONS : ['agent'];
  const defaultRole = adminActor ? 'manager' : 'agent';
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyUserId, setBusyUserId] = useState('');
  const [form, setForm] = useState(() => ({ ...INITIAL_FORM, role: defaultRole }));
  const [error, setError] = useState('');

  const loadUsers = useCallback(async (searchTerm = '') => {
    setError('');
    setIsLoading(true);
    try {
      const data = await listAdminUsers({ search: searchTerm, page: 1, pageSize: 200 });
      setUsers(data.items);
      setTotal(data.total);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Failed to load users.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [loadUsers, query]);

  const filteredUsers = useMemo(() => {
    if (adminActor) return users;
    return users.filter((user) => user.role === 'agent');
  }, [users, adminActor]);

  const resetForm = () => {
    setForm({ ...INITIAL_FORM, role: defaultRole });
    setError('');
  };

  const addUser = async () => {
    const email = form.email.trim();
    if (!email) {
      setError('Email is required.');
      return;
    }

    const fullName = (form.full_name || '').trim() || email.split('@')[0] || '';
    if (fullName.trim().length < 2) {
      setError('Full name must have at least 2 characters.');
      return;
    }

    const password = (form.password || '').trim();
    if (form.status === 'active' && password.length < 6) {
      setError('Active users require a password with at least 6 characters.');
      return;
    }

    const payload = {
      full_name: fullName,
      email,
      role: form.role,
      status: form.status,
    };
    if (password) {
      payload.password = password;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await createAdminUser(payload);
      await loadUsers(query);
      setIsAdding(false);
      resetForm();
    } catch (createError) {
      setError(getErrorMessage(createError, 'Failed to create user.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const patchUser = async (userId, updates) => {
    setBusyUserId(String(userId));
    setError('');
    try {
      const updated = await updateAdminUser(userId, updates);
      setUsers((prev) => prev.map((row) => (String(row.id) === String(userId) ? updated : row)));
    } catch (updateError) {
      setError(getErrorMessage(updateError, 'Failed to update user.'));
    } finally {
      setBusyUserId('');
    }
  };

  const disableUser = async (userId) => {
    setBusyUserId(String(userId));
    setError('');
    try {
      await deactivateAdminUser(userId);
      setUsers((prev) =>
        prev.map((row) =>
          String(row.id) === String(userId) ? { ...row, status: 'disabled' } : row,
        ),
      );
    } catch (deactivateError) {
      setError(getErrorMessage(deactivateError, 'Failed to disable user.'));
    } finally {
      setBusyUserId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="admin-panel p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--admin-muted)]">
            User Registry
          </p>
          <h2 className="admin-title text-2xl mt-2">Manage operators</h2>
          <p className="text-sm text-[color:var(--admin-muted)] mt-2">
            Add, invite, or deactivate CRM users. Permissions can be tuned from
            the permissions panel.
          </p>
        </div>
        <button
          className="admin-pill admin-pill-accent"
          onClick={() => setIsAdding(true)}
        >
          <Plus size={16} />
          Add user
        </button>
      </div>

      <div className="admin-panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[color:var(--admin-accent)]/10 text-[color:var(--admin-accent)] flex items-center justify-center">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </div>
            <div>
              <p className="text-sm font-semibold">Search directory</p>
              <p className="text-xs text-[color:var(--admin-muted)]">
                {filteredUsers.length} users shown of {total}
              </p>
            </div>
          </div>
          <div className="admin-inline-input">
            <Search size={14} className="text-[color:var(--admin-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, or role"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-4 rounded-2xl border border-[color:var(--admin-border)]/60 px-4 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[color:var(--admin-ink)]/10 flex items-center justify-center">
                  <User size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[color:var(--admin-ink)]">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-[color:var(--admin-muted)] flex items-center gap-1">
                    <Mail size={12} />
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs text-[color:var(--admin-muted)]">
                Role
                {adminActor ? (
                  <select
                    value={user.role}
                    onChange={(event) => patchUser(user.id, { role: event.target.value })}
                    className="admin-select"
                    disabled={busyUserId === String(user.id)}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1 text-[11px] rounded-xl border border-[color:var(--admin-border)]/70 px-3 py-2 text-[color:var(--admin-muted)] bg-gray-50">
                    {user.role}
                  </div>
                )}
              </label>
                <label className="text-xs text-[color:var(--admin-muted)]">
                  Status
                  <select
                    value={user.status}
                    onChange={(event) => patchUser(user.id, { status: event.target.value })}
                    className="admin-select"
                    disabled={busyUserId === String(user.id)}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="admin-pill"
                  onClick={() =>
                    navigate(`/admin/permissions?user=${encodeURIComponent(String(user.id))}`)
                  }
                >
                  <Shield size={14} />
                  Permissions
                </button>
                {!isCurrentUserRecord(user, currentUser) && (
                  <button
                    className="admin-pill admin-pill-muted"
                    onClick={() => disableUser(user.id)}
                    disabled={busyUserId === String(user.id)}
                  >
                    Disable
                  </button>
                )}
              </div>
            </div>
          ))}

          {!isLoading && filteredUsers.length === 0 && (
            <div className="rounded-2xl border border-[color:var(--admin-border)]/60 px-4 py-6 text-sm text-[color:var(--admin-muted)]">
              No users found for this filter.
            </div>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="admin-modal">
          <div className="admin-panel p-6 max-w-xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--admin-muted)]">
                  Invite user
                </p>
                <h3 className="admin-title text-xl mt-2">Add a new operator</h3>
              </div>
              <button
                className="admin-pill admin-pill-muted"
                onClick={() => {
                  setIsAdding(false);
                  resetForm();
                }}
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-xs text-[color:var(--admin-muted)]">
                Full name
                <input
                  value={form.full_name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      full_name: event.target.value,
                    }))
                  }
                  className="admin-input"
                  placeholder="e.g. Noor Ibrahim"
                />
              </label>
              <label className="text-xs text-[color:var(--admin-muted)]">
                Email
                <input
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="admin-input"
                  placeholder="user@company.com"
                />
              </label>
              <label className="text-xs text-[color:var(--admin-muted)]">
                Role
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, role: event.target.value }))
                  }
                  className="admin-select"
                  disabled={!adminActor}
                >
                  {allowedCreateRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-[color:var(--admin-muted)]">
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, status: event.target.value }))
                  }
                  className="admin-select"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-[color:var(--admin-muted)] md:col-span-2">
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  className="admin-input"
                  placeholder="Optional for invited users, required for active users"
                />
              </label>
            </div>

            {error && (
              <div className="mt-4 text-xs text-[color:var(--admin-accent-2)]">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="admin-pill admin-pill-muted"
                onClick={() => {
                  setIsAdding(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="admin-pill admin-pill-accent"
                onClick={addUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add user'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
