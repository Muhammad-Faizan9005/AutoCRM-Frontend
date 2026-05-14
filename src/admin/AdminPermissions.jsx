import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck, UserCheck, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_PERMISSIONS, PERMISSION_GROUPS } from './permissionsStore';
import { getAdminUserPermissions, listAdminUsers, updateAdminUserPermissions } from './adminApi';
import { PageTransition, staggerContainer, staggerItem } from '../components/PageTransition';

const getErr = (e, f) => e?.message || e?.data?.detail || f;

const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    aria-pressed={checked}
    style={{
      position: 'relative', width: 44, height: 24, borderRadius: 999, border: 'none', padding: 2,
      cursor: disabled ? 'default' : 'pointer', flexShrink: 0, transition: 'background 0.2s',
      background: checked ? 'var(--color-accent)' : 'var(--color-border-strong)',
      opacity: disabled ? 0.4 : 1,
    }}
  >
    <span style={{
      display: 'block', width: 18, height: 18, borderRadius: '50%',
      background: 'var(--color-text-inverse)', boxShadow: 'var(--shadow-sm)',
      transition: 'transform 0.2s', transform: checked ? 'translateX(20px)' : 'translateX(0)',
    }} />
  </button>
);

const isAdminUser = (user) => {
  if (!user) return false;
  if (user.is_admin || user.is_superuser) return true;
  const role = (user.role || '').toString().toLowerCase();
  return ['admin', 'administrator', 'system manager', 'superuser'].includes(role);
};

const AdminPermissions = ({ currentUser }) => {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState('');
  const [permissions, setPermissions] = useState({ ...DEFAULT_PERMISSIONS });
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');

  // Managers only see CRM Core + Data Operations; admins see everything
  const adminActor = isAdminUser(currentUser);
  const visibleGroups = useMemo(
    () => adminActor
      ? PERMISSION_GROUPS
      : PERMISSION_GROUPS.filter((g) => g.label !== 'Admin Panel'),
    [adminActor]
  );

  useEffect(() => {
    let mounted = true;
    const uid = searchParams.get('user');
    (async () => {
      setUsersLoading(true); setError('');
      try {
        const d = await listAdminUsers({ page: 1, pageSize: 200 });
        if (!mounted) return;
        setUsers(d.items);
        if (d.items.length === 0) { setActiveUserId(''); return; }
        const match = d.items.find(u => String(u.id) === String(uid));
        setActiveUserId(String((match || d.items[0]).id));
      } catch (e) { if (mounted) setError(getErr(e, 'Failed to load users.')); }
      finally { if (mounted) setUsersLoading(false); }
    })();
    return () => { mounted = false; };
  }, [searchParams]);

  const activeUser = useMemo(() => users.find(u => String(u.id) === String(activeUserId)) || null, [users, activeUserId]);

  useEffect(() => {
    let mounted = true;
    if (!activeUser?.id) { setPermissions({ ...DEFAULT_PERMISSIONS }); return; }
    (async () => {
      setPermissionsLoading(true); setError('');
      try {
        const d = await getAdminUserPermissions(activeUser.id);
        if (mounted) { setPermissions({ ...DEFAULT_PERMISSIONS, ...(d?.permissions || {}) }); setSavedAt(null); }
      } catch (e) { if (mounted) { setError(getErr(e, 'Failed to load permissions.')); setPermissions({ ...DEFAULT_PERMISSIONS }); } }
      finally { if (mounted) setPermissionsLoading(false); }
    })();
    return () => { mounted = false; };
  }, [activeUser]);

  const save = async (next) => {
    if (!activeUser?.id) return;
    setSaving(true); setError('');
    try {
      const r = await updateAdminUserPermissions(activeUser.id, next);
      const saved = { ...DEFAULT_PERMISSIONS, ...(r?.permissions || next) };
      setPermissions(saved); setSavedAt(new Date());
      window.dispatchEvent(new CustomEvent('autocrm-permissions-updated', { detail: { userId: activeUser.id, permissions: saved } }));
    } catch (e) { setError(getErr(e, 'Failed to save.')); }
    finally { setSaving(false); }
  };

  const toggle = (key) => { const n = { ...permissions, [key]: !permissions[key] }; setPermissions(n); save(n); };
  const setAll = (v) => {
    const n = visibleGroups.reduce((a, g) => { g.permissions.forEach(p => { a[p.key] = v; }); return a; }, { ...permissions });
    setPermissions(n);
    save(n);
  };

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Permission Studio</div>
              <h1 className="page-title" style={{ fontSize: 'var(--text-2xl)' }}>Feature access matrix</h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>Toggle what each operator can see inside the CRM. Changes apply instantly.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setAll(true)} disabled={!activeUser || saving}>Enable all</button>
              <button className="btn btn-ghost" onClick={() => setAll(false)} disabled={!activeUser || saving}>Lock down</button>
            </div>
          </div>
        </div>

        {error && <div style={{ padding: 12, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
          {/* User List */}
          <div className="card card-padding">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 12 }}>
              <UserCheck size={14} /> Select operator
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {usersLoading && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}><Loader2 size={14} className="animate-spin" /> Loading...</div>}
              {!usersLoading && users.map(u => {
                const active = String(u.id) === String(activeUserId);
                return (
                  <button key={u.id} onClick={() => setActiveUserId(String(u.id))} style={{
                    width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 'var(--radius-lg)', border: 'none',
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: active ? 'var(--color-accent)' : 'transparent',
                    color: active ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                  }}>
                    <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{u.full_name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', opacity: active ? 0.7 : 0.5 }}>{u.email}</div>
                  </button>
                );
              })}
              {!usersLoading && users.length === 0 && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>No users available.</div>}
            </div>
          </div>

          {/* Permission Groups */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {visibleGroups.map((group) => (
              <div key={group.label} className="card card-padding">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)' }}>{group.label}</h3>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                    {permissionsLoading
                      ? 'Loading permissions...'
                      : saving
                        ? 'Saving...'
                        : savedAt
                          ? `Saved ${savedAt.toLocaleTimeString()}`
                          : 'Ready'}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {group.permissions.map(perm => (
                    <div key={perm.key} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                      padding: '14px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
                    }}>
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{perm.label}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>{perm.description}</div>
                      </div>
                      <ToggleSwitch checked={!!permissions?.[perm.key]} onChange={() => toggle(perm.key)} disabled={!activeUser || permissionsLoading || saving} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                <ShieldCheck size={16} /> Changes are persisted to backend permission records.
              </div>
              <button className="btn btn-ghost btn-sm" disabled>Export matrix</button>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default AdminPermissions;
