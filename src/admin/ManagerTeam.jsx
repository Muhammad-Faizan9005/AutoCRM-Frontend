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

const getErr = (e, fallback) => e?.message || e?.data?.detail || fallback;

const STAT_CARDS = [
  { key: 'leads_count', label: 'Leads', icon: TrendingUp, color: 'var(--admin-accent)' },
  { key: 'deals_count', label: 'Deals', icon: Briefcase, color: '#10b981' },
  { key: 'tasks_open', label: 'Open Tasks', icon: CheckCircle2, color: '#f59e0b' },
];

/* ── Small stat badge ───────────────────────────────────────────────────── */
const StatBadge = ({ icon: Icon, label, value, color }) => (
  <div
    className="flex flex-col items-center gap-1 rounded-2xl px-4 py-2 border border-[color:var(--admin-border)]/60"
    style={{ minWidth: 80 }}
  >
    <Icon size={14} style={{ color }} />
    <span className="text-lg font-semibold" style={{ color }}>
      {value ?? 0}
    </span>
    <span className="text-[10px] uppercase tracking-widest text-[color:var(--admin-muted)]">
      {label}
    </span>
  </div>
);

/* ── Create-Team modal ──────────────────────────────────────────────────── */
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
    } catch (e) {
      setErr(getErr(e, 'Failed to create team.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-modal">
      <div className="admin-panel p-6 max-w-md mx-auto">
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
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Rename-Team modal ──────────────────────────────────────────────────── */
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
    } catch (e) {
      setErr(getErr(e, 'Failed to rename team.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-modal">
      <div className="admin-panel p-6 max-w-md mx-auto">
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

/* ── Add-Rep modal ──────────────────────────────────────────────────────── */
const INIT_FORM = { full_name: '', email: '', password: '', status: 'active' };

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
            (u) => u.role === 'agent' && !memberIds.has(String(u.id))
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
      // Backend auto-assigns to manager's team on creation — just create
      await createAdminUser(payload);
      onAdded();
    } catch (e) {
      setErr(getErr(e, 'Failed to add rep.'));
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
    } catch (e) {
      setErr(getErr(e, 'Failed to add rep.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-modal">
      <div className="admin-panel p-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--admin-muted)]">Add member</p>
            <h3 className="admin-title text-xl mt-2">Add sales rep to team</h3>
          </div>
          <button className="admin-pill admin-pill-muted" onClick={onClose}><X size={14} /> Close</button>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-2">
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
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-xs text-[color:var(--admin-muted)]">
              Full name
              <input
                className="admin-input mt-1"
                placeholder="e.g. Sara Khan"
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              />
            </label>
            <label className="text-xs text-[color:var(--admin-muted)]">
              Email
              <input
                className="admin-input mt-1"
                placeholder="rep@company.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </label>
            <label className="text-xs text-[color:var(--admin-muted)]">
              Status
              <select
                className="admin-select mt-1"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                {['active', 'invited', 'disabled'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[color:var(--admin-muted)]">
              Password
              <input
                type="password"
                className="admin-input mt-1"
                placeholder="Required if status = active"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
            </label>
          </div>
        )}

        {tab === 'existing' && (
          <div className="mt-5">
            {loadingExisting ? (
              <div className="flex items-center gap-2 text-sm text-[color:var(--admin-muted)]">
                <Loader2 size={14} className="animate-spin" /> Loading agents…
              </div>
            ) : existing.length === 0 ? (
              <p className="text-sm text-[color:var(--admin-muted)]">
                No unassigned sales reps found.
              </p>
            ) : (
              <select
                className="admin-select w-full"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">— Select a rep —</option>
                {existing.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {err && <p className="mt-3 text-xs text-[color:var(--admin-accent-2)]">{err}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button className="admin-pill admin-pill-muted" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="admin-pill admin-pill-accent"
            onClick={tab === 'new' ? submitNew : submitExisting}
            disabled={busy}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {busy ? 'Adding…' : 'Add rep'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main ManagerTeam Component ─────────────────────────────────────────── */
const ManagerTeam = ({ currentUser }) => {
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
    } catch (e) {
      setErr(getErr(e, 'Failed to remove member.'));
    } finally {
      setRemovingId('');
    }
  };

  if (loading) {
    return (
      <div className="admin-panel p-8 flex items-center gap-3 text-[color:var(--admin-muted)]">
        <Loader2 size={18} className="animate-spin" /> Loading your team…
      </div>
    );
  }

  /* ── No team yet ── */
  if (!team) {
    return (
      <>
        <div className="admin-panel p-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-[color:var(--admin-accent)]/10 text-[color:var(--admin-accent)] flex items-center justify-center">
            <Users size={32} />
          </div>
          <p className="admin-title text-xl">You don't have a team yet</p>
          <p className="text-sm text-[color:var(--admin-muted)] max-w-sm mx-auto">
            Create your team to start adding sales reps, tracking their progress, and
            managing their permissions — all from one place.
          </p>
          {err && <p className="text-xs text-[color:var(--admin-accent-2)]">{err}</p>}
          <button
            className="admin-pill admin-pill-accent mx-auto"
            onClick={() => setShowCreate(true)}
          >
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

  /* ── Team dashboard ── */
  const members = team.members ?? [];
  const totalLeads = members.reduce((s, m) => s + (m.leads_count ?? 0), 0);
  const totalDeals = members.reduce((s, m) => s + (m.deals_count ?? 0), 0);
  const totalTasks = members.reduce((s, m) => s + (m.tasks_open ?? 0), 0);

  return (
    <>
      {/* Header */}
      <div className="admin-panel p-6 admin-rise">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--admin-muted)]">
              Manager Console
            </p>
            <h2 className="admin-title text-2xl mt-2 flex items-center gap-3">
              <span
                className="h-10 w-10 rounded-2xl flex items-center justify-center text-white text-lg font-bold"
                style={{ background: 'var(--admin-accent)' }}
              >
                {team.name[0]?.toUpperCase()}
              </span>
              {team.name}
            </h2>
            <p className="text-sm text-[color:var(--admin-muted)] mt-1">
              {members.length} sales rep{members.length !== 1 ? 's' : ''} · your team
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="admin-pill" onClick={() => setShowRename(true)}>
              <Edit2 size={14} /> Rename
            </button>
            <button className="admin-pill admin-pill-accent" onClick={() => setShowAddRep(true)}>
              <Plus size={14} /> Add rep
            </button>
          </div>
        </div>

        {/* Team-wide aggregate stats */}
        <div className="mt-6 flex flex-wrap gap-3">
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
      <div className="admin-panel p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users size={18} className="text-[color:var(--admin-accent)]" />
            Team Members
          </h3>
          <span className="text-xs text-[color:var(--admin-muted)]">{members.length} reps</span>
        </div>

        {members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--admin-border)]/60 px-6 py-10 text-center text-sm text-[color:var(--admin-muted)]">
            <Users size={28} className="mx-auto mb-3 opacity-30" />
            No reps yet. Click <strong>Add rep</strong> to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-4 rounded-2xl border border-[color:var(--admin-border)]/60 px-5 py-4 md:flex-row md:items-center md:justify-between transition hover:border-[color:var(--admin-accent)]/30"
              >
                {/* Identity */}
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-[color:var(--admin-ink)]/10 flex items-center justify-center flex-shrink-0">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{member.full_name}</p>
                    <p className="text-xs text-[color:var(--admin-muted)] flex items-center gap-1">
                      <Mail size={11} /> {member.email}
                    </p>
                    <span
                      className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        member.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : member.status === 'invited'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {member.status}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-2">
                  {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
                    <div
                      key={key}
                      className="flex items-center gap-1.5 text-xs rounded-xl border border-[color:var(--admin-border)]/60 px-3 py-1.5"
                    >
                      <Icon size={12} style={{ color }} />
                      <span className="font-semibold" style={{ color }}>
                        {member[key] ?? 0}
                      </span>
                      <span className="text-[color:var(--admin-muted)]">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    className="admin-pill"
                    onClick={() =>
                      navigate(`/admin/permissions?user=${encodeURIComponent(String(member.id))}`)
                    }
                  >
                    <ShieldCheck size={14} /> Permissions
                  </button>
                  <button
                    className="admin-pill admin-pill-muted"
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
    </>
  );
};

export default ManagerTeam;
