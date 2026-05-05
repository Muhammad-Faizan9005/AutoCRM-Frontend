import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, User, Mail, Shield } from 'lucide-react';
import { getStoredUsers, saveStoredUsers, getUserKey } from './adminStorage';
import { useNavigate } from 'react-router-dom';

const ROLE_OPTIONS = ['admin', 'manager', 'agent'];
const STATUS_OPTIONS = ['active', 'invited', 'disabled'];

const AdminUsers = ({ currentUser }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState(() => getStoredUsers(currentUser));
  const [query, setQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'manager',
    status: 'invited',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    saveStoredUsers(users);
  }, [users]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      `${user.full_name} ${user.email}`.toLowerCase().includes(term),
    );
  }, [users, query]);

  const resetForm = () => {
    setForm({ full_name: '', email: '', role: 'manager', status: 'invited' });
    setError('');
  };

  const addUser = () => {
    if (!form.email.trim()) {
      setError('Email is required.');
      return;
    }

    const exists = users.some(
      (user) => user.email.toLowerCase() === form.email.toLowerCase(),
    );
    if (exists) {
      setError('This user already exists.');
      return;
    }

    const next = {
      id: String(Date.now()),
      full_name: form.full_name || form.email.split('@')[0],
      email: form.email.trim(),
      role: form.role,
      status: form.status,
    };

    setUsers((prev) => [next, ...prev]);
    setIsAdding(false);
    resetForm();
  };

  const updateUser = (userId, updates) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, ...updates } : user,
      ),
    );
  };

  const removeUser = (userId) => {
    setUsers((prev) => prev.filter((user) => user.id !== userId));
  };

  const isCurrentUser = (user) =>
    getUserKey(user) === getUserKey(currentUser);

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
              <Search size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold">Search directory</p>
              <p className="text-xs text-[color:var(--admin-muted)]">
                {filteredUsers.length} users tracked
              </p>
            </div>
          </div>
          <div className="admin-inline-input">
            <Search size={14} className="text-[color:var(--admin-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email"
            />
          </div>
        </div>

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
                  <select
                    value={user.role}
                    onChange={(event) =>
                      updateUser(user.id, { role: event.target.value })
                    }
                    className="admin-select"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-[color:var(--admin-muted)]">
                  Status
                  <select
                    value={user.status}
                    onChange={(event) =>
                      updateUser(user.id, { status: event.target.value })
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
                <button
                  className="admin-pill"
                  onClick={() =>
                    navigate(
                      `/admin/permissions?user=${encodeURIComponent(
                        getUserKey(user),
                      )}`,
                    )
                  }
                >
                  <Shield size={14} />
                  Permissions
                </button>
                {!isCurrentUser(user) && (
                  <button
                    className="admin-pill admin-pill-muted"
                    onClick={() => removeUser(user.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
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
                >
                  {ROLE_OPTIONS.map((role) => (
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
              >
                Cancel
              </button>
              <button className="admin-pill admin-pill-accent" onClick={addUser}>
                Add user
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
