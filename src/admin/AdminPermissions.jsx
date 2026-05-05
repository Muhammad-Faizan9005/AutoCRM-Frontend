import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getStoredUsers, getUserKey } from './adminStorage';
import {
  PERMISSION_GROUPS,
  getPermissionsForUser,
  setPermissionsForUser,
} from './permissionsStore';

const AdminPermissions = ({ currentUser }) => {
  const [searchParams] = useSearchParams();
  const [users] = useState(() => getStoredUsers(currentUser));
  const initialUserKey = searchParams.get('user');
  const [activeUserKey, setActiveUserKey] = useState(
    initialUserKey || getUserKey(users[0]),
  );
  const activeUser = useMemo(
    () => users.find((user) => getUserKey(user) === activeUserKey) || users[0],
    [users, activeUserKey],
  );

  const [permissions, setPermissions] = useState(() =>
    getPermissionsForUser(activeUser),
  );
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    setPermissions(getPermissionsForUser(activeUser));
  }, [activeUser]);

  const savePermissions = (nextPermissions) => {
    const key = getUserKey(activeUser);
    setPermissionsForUser(key, nextPermissions);
    setSavedAt(new Date());
    window.dispatchEvent(new Event('autocrm-permissions-updated'));
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
          <button className="admin-pill" onClick={() => setAll(true)}>
            Enable all
          </button>
          <button className="admin-pill admin-pill-muted" onClick={() => setAll(false)}>
            Lock down
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="admin-panel p-5">
          <div className="flex items-center gap-2 text-xs text-[color:var(--admin-muted)]">
            <UserCheck size={14} />
            Select operator
          </div>
          <div className="mt-4 space-y-2">
            {users.map((user) => {
              const key = getUserKey(user);
              const isActive = key === activeUserKey;
              return (
                <button
                  key={key}
                  className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                    isActive
                      ? 'bg-[color:var(--admin-ink)] text-white'
                      : 'bg-[color:var(--admin-panel)] text-[color:var(--admin-ink)]'
                  }`}
                  onClick={() => setActiveUserKey(key)}
                >
                  <div className="font-semibold">{user.full_name}</div>
                  <div className={`text-xs ${isActive ? 'text-white/70' : 'text-[color:var(--admin-muted)]'}`}>
                    {user.email}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.label} className="admin-panel p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{group.label}</h3>
                <div className="text-xs text-[color:var(--admin-muted)]">
                  {savedAt
                    ? `Saved ${savedAt.toLocaleTimeString()}`
                    : 'Not saved yet'}
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
              Permission changes are stored locally until backend wiring is
              completed.
            </div>
            <button className="admin-pill">Export matrix</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPermissions;
