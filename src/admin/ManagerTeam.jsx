import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart2,
  Briefcase,
  CheckCircle2,
  Edit2,
  Loader2,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createAdminUser, listAdminUsers } from './adminApi';
import {
  addTeamMember,
  createTeam,
  getMyTeam,
  removeTeamMember,
  updateTeam,
} from './teamsApi';
import { toast } from '../utils/toast';

const getErr = (e, fallback) => e?.message || e?.data?.detail || fallback;

const STAT_CARDS = [
  { key: 'leads_count', label: 'Leads', icon: TrendingUp, color: 'var(--admin-accent)' },
  { key: 'deals_count', label: 'Deals', icon: Briefcase, color: '#10b981' },
  { key: 'tasks_open', label: 'Open Tasks', icon: CheckCircle2, color: '#f59e0b' },
];

/* Section */
const StatBadge = ({ icon: Icon, label, value, color }) => (
  <div className="team-stat-card">
    <Icon size={14} style={{ color }} />
    <span className="text-lg font-semibold" style={{ color }}>
      {value ?? 0}
    </span>
    <span className="text-[10px] uppercase tracking-widest text-[color:var(--admin-muted)]">
      {label}
    </span>
  </div>
);

/* Section */
const CreateTeamModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (name.trim().length < 2) { setErr('Team name must have at least 2 characters.'); return; }
    setBusy(true); setErr('');
    try {
      const team = await createTeam({ name: name.trim() });
      onCreated(team);
      toast.success('Team created successfully.');
    } catch (e) {
      const message = getErr(e, 'Failed to create team.');
      setErr(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" style={{ maxWidth: 448 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--admin-muted)]">
              New team
            </p>
            <h3 className="admin-title text-xl mt-2">Create your team</h3>
          </div>
          <button className="admin-pill admin-pill-muted" onClick={onClose}>
            <X size={14} /> Close
          </button>
        </div>
        <label className="block mt-6 text-xs text-[color:var(--admin-muted)]">
          Team name
          <input
            className="admin-input mt-1"
            placeholder="e.g. North-West Sales"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        {err && <p className="mt-3 text-xs text-[color:var(--admin-accent-2)]">{err}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button className="admin-pill admin-pill-muted" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="admin-pill admin-pill-accent" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {busy ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* Section */
const RenameTeamModal = ({ team, onClose, onRenamed }) => {
  const [name, setName] = useState(team?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (name.trim().length < 2) { setErr('Team name must have at least 2 characters.'); return; }
    if (name.trim() === team?.name) { onClose(); return; }
    setBusy(true); setErr('');
    try {
      const updated = await updateTeam(team.id, { name: name.trim() });
      onRenamed(updated);
      toast.success('Team renamed successfully.');
    } catch (e) {
      const message = getErr(e, 'Failed to rename team.');
      setErr(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" style={{ maxWidth: 448 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="admin-title text-xl">Rename team</h3>
          <button className="admin-pill admin-pill-muted" onClick={onClose}><X size={14} /> Close</button>
        </div>
        <label className="block mt-6 text-xs text-[color:var(--admin-muted)]">
          New team name
          <input
            className="admin-input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        {err && <p className="mt-3 text-xs text-[color:var(--admin-accent-2)]">{err}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button className="admin-pill admin-pill-muted" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="admin-pill admin-pill-accent" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* Section */
const INIT_FORM = { full_name: '', email: '', password: '', status: 'invited' };

const AddRepModal = ({ team, onClose, onAdded }) => {
  const [tab, setTab] = useState('new'); // 'new' | 'existing'
  const [form, setForm] = useState(INIT_FORM);
  const [existing, setExisting] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Load all agents that could be added
  useEffect(() => {
    if (tab !== 'existing') return;
    setLoadingExisting(true);
    listAdminUsers({ pageSize: 200 })
      .then((data) => {
        // Show only agents not already in this team
        const memberIds = new Set((team?.members ?? []).map((m) => String(m.id)));
        setExisting(
          (data.items ?? []).filter(
            (u) => u.role === 'agent' && !u.team_id && !memberIds.has(String(u.id))
          )
        );
      })
      .catch(() => setErr('Failed to load agents.'))
      .finally(() => setLoadingExisting(false));
  }, [tab, team]);

  const submitNew = async () => {
    const email = form.email.trim();
    if (!email) { setErr('Email is required.'); return; }
    const fullName = form.full_name.trim() || email.split('@')[0];
    if (fullName.length < 2) { setErr('Full name must have at least 2 characters.'); return; }
    if (form.status === 'active' && form.password.length < 6) {
      setErr('Password must be at least 6 characters for active users.'); return;
    }
    const payload = { full_name: fullName, email, role: 'agent', status: form.status };
    if (form.password) payload.password = form.password;
    setBusy(true); setErr('');
    try {
      // Backend auto-assigns to manager's team on creation - just create
      await createAdminUser(payload);
      onAdded();
      toast.success('Sales rep added to your team.');
    } catch (e) {
      const message = getErr(e, 'Failed to add rep.');
      setErr(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const submitExisting = async () => {
    if (!selectedId) { setErr('Please select a rep.'); return; }
    setBusy(true); setErr('');
    try {
      await addTeamMember(team.id, selectedId);
      onAdded();
      toast.success('Sales rep added to your team.');
    } catch (e) {
      const message = getErr(e, 'Failed to add rep.');
      setErr(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 520, maxHeight: 'calc(100vh - 48px)', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--color-text-tertiary)' }}>Invite member</div>
            <h3 className="section-title" style={{ marginTop: 2 }}>Invite sales rep to team</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {[['new', 'Create new rep'], ['existing', 'Add existing rep']].map(([t, lbl]) => (
              <button
                key={t}
                onClick={() => { setTab(t); setErr(''); }}
                className={`admin-pill ${tab === t ? 'admin-pill-accent' : 'admin-pill-muted'}`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {tab === 'new' && (
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="label">
                Full name
                <input
                  className="input"
                  placeholder="e.g. Sara Khan"
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  style={{ marginTop: 6 }}
                />
              </label>
              <label className="label">
                Email
                <input
                  className="input"
                  placeholder="rep@company.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  style={{ marginTop: 6 }}
                />
              </label>
              <label className="label">
                Status
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  style={{ marginTop: 6 }}
                >
                  {['active', 'invited', 'disabled'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 6 }}>
                  Invited reps receive an email link to complete signup.
                </div>
              </label>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">Password</label>
                Password
                <input
                  type="password"
                  className="input"
                  placeholder="Required if status = active"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  style={{ marginTop: 6 }}
                />
              </div>
            </div>
          )}

          {tab === 'existing' && (
            <div style={{ marginTop: 14 }}>
              {loadingExisting ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  <Loader2 size={14} className="animate-spin" /> Loading agents...
                </div>
              ) : existing.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
                  No unassigned sales reps found.
                </p>
              ) : (
                <select
                  className="input"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  style={{ marginTop: 6 }}
                >
                  <option value="">- Select a rep -</option>
                  {existing.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {err && <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--color-danger-subtle)', borderRadius: 'var(--radius)', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{err}</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={tab === 'new' ? submitNew : submitExisting} disabled={busy}>
            {busy ? 'Sending...' : 'Send invite'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* Section */
const ManagerTeam = () => {
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showAddRep, setShowAddRep] = useState(false);
  const [removingId, setRemovingId] = useState('');

  const loadTeam = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const data = await getMyTeam();
      setTeam(data);
    } catch (e) {
      if (e?.status === 404) {
        setTeam(null);
      } else {
        setErr(getErr(e, 'Failed to load team.'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handleRemoveMember = async (agentId) => {
    setRemovingId(agentId);
    try {
      await removeTeamMember(team.id, agentId);
      setTeam((prev) => ({
        ...prev,
        members: prev.members.filter((m) => String(m.id) !== String(agentId)),
      }));
      toast.success('Sales rep removed from team.');
    } catch (e) {
      const message = getErr(e, 'Failed to remove member.');
      setErr(message);
      toast.error(message);
    } finally {
      setRemovingId('');
    }
  };

  if (loading) {
    return (
      <div className="card card-padding" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
        <Loader2 size={16} className="animate-spin" /> Loading your team...
      </div>
    );
  }

  /* No team yet */
  if (!team) {
    return (
      <>
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ margin: '0 auto 16px', width: 64, height: 64, borderRadius: 16, background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={32} />
          </div>
          <p className="section-title">You don't have a team yet</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: 360, margin: '8px auto 0' }}>
            Create your team to start adding sales reps, tracking their progress, and
            managing their permissions - all from one place.
          </p>
          {err && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginTop: 10 }}>{err}</p>}
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create my team
          </button>
        </div>

        {showCreate && (
          <CreateTeamModal
            onClose={() => setShowCreate(false)}
            onCreated={(newTeam) => {
              setTeam({ ...newTeam, members: [] });
              setShowCreate(false);
            }}
          />
        )}
      </>
    );
  }

  /* Team dashboard */
  const members = team.members ?? [];
  const totalLeads = members.reduce((s, m) => s + (m.leads_count ?? 0), 0);
  const totalDeals = members.reduce((s, m) => s + (m.deals_count ?? 0), 0);
  const totalTasks = members.reduce((s, m) => s + (m.tasks_open ?? 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="card" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
              Manager Console
            </p>
            <h2 className="page-title" style={{ fontSize: 'var(--text-2xl)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--color-accent)', color: 'var(--color-text-inverse)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}
              >
                {team.name[0]?.toUpperCase()}
              </span>
              {team.name}
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {members.length} sales rep{members.length !== 1 ? 's' : ''} - your team
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setShowRename(true)}>
              <Edit2 size={14} /> Rename
            </button>
            <button className="btn btn-primary" onClick={() => setShowAddRep(true)}>
              <Plus size={14} /> Add rep
            </button>
          </div>
        </div>

        {/* Team-wide aggregate stats */}
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <StatBadge icon={TrendingUp} label="Total Leads" value={totalLeads} color="var(--admin-accent)" />
          <StatBadge icon={Briefcase} label="Total Deals" value={totalDeals} color="#10b981" />
          <StatBadge icon={CheckCircle2} label="Open Tasks" value={totalTasks} color="#f59e0b" />
          <StatBadge icon={Users} label="Members" value={members.length} color="#8b5cf6" />
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {err}
        </div>
      )}

      {/* Members table */}
      <div className="card card-padding">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={18} style={{ color: 'var(--color-accent)' }} />
            Team Members
          </h3>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{members.length} reps</span>
        </div>

        {members.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
            <Users size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            No reps yet. Click <strong>Add rep</strong> to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {members.map((member) => (
              <div key={member.id} className="team-member-row manager-team-row">
                {/* Identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar avatar-md avatar-accent">
                    <User size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{member.full_name}</p>
                    <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                      <Mail size={11} /> {member.email}
                    </p>
                    <span
                      className={`badge ${
                        member.status === 'active'
                          ? 'badge-success'
                          : member.status === 'invited'
                            ? 'badge-warning'
                            : 'badge-muted'
                      }`}
                    >
                      {member.status}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="manager-team-stats">
                  {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
                    <div key={key} className="team-metric-chip">
                      <Icon size={12} style={{ color }} />
                      <span className="font-semibold" style={{ color }}>
                        {member[key] ?? 0}
                      </span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="team-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      navigate(`/admin/permissions?user=${encodeURIComponent(String(member.id))}`)
                    }
                  >
                    <ShieldCheck size={14} /> Permissions
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ color: 'var(--color-danger)' }}
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={removingId === String(member.id)}
                  >
                    {removingId === String(member.id) ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showRename && (
        <RenameTeamModal
          team={team}
          onClose={() => setShowRename(false)}
          onRenamed={(updated) => {
            setTeam((prev) => ({ ...prev, name: updated.name }));
            setShowRename(false);
          }}
        />
      )}

      {showAddRep && (
        <AddRepModal
          team={team}
          onClose={() => setShowAddRep(false)}
          onAdded={() => {
            setShowAddRep(false);
            loadTeam(); // refresh to pick up new member + stats
          }}
        />
      )}
    </div>
  );
};

export default ManagerTeam;

