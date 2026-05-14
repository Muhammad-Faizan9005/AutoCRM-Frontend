import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Plus, Search, Shield, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useNavigate } from 'react-router-dom';
import {
  createAdminUser,
  deactivateAdminUser,
  listAdminUsers,
  updateAdminUser,
} from './adminApi';
import { listTeams } from './teamsApi';

const ROLE_OPTIONS = ['admin', 'manager', 'agent'];
const STATUS_OPTIONS = ['active', 'invited', 'disabled'];

const INITIAL_FORM = {
  full_name: '',
  email: '',
  role: 'manager',
  status: 'invited',
  password: '',
  team_id: '',
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
  const adminActor = isAdmin(currentUser);
  const allowedRoles = adminActor ? ROLE_OPTIONS : ['agent'];
  const defaultRole = adminActor ? 'manager' : 'agent';
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [form, setForm] = useState(() => ({ ...INITIAL_FORM, role: defaultRole }));
  const [error, setError] = useState('');
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Load teams list (for admin team dropdown when adding a sales rep)
  useEffect(() => {
    if (!adminActor) return;
    setTeamsLoading(true);
    listTeams()
      .then((data) => setTeams(data.items || []))
      .catch(() => {})
      .finally(() => setTeamsLoading(false));
  }, [adminActor]);

  const isRepRole = (role) => ['agent', 'sales_rep'].includes(role);

  const load = useCallback(async (s = '') => {
    setError(''); setIsLoading(true);
    try { const d = await listAdminUsers({ search: s, page: 1, pageSize: 200 }); setUsers(d.items); setTotal(d.total); }
    catch (e) { setError(getErr(e, 'Failed to load users.')); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => load(query), 250); return () => clearTimeout(t); }, [load, query]);

  const filtered = useMemo(() => adminActor ? users : users.filter(u => u.role === 'agent'), [users, adminActor]);

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

    // Admin creating a sales rep must pick a team
    if (adminActor && isRepRole(form.role) && !form.team_id) {
      setError('Please select a team for the sales rep.');
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
    if (isRepRole(form.role) && form.team_id) {
      payload.team_id = form.team_id;
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

  const patch = async (id, upd) => {
    setBusyId(String(id)); setError('');
    try { const u = await updateAdminUser(id, upd); setUsers(p => p.map(r => String(r.id) === String(id) ? u : r)); }
    catch (e) { setError(getErr(e, 'Failed to update.')); }
    finally { setBusyId(''); }
  };

  const disable = async (id) => {
    setBusyId(String(id)); setError('');
    try { await deactivateAdminUser(id); setUsers(p => p.map(r => String(r.id) === String(id) ? { ...r, status: 'disabled' } : r)); }
    catch (e) { setError(getErr(e, 'Failed to disable.')); }
    finally { setBusyId(''); }
  };

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>User Registry</div>
              <h1 className="page-title" style={{ fontSize: 'var(--text-2xl)' }}>Manage operators</h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>Add, invite, or deactivate CRM users. Permissions can be tuned from the permissions panel.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setIsAdding(true)}><Plus size={15} /> Add user</button>
          </div>
        </div>

        {/* Search */}
        <div className="card card-padding">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius)', background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>Search directory</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{filtered.length} users shown of {total}</div>
              </div>
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
              {adminActor && isRepRole(form.role) && (
                <label className="text-xs text-[color:var(--admin-muted)]">
                  Assign to team
                  <select
                    value={form.team_id}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, team_id: event.target.value }))
                    }
                    className="admin-select"
                    disabled={teamsLoading}
                  >
                    <option value="">{teamsLoading ? 'Loading teams...' : '— Select a team —'}</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.manager_name || 'unknown manager'})
                      </option>
                    ))}
                  </select>
                </label>
              )}
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
          </div>

          {error && <div style={{ marginTop: 14, padding: 10, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{error}</div>}

          {/* User List */}
          <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            {filtered.map(user => (
              <div key={user.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
                padding: '14px 18px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar avatar-md avatar-accent"><User size={18} /></div>
                  <div>
                    <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{user.full_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}><Mail size={11} /> {user.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 3 }}>Role</div>
                    {adminActor ? (
                      <select className="input" style={{ padding: '4px 8px', fontSize: 'var(--text-xs)', minWidth: 90 }} value={user.role} onChange={e => patch(user.id, { role: e.target.value })} disabled={busyId === String(user.id)}>
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : <span className={`badge ${ROLE_BADGE[user.role] || 'badge-muted'}`}>{user.role}</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 3 }}>Status</div>
                    <select className="input" style={{ padding: '4px 8px', fontSize: 'var(--text-xs)', minWidth: 90 }} value={user.status} onChange={e => patch(user.id, { status: e.target.value })} disabled={busyId === String(user.id)}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/permissions?user=${encodeURIComponent(String(user.id))}`)}><Shield size={13} /> Permissions</button>
                  {!isSelf(user, currentUser) && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => disable(user.id)} disabled={busyId === String(user.id)}>Disable</button>}
                </div>
              </div>
            ))}
            {!isLoading && filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>No users found.</div>
            )}
          </div>
        </div>

        {/* Add User Modal */}
        <AnimatePresence>
          {isAdding && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAdding(false); setForm({ ...INITIAL_FORM, role: defaultRole }); setError(''); }}>
              <motion.div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.97, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--color-text-tertiary)' }}>Invite user</div>
                    <h3 className="section-title" style={{ marginTop: 2 }}>Add a new operator</h3>
                  </div>
                  <button onClick={() => { setIsAdding(false); setError(''); }} className="btn btn-ghost btn-icon" aria-label="Close"><X size={18} /></button>
                </div>
                <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div><label className="label">Full name</label><input className="input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="e.g. Noor Ibrahim" /></div>
                  <div><label className="label">Email</label><input className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="user@company.com" /></div>
                  <div><label className="label">Role</label><select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} disabled={!adminActor}>{allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  <div><label className="label">Status</label><select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div style={{ gridColumn: '1 / -1' }}><label className="label">Password</label><input type="password" className="input" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Optional for invited, required for active" /></div>
                </div>
                {error && <div style={{ margin: '0 20px 12px', padding: 10, background: 'var(--color-danger-subtle)', borderRadius: 'var(--radius)', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{error}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
                  <button className="btn btn-ghost" onClick={() => { setIsAdding(false); setError(''); }} disabled={isSubmitting}>Cancel</button>
                  <button className="btn btn-primary" onClick={addUser} disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add user'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default AdminUsers;
