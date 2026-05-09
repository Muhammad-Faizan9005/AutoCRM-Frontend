import React, { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
import {
  addTeamMember,
  createTeam,
  listTeams,
  getTeam,
  removeTeamMember,
  updateTeam,
} from './teamsApi';
import { listAdminUsers } from './adminApi';

const getErr = (e, fallback) => e?.message || e?.data?.detail || fallback;

/* ── Stat pill ─────────────────────────────────────────────────────────── */
const Stat = ({ icon: Icon, value, label, color }) => (
  <div className="flex items-center gap-1.5 text-xs rounded-xl border border-[color:var(--admin-border)]/60 px-3 py-1.5">
    <Icon size={12} style={{ color }} />
    <span className="font-semibold" style={{ color }}>{value ?? 0}</span>
    <span className="text-[color:var(--admin-muted)]">{label}</span>
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
    } catch (e) { setErr(getErr(e, 'Failed to create team.')); }
    finally { setBusy(false); }
  };

  return (
    <div className="admin-modal">
      <div className="admin-panel p-6 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <h3 className="admin-title text-xl">Create team</h3>
          <button className="admin-pill admin-pill-muted" onClick={onClose}><X size={14} /> Close</button>
        </div>
        <label className="block mt-5 text-xs text-[color:var(--admin-muted)]">
          Team name
          <input
            className="admin-input mt-1"
            placeholder="e.g. East Coast Sales"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        {err && <p className="mt-2 text-xs text-[color:var(--admin-accent-2)]">{err}</p>}
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
    if (name.trim().length < 2) { setErr('Name must be at least 2 characters.'); return; }
    if (name.trim() === team?.name) { onClose(); return; }
    setBusy(true); setErr('');
    try {
      const updated = await updateTeam(team.id, { name: name.trim() });
      onRenamed(updated);
    } catch (e) { setErr(getErr(e, 'Failed to rename.')); }
    finally { setBusy(false); }
  };

  return (
    <div className="admin-modal">
      <div className="admin-panel p-6 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <h3 className="admin-title text-xl">Rename team</h3>
          <button className="admin-pill admin-pill-muted" onClick={onClose}><X size={14} /> Close</button>
        </div>
        <label className="block mt-5 text-xs text-[color:var(--admin-muted)]">
          New name
          <input
            className="admin-input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        {err && <p className="mt-2 text-xs text-[color:var(--admin-accent-2)]">{err}</p>}
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

/* ── Add-member-to-team modal ───────────────────────────────────────────── */
const AddMemberModal = ({ team, onClose, onAdded }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    listAdminUsers({ pageSize: 200 })
      .then((data) => {
        const memberIds = new Set((team?.members ?? []).map((m) => String(m.id)));
        setAgents(
          (data.items ?? []).filter(
            (u) => u.role === 'agent' && !memberIds.has(String(u.id))
          )
        );
      })
      .catch(() => setErr('Could not load agents.'))
      .finally(() => setLoading(false));
  }, [team]);

  const submit = async () => {
    if (!selectedId) { setErr('Please select a rep.'); return; }
    setBusy(true); setErr('');
    try {
      await addTeamMember(team.id, selectedId);
      onAdded();
    } catch (e) { setErr(getErr(e, 'Failed to add member.')); }
    finally { setBusy(false); }
  };

  return (
    <div className="admin-modal">
      <div className="admin-panel p-6 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <h3 className="admin-title text-xl">Add rep to team</h3>
          <button className="admin-pill admin-pill-muted" onClick={onClose}><X size={14} /> Close</button>
        </div>
        <div className="mt-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[color:var(--admin-muted)]">
              <Loader2 size={14} className="animate-spin" /> Loading agents…
            </div>
          ) : agents.length === 0 ? (
            <p className="text-sm text-[color:var(--admin-muted)]">No unassigned sales reps available.</p>
          ) : (
            <label className="text-xs text-[color:var(--admin-muted)]">
              Select sales rep
              <select
                className="admin-select w-full mt-1"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">— Choose a rep —</option>
                {agents.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {err && <p className="mt-2 text-xs text-[color:var(--admin-accent-2)]">{err}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button className="admin-pill admin-pill-muted" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="admin-pill admin-pill-accent" onClick={submit} disabled={busy || loading || agents.length === 0}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {busy ? 'Adding…' : 'Add rep'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Team card (collapsible) ────────────────────────────────────────────── */
const TeamCard = ({ team: initialTeam, onRename }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [team, setTeam] = useState(initialTeam);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [removingId, setRemovingId] = useState('');
  const [err, setErr] = useState('');

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true); setErr('');
    try {
      const detail = await getTeam(team.id);
      setMembers(detail.members ?? []);
      setTeam((prev) => ({ ...prev, member_count: (detail.members ?? []).length }));
    } catch (e) { setErr(getErr(e, 'Failed to load members.')); }
    finally { setLoadingMembers(false); }
  }, [team.id]);

  const handleExpand = () => {
    if (!expanded) loadMembers();
    setExpanded((v) => !v);
  };

  const handleRemove = async (agentId) => {
    setRemovingId(agentId);
    try {
      await removeTeamMember(team.id, agentId);
      setMembers((prev) => prev.filter((m) => String(m.id) !== String(agentId)));
      setTeam((prev) => ({ ...prev, member_count: Math.max(0, prev.member_count - 1) }));
    } catch (e) { setErr(getErr(e, 'Failed to remove.')); }
    finally { setRemovingId(''); }
  };

  return (
    <div className="admin-panel overflow-hidden transition hover:ring-1 hover:ring-[color:var(--admin-accent)]/30">
      {/* Team header row */}
      <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
        {/* Avatar + info */}
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ background: 'var(--admin-accent)' }}
          >
            {team.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-sm font-semibold">{team.name}</p>
            <p className="text-xs text-[color:var(--admin-muted)] flex items-center gap-1 mt-0.5">
              <User size={11} /> {team.manager_name ?? 'Unknown manager'}
              <span className="mx-1 opacity-40">·</span>
              <Mail size={11} /> {team.manager_email ?? ''}
            </p>
          </div>
        </div>

        {/* Right side: count + actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs rounded-xl border border-[color:var(--admin-border)]/60 px-3 py-1.5">
            <Users size={12} style={{ color: '#8b5cf6' }} />
            <span className="font-semibold" style={{ color: '#8b5cf6' }}>{team.member_count ?? 0}</span>
            <span className="text-[color:var(--admin-muted)]">reps</span>
          </div>
          <button
            className="admin-pill"
            onClick={() => onRename(team)}
          >
            <Edit2 size={13} /> Rename
          </button>
          <button
            className="admin-pill admin-pill-accent"
            onClick={() => { setShowAddMember(true); if (!expanded) { setExpanded(true); loadMembers(); } }}
          >
            <Plus size={13} /> Add rep
          </button>
          <button
            className="admin-pill admin-pill-muted"
            onClick={handleExpand}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Collapse' : 'View members'}
          </button>
        </div>
      </div>

      {/* Members panel */}
      {expanded && (
        <div className="border-t border-[color:var(--admin-border)]/40 px-5 py-4 space-y-3 bg-[color:var(--admin-panel)]/40">
          {err && (
            <div className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{err}</div>
          )}
          {loadingMembers ? (
            <div className="flex items-center gap-2 text-sm text-[color:var(--admin-muted)]">
              <Loader2 size={14} className="animate-spin" /> Loading members…
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--admin-border)]/60 px-4 py-6 text-center text-sm text-[color:var(--admin-muted)]">
              No reps in this team yet.
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-2xl border border-[color:var(--admin-border)]/50 px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                {/* Identity */}
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[color:var(--admin-ink)]/10 flex items-center justify-center flex-shrink-0">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{member.full_name}</p>
                    <p className="text-xs text-[color:var(--admin-muted)] flex items-center gap-1">
                      <Mail size={10} /> {member.email}
                    </p>
                  </div>
                  <span
                    className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
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

                {/* Stats + actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Stat icon={TrendingUp} value={member.leads_count} label="Leads" color="var(--admin-accent)" />
                  <Stat icon={Briefcase} value={member.deals_count} label="Deals" color="#10b981" />
                  <Stat icon={CheckCircle2} value={member.tasks_open} label="Tasks" color="#f59e0b" />
                  <button
                    className="admin-pill"
                    onClick={() =>
                      navigate(`/admin/permissions?user=${encodeURIComponent(String(member.id))}`)
                    }
                  >
                    <ShieldCheck size={13} /> Permissions
                  </button>
                  <button
                    className="admin-pill admin-pill-muted"
                    onClick={() => handleRemove(member.id)}
                    disabled={removingId === String(member.id)}
                  >
                    {removingId === String(member.id)
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Trash2 size={13} />}
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showAddMember && (
        <AddMemberModal
          team={{ ...team, members }}
          onClose={() => setShowAddMember(false)}
          onAdded={() => { setShowAddMember(false); loadMembers(); }}
        />
      )}
    </div>
  );
};

/* ── Main AdminTeams component ──────────────────────────────────────────── */
const AdminTeams = ({ currentUser }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [renaming, setRenaming] = useState(null); // team object being renamed

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const data = await listTeams();
      setTeams(data.items);
    } catch (e) { setErr(getErr(e, 'Failed to load teams.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRenamed = (updated) => {
    setTeams((prev) =>
      prev.map((t) => (String(t.id) === String(updated.id) ? { ...t, name: updated.name } : t))
    );
    setRenaming(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="admin-panel p-6 admin-rise flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--admin-muted)]">
            Team Management
          </p>
          <h2 className="admin-title text-2xl mt-2">Sales Teams</h2>
          <p className="text-sm text-[color:var(--admin-muted)] mt-2">
            Each sales manager runs their own team. Expand a team to see reps,
            progress stats, and manage permissions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="admin-pill admin-pill-accent" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New team
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total Teams', value: teams.length, icon: Users, color: 'var(--admin-accent)' },
          {
            label: 'Total Reps',
            value: teams.reduce((s, t) => s + (t.member_count ?? 0), 0),
            icon: User,
            color: '#10b981',
          },
          {
            label: 'Managers Active',
            value: teams.filter((t) => t.manager_id).length,
            icon: ShieldCheck,
            color: '#f59e0b',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="admin-panel p-5 admin-rise">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[color:var(--admin-muted)]">{label}</span>
              <div
                className="h-9 w-9 rounded-2xl flex items-center justify-center"
                style={{ background: `${color}18`, color }}
              >
                <Icon size={18} />
              </div>
            </div>
            <div className="mt-4 text-3xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {err}
        </div>
      )}

      {/* Teams list */}
      {loading ? (
        <div className="admin-panel p-6 flex items-center gap-2 text-sm text-[color:var(--admin-muted)]">
          <Loader2 size={16} className="animate-spin" /> Loading teams…
        </div>
      ) : teams.length === 0 ? (
        <div className="admin-panel p-10 text-center">
          <Users size={40} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm text-[color:var(--admin-muted)]">
            No teams created yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onRename={(t) => setRenaming(t)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateTeamModal
          onClose={() => setShowCreate(false)}
          onCreated={(newTeam) => {
            setTeams((prev) => [{ ...newTeam, member_count: 0 }, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {renaming && (
        <RenameTeamModal
          team={renaming}
          onClose={() => setRenaming(null)}
          onRenamed={handleRenamed}
        />
      )}
    </div>
  );
};

export default AdminTeams;
