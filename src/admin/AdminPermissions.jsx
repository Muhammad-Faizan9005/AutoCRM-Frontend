import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_PERMISSIONS, PERMISSION_GROUPS } from './permissionsStore';
import {
  getAdminUserPermissions,
  listAdminUsers,
  updateAdminUserPermissions,
} from './adminApi';

const getErrorMessage = (error, fallback) =>
  error?.message || error?.data?.detail || fallback;

const AdminPermissions = () => {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState('');
  const [permissions, setPermissions] = useState({ ...DEFAULT_PERMISSIONS });
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const initialUserId = searchParams.get('user');

    const loadUsers = async () => {
      setUsersLoading(true);
      setError('');
      try {
        const data = await listAdminUsers({ page: 1, pageSize: 200 });
        if (!mounted) return;
        setUsers(data.items);

        if (data.items.length === 0) {
          setActiveUserId('');
          return;
        }

        const matched = data.items.find((user) => String(user.id) === String(initialUserId));
        setActiveUserId(String((matched || data.items[0]).id));
      } catch (loadError) {
        if (mounted) {
          setError(getErrorMessage(loadError, 'Failed to load users.'));
        }
      } finally {
        if (mounted) {
          setUsersLoading(false);
        }
      }
    };

    loadUsers();
    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const activeUser = useMemo(
    () => users.find((user) => String(user.id) === String(activeUserId)) || null,
    [users, activeUserId],
  );

  useEffect(() => {
    let mounted = true;
    const loadPermissions = async () => {
      if (!activeUser?.id) {
        setPermissions({ ...DEFAULT_PERMISSIONS });
        return;
      }

      setPermissionsLoading(true);
      setError('');
      try {
        const data = await getAdminUserPermissions(activeUser.id);
        if (mounted) {
          setPermissions({ ...DEFAULT_PERMISSIONS, ...(data?.permissions || {}) });
          setSavedAt(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(getErrorMessage(loadError, 'Failed to load permissions.'));
          setPermissions({ ...DEFAULT_PERMISSIONS });
        }
      } finally {
        if (mounted) {
          setPermissionsLoading(false);
        }
      }
    };

    loadPermissions();
    return () => {
      mounted = false;
    };
  }, [activeUser]);

  const savePermissions = async (nextPermissions) => {
    if (!activeUser?.id) return;

    setSaving(true);
    setError('');
    try {
      const response = await updateAdminUserPermissions(activeUser.id, nextPermissions);
      const saved = { ...DEFAULT_PERMISSIONS, ...(response?.permissions || nextPermissions) };
      setPermissions(saved);
      setSavedAt(new Date());

      window.dispatchEvent(
        new CustomEvent('autocrm-permissions-updated', {
          detail: {
            userId: activeUser.id,
            permissions: saved,
          },
        }),
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Failed to save permissions.'));
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permissionKey) => {
    const next = {
      ...permissions,
      [permissionKey]: !permissions[permissionKey],
    };
    setPermissions(next);
    savePermissions(next);
  };

  const setAll = (value) => {
    const next = PERMISSION_GROUPS.reduce((acc, group) => {
      group.permissions.forEach((permission) => {
        acc[permission.key] = value;
      });
      return acc;
    }, {});
    setPermissions(next);
    savePermissions(next);
  };

  return (
    <div className="space-y-6">
      <div className="admin-panel p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--admin-muted)]">
            Permission Studio
          </p>
          <h2 className="admin-title text-2xl mt-2">Feature access matrix</h2>
          <p className="text-sm text-[color:var(--admin-muted)] mt-2">
            Toggle what each operator can see inside the CRM. Changes apply
            instantly to the navigation and routes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="admin-pill" onClick={() => setAll(true)} disabled={!activeUser || saving}>
            Enable all
          </button>
          <button
            className="admin-pill admin-pill-muted"
            onClick={() => setAll(false)}
            disabled={!activeUser || saving}
          >
            Lock down
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="admin-panel p-5">
          <div className="flex items-center gap-2 text-xs text-[color:var(--admin-muted)]">
            <UserCheck size={14} />
            Select operator
          </div>
          <div className="mt-4 space-y-2">
            {usersLoading && (
              <div className="flex items-center gap-2 text-xs text-[color:var(--admin-muted)]">
                <Loader2 size={14} className="animate-spin" />
                Loading users...
              </div>
            )}

            {!usersLoading &&
              users.map((user) => {
                const key = String(user.id);
                const isActive = key === String(activeUserId);
                return (
                  <button
                    key={key}
                    className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                      isActive
                        ? 'bg-[color:var(--admin-ink)] text-white'
                        : 'bg-[color:var(--admin-panel)] text-[color:var(--admin-ink)]'
                    }`}
                    onClick={() => setActiveUserId(key)}
                  >
                    <div className="font-semibold">{user.full_name}</div>
                    <div className={`text-xs ${isActive ? 'text-white/70' : 'text-[color:var(--admin-muted)]'}`}>
                      {user.email}
                    </div>
                  </button>
                );
              })}

            {!usersLoading && users.length === 0 && (
              <div className="text-xs text-[color:var(--admin-muted)]">
                No users available.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.label} className="admin-panel p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{group.label}</h3>
                <div className="text-xs text-[color:var(--admin-muted)]">
                  {permissionsLoading
                    ? 'Loading permissions...'
                    : saving
                      ? 'Saving...'
                      : savedAt
                        ? `Saved ${savedAt.toLocaleTimeString()}`
                        : 'Ready'}
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {group.permissions.map((permission) => (
                  <div
                    key={permission.key}
                    className="rounded-2xl border border-[color:var(--admin-border)]/60 px-4 py-4 flex items-start justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {permission.label}
                      </p>
                      <p className="text-xs text-[color:var(--admin-muted)]">
                        {permission.description}
                      </p>
                    </div>
                    <button
                      className={`admin-toggle ${
                        permissions?.[permission.key] ? 'is-on' : ''
                      }`}
                      onClick={() => togglePermission(permission.key)}
                      aria-pressed={Boolean(permissions?.[permission.key])}
                      disabled={!activeUser || permissionsLoading || saving}
                    >
                      <span />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="admin-panel p-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-[color:var(--admin-muted)]">
              <ShieldCheck size={16} />
              Changes are persisted to backend permission records.
            </div>
            <button className="admin-pill" disabled>
              Export matrix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPermissions;
