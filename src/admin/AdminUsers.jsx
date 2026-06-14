import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Plus, Search, Shield, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useNavigate } from 'react-router-dom';
import {
  createAdminUser,
  deactivateAdminUser,
  enableAdminUser,
  listAdminUsers,
  listFailedInvites,
  deleteFailedInvite,
  listDeletedUsers,
  reinviteFailedInvite,
  revokeAdminInvite,
  updateAdminUser,
} from './adminApi';
import { listTeams } from './teamsApi';
import { PageTransition } from '../components/PageTransition';
import { PageLoader } from '../components/PageLoader';
import { toast } from '../utils/toast';

const ROLE_OPTIONS = ['admin', 'manager', 'agent'];
const ROLE_BADGE = { admin: 'badge-accent', manager: 'badge-success', agent: 'badge-muted' };
const STATUS_OPTIONS = ['active', 'invited', 'disabled'];

const INITIAL_FORM = {
  full_name: '',
  email: '',
  role: 'manager',
  status: 'active',
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
  const adminActor = isAdminUser(currentUser);
  const allowedRoles = adminActor ? ROLE_OPTIONS : ['agent'];
  const defaultRole = adminActor ? 'manager' : 'agent';
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [failedBusyId, setFailedBusyId] = useState('');
  const [form, setForm] = useState(() => ({ ...INITIAL_FORM, role: defaultRole }));
  const [error, setError] = useState('');
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [failedInvites, setFailedInvites] = useState([]);
  const [failedLoading, setFailedLoading] = useState(false);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [deletedTotal, setDeletedTotal] = useState(0);
  const [listRef] = useAutoAnimate();

  const isRepRole = (role) => ['agent', 'sales_rep'].includes(role);

  const load = useCallback(async (s = '') => {
    setError(''); setIsLoading(true); setFailedLoading(true);
    try {
      const [usersPayload, failedPayload, deletedPayload] = await Promise.all([
        listAdminUsers({ search: s, page: 1, pageSize: 200 }),
        listFailedInvites(),
        listDeletedUsers({ page: 1, pageSize: 200 }),
      ]);
      setUsers(usersPayload.items);
      setTotal(usersPayload.total);
      setFailedInvites(Array.isArray(failedPayload) ? failedPayload : []);
      setDeletedUsers(deletedPayload.items);
      setDeletedTotal(deletedPayload.total);
    }
    catch (e) { setError(getErrorMessage(e, 'Failed to load users.')); }
    finally { setIsLoading(false); setFailedLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => load(query), 250); return () => clearTimeout(t); }, [load, query]);

  useEffect(() => {
    if (!adminActor) {
      setTeams([]);
      return undefined;
    }

    let isActive = true;
    setTeamsLoading(true);
    listTeams()
      .then((payload) => {
        if (isActive) setTeams(payload.items || []);
      })
      .catch(() => {
        if (isActive) setTeams([]);
      })
      .finally(() => {
        if (isActive) setTeamsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [adminActor]);

  const visibleUsers = useMemo(() => {
    const scopedUsers = adminActor ? users : users.filter(u => u.role === 'agent');
    return scopedUsers.filter(u => u.status !== 'invited');
  }, [users, adminActor]);

  const pendingInvites = useMemo(() => {
    const scopedUsers = adminActor ? users : users.filter(u => u.role === 'agent');
    return scopedUsers.filter(u => u.status === 'invited');
  }, [users, adminActor]);

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
    if (password && form.status !== 'invited') {
      payload.password = password;
    }
    if (isRepRole(form.role) && form.team_id) {
      payload.team_id = form.team_id;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await createAdminUser(payload);
      await load(query);
      setIsAdding(false);
      setForm({ ...INITIAL_FORM, role: defaultRole });
      toast.success(form.status === 'invited' ? 'Invitation email sent. User will appear after accepting.' : 'User added successfully.');
    } catch (createError) {
      const message = getErrorMessage(createError, 'Failed to create user.');
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const patch = async (id, upd) => {
    setBusyId(String(id)); setError('');
    try { const u = await updateAdminUser(id, upd); setUsers(p => p.map(r => String(r.id) === String(id) ? u : r)); }
    catch (e) { setError(getErrorMessage(e, 'Failed to update.')); }
    finally { setBusyId(''); }
  };

  const disable = async (id) => {
    setBusyId(String(id)); setError('');
    try { const updated = await updateAdminUser(id, { status: 'disabled' }); setUsers(p => p.map(r => String(r.id) === String(id) ? updated : r)); }
    catch (e) { setError(getErrorMessage(e, 'Failed to disable.')); }
    finally { setBusyId(''); }
  };

  const revokeInvite = async (id) => {
    setBusyId(String(id)); setError('');
    try {
      await revokeAdminInvite(id);
      setUsers(p => p.filter(r => String(r.id) !== String(id)));
      await load(query);
    }
    catch (e) { setError(getErrorMessage(e, 'Failed to revoke invite.')); }
    finally { setBusyId(''); }
  };

  const enableUser = async (id) => {
    setBusyId(String(id)); setError('');
    try {
      const updated = await enableAdminUser(id);
      setUsers(p => p.map(r => String(r.id) === String(id) ? updated : r));
    }
    catch (e) { setError(getErrorMessage(e, 'Failed to enable user.')); }
    finally { setBusyId(''); }
  };

  const deleteUser = async (id) => {
    const confirmDelete = window.confirm('Delete this user? This will archive their permissions and unassign their leads, deals, tasks, and related records.');
    if (!confirmDelete) return;
    setBusyId(String(id)); setError('');
    try {
      await deactivateAdminUser(id);
      setUsers(p => p.filter(r => String(r.id) !== String(id)));
      await load(query);
      toast.success('User deleted and assignments cleared.');
    }
    catch (e) {
      const message = getErrorMessage(e, 'Failed to delete user.');
      setError(message);
      toast.error(message);
    }
    finally { setBusyId(''); }
  };

  const handleReinviteFailed = async (failedId) => {
    setFailedBusyId(String(failedId)); setError('');
    try {
      await reinviteFailedInvite(failedId);
      setFailedInvites((prev) => prev.filter((item) => String(item.id) !== String(failedId)));
      await load(query);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to re-invite.'));
    } finally {
      setFailedBusyId('');
    }
  };

  const handleDeleteFailed = async (failedId) => {
    setFailedBusyId(String(failedId)); setError('');
    try {
      await deleteFailedInvite(failedId);
      setFailedInvites((prev) => prev.filter((item) => String(item.id) !== String(failedId)));
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to delete failed invite.'));
    } finally {
      setFailedBusyId('');
    }
  };

  const formatFailedReason = (reason) => {
    if (!reason) return 'Unknown';
    if (reason === 'expired') return 'Expired';
    if (reason === 'revoked') return 'Revoked';
    if (reason === 'send_failed') return 'Send failed';
    return reason;
  };

  const countEnabledPermissions = (permissions) => {
    if (!permissions || typeof permissions !== 'object') return 0;
    return Object.values(permissions).filter(Boolean).length;
  };

  if (isLoading && users.length === 0) {
    return <PageLoader title="Loading user console" message="Fetching users, teams, invites, deleted users, and access data." />;
  }

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
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{visibleUsers.length} users shown of {Math.max(total - pendingInvites.length, visibleUsers.length)}</div>
              </div>
            </div>
            <div style={{ flex: 1, maxWidth: 300 }}>
              <input
                className="input input-sm"
                placeholder="Search by name or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {error && <div style={{ marginTop: 14, padding: 10, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{error}</div>}

          {/* User List */}
          <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            {visibleUsers.map(user => (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>Role</span>
                    {adminActor ? (
                      <select className="input" style={{ padding: '6px 10px', fontSize: 'var(--text-sm)', minWidth: 100 }} value={user.role} onChange={e => patch(user.id, { role: e.target.value })} disabled={busyId === String(user.id)}>
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : <span className={`badge ${ROLE_BADGE[user.role] || 'badge-muted'}`}>{user.role}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>Status</span>
                    <select className="input" style={{ padding: '6px 10px', fontSize: 'var(--text-sm)', minWidth: 100 }} value={user.status} onChange={e => patch(user.id, { status: e.target.value })} disabled={busyId === String(user.id)}>
                      {STATUS_OPTIONS.filter(s => s !== 'invited').map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-secondary" onClick={() => navigate(`/admin/permissions?user=${encodeURIComponent(String(user.id))}`)}>
                    <Shield size={13} /> Permissions
                  </button>
                  {!isCurrentUserRecord(user, currentUser) && (
                    user.status === 'invited' ? (
                      <button className="btn btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => revokeInvite(user.id)} disabled={busyId === String(user.id)}>
                        Revoke invite
                      </button>
                    ) : user.status === 'disabled' ? (
                      <button className="btn btn-ghost" style={{ color: 'var(--color-success)' }} onClick={() => enableUser(user.id)} disabled={busyId === String(user.id)}>
                        Enable
                      </button>
                    ) : (
                      <button className="btn btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => disable(user.id)} disabled={busyId === String(user.id)}>
                        Disable
                      </button>
                    )
                  )}
                  {!isCurrentUserRecord(user, currentUser) && user.status !== 'invited' && (
                    <button className="btn btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => deleteUser(user.id)} disabled={busyId === String(user.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!isLoading && visibleUsers.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>No users found.</div>
            )}
          </div>
        </div>

        <div className="card card-padding">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--color-text-tertiary)' }}>Pending Invites</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                These people have been emailed an invitation and are not added as users until they accept the link.
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
              {pendingInvites.length} waiting
            </div>
          </div>

          {pendingInvites.length === 0 ? (
            <div style={{ marginTop: 16, fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
              No pending invitations.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {pendingInvites.map((invite) => (
                <div key={invite.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
                  padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>
                      {invite.full_name || invite.email}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                      <Mail size={11} /> {invite.email}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span className={`badge ${ROLE_BADGE[invite.role] || 'badge-muted'}`}>{invite.role}</span>
                    <span className="badge badge-warning">Invite sent</span>
                    <button
                      className="btn btn-ghost"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => revokeInvite(invite.id)}
                      disabled={busyId === String(invite.id)}
                    >
                      Revoke invite
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-padding">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--color-text-tertiary)' }}>Failed Invites</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Re-invite or delete failed invitations (expired or revoked).
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
              {failedInvites.length} total
            </div>
          </div>

          {failedLoading && (
            <div style={{ marginTop: 16, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
              Loading failed invites...
            </div>
          )}

          {!failedLoading && failedInvites.length === 0 && (
            <div style={{ marginTop: 16, fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
              No failed invites yet.
            </div>
          )}

          {!failedLoading && failedInvites.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {failedInvites.map((invite) => (
                <div key={invite.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
                  padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>
                      {invite.full_name || invite.email}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                      <Mail size={11} /> {invite.email}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span className="badge badge-muted">{invite.role}</span>
                    <span className="badge badge-warning">{formatFailedReason(invite.reason)}</span>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleReinviteFailed(invite.id)}
                      disabled={failedBusyId === String(invite.id)}
                    >
                      {failedBusyId === String(invite.id) ? 'Sending...' : 'Re-invite'}
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => handleDeleteFailed(invite.id)}
                      disabled={failedBusyId === String(invite.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-padding">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--color-text-tertiary)' }}>Deleted Users</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Deleted operators are archived here with their permission snapshot and unassignment cleanup counts.
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
              {deletedTotal} total
            </div>
          </div>

          {isLoading && (
            <div style={{ marginTop: 16, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
              Loading deleted users...
            </div>
          )}

          {!isLoading && deletedUsers.length === 0 && (
            <div style={{ marginTop: 16, fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
              No deleted users yet.
            </div>
          )}

          {!isLoading && deletedUsers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {deletedUsers.map((deletedUser) => {
                const metadata = deletedUser.metadata || {};
                const unassignedTotal = Object.values(metadata).reduce((sum, value) => sum + Number(value || 0), 0);
                return (
                  <div key={deletedUser.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
                    padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>
                        {deletedUser.full_name || deletedUser.email}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        <Mail size={11} /> {deletedUser.email}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span className="badge badge-muted">{deletedUser.role}</span>
                      <span className="badge badge-warning">{countEnabledPermissions(deletedUser.permissions)} permissions flagged</span>
                      <span className="badge badge-muted">{unassignedTotal} records unassigned</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        {deletedUser.deleted_at ? new Date(deletedUser.deleted_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add User Modal */}
        <AnimatePresence>
          {isAdding && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAdding(false); setForm({ ...INITIAL_FORM, role: defaultRole }); setError(''); }}>
              <motion.div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.97, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--color-text-tertiary)' }}>Add user</div>
                    <h3 className="section-title" style={{ marginTop: 2 }}>Add a new operator</h3>
                  </div>
                  <button onClick={() => { setIsAdding(false); setError(''); }} className="btn btn-ghost btn-icon" aria-label="Close"><X size={18} /></button>
                </div>
                <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div><label className="label">Full name</label><input className="input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="e.g. Noor Ibrahim" /></div>
                  <div><label className="label">Email</label><input className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="user@company.com" /></div>
                  <div>
                    <label className="label">Role</label>
                    <select
                      className="input"
                      value={form.role}
                      onChange={e => {
                        const nextRole = e.target.value;
                        setForm(p => ({
                          ...p,
                          role: nextRole,
                          team_id: isRepRole(nextRole) ? p.team_id : '',
                        }));
                      }}
                      disabled={!adminActor}
                    >
                      {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 6 }}>
                      Invited users receive an email link to complete signup.
                    </div>
                  </div>
                  {adminActor && isRepRole(form.role) && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="label">Team *</label>
                      <select
                        className="input"
                        value={form.team_id}
                        onChange={e => setForm(p => ({ ...p, team_id: e.target.value }))}
                        disabled={teamsLoading}
                      >
                        <option value="">{teamsLoading ? 'Loading teams...' : 'Select team'}</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>
                            {team.name || 'Unnamed team'}{team.manager_name ? ` - ${team.manager_name}` : ''}
                          </option>
                        ))}
                      </select>
                      {!teamsLoading && teams.length === 0 && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 6 }}>
                          Create a team first, then assign this sales rep to it.
                        </div>
                      )}
                    </div>
                  )}
                  {form.status === 'active' ? (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="label">Password</label>
                      <input
                        type="password"
                        className="input"
                        value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="Required for active users"
                      />
                    </div>
                  ) : (
                    <div style={{ gridColumn: '1 / -1', padding: 12, borderRadius: 'var(--radius)', background: 'var(--color-accent-subtle)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                      No password is needed. The invitation email lets the person create their password and activate the account.
                    </div>
                  )}
                </div>
                {error && <div style={{ margin: '0 20px 12px', padding: 10, background: 'var(--color-danger-subtle)', borderRadius: 'var(--radius)', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{error}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
                  <button className="btn btn-ghost" onClick={() => { setIsAdding(false); setError(''); }} disabled={isSubmitting}>Cancel</button>
                  <button className="btn btn-primary" onClick={addUser} disabled={isSubmitting}>
                    {isSubmitting ? (form.status === 'invited' ? 'Sending...' : 'Adding...') : (form.status === 'invited' ? 'Send Invite' : 'Add User')}
                  </button>
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
