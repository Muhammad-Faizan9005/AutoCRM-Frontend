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
  deleteTeam,
  listTeams,
  getTeam,
  removeTeamMember,
  updateTeam,
} from './teamsApi';
import { listAdminUsers } from './adminApi';

const getErr = (e, fallback) => e?.message || e?.data?.detail || fallback;

/* Section */
const Stat = ({ icon: Icon, value, label, color }) => (
  <div className="flex items-center gap-1.5 text-xs rounded-xl border border-[color:var(--admin-border)]/60 px-3 py-1.5">
    <Icon size={12} style={{ color }} />
    <span className="font-semibold" style={{ color }}>{value ?? 0}</span>
    <span className="text-[color:var(--admin-muted)]">{label}</span>
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
    } catch (e) { setErr(getErr(e, 'Failed to create team.')); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <h3 className="section-title">Create team</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <label className="label">Team name</label>
          <input
            className="input"
            placeholder="e.g. East Coast Sales"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={{ marginTop: 6 }}
          />
          {err && <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--color-danger-subtle)', borderRadius: 'var(--radius)', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{err}</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--color-border)' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <h3 className="section-title">Rename team</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <label className="label">New name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={{ marginTop: 6 }}
          />
          {err && <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--color-danger-subtle)', borderRadius: 'var(--radius)', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{err}</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--color-border)' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* Section */
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <h3 className="section-title">Add rep to team</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              <Loader2 size={14} className="animate-spin" /> Loading agents...
            </div>
          ) : agents.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>No unassigned sales reps available.</p>
          ) : (
            <>
              <label className="label">Select sales rep</label>
              <select
                className="input"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                style={{ marginTop: 6 }}
              >
                <option value="">- Choose a rep -</option>
                {agents.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                ))}
              </select>
            </>
          )}
          {err && <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--color-danger-subtle)', borderRadius: 'var(--radius)', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{err}</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--color-border)' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy || loading || agents.length === 0}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {busy ? 'Adding...' : 'Add rep'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* Section */
const TeamCard = ({ team: initialTeam, onRename, onDelete }) => {
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
    <div className="card" style={{ overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
      {/* Team header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, padding: '14px 20px',
      }}>
        {/* Avatar + info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="avatar avatar-lg" style={{ background: 'var(--color-accent)', color: 'var(--color-text-inverse)', fontSize: 16, borderRadius: 'var(--radius)' }}>
            {team.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{team.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              <User size={11} /> {team.manager_name ?? 'Unknown manager'}
              <span style={{ opacity: 0.4 }}>-</span>
              <Mail size={11} /> {team.manager_email ?? ''}
            </div>
          </div>
        </div>

        {/* Right side: count + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Users size={12} /> {team.member_count ?? 0} reps
          </span>
          <button className="btn btn-secondary" onClick={() => onRename(team)}>
            <Edit2 size={13} /> Rename
          </button>
          <button className="btn btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => onDelete(team)}>
            <Trash2 size={13} /> Delete
          </button>
          <button className="btn btn-primary" onClick={() => { setShowAddMember(true); if (!expanded) { setExpanded(true); loadMembers(); } }}>
            <Plus size={13} /> Add rep
          </button>
          <button className="btn btn-ghost" onClick={handleExpand}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Collapse' : 'View members'}
          </button>
        </div>
      </div>

      {/* Members panel */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--color-bg-elevated)' }}>
          {err && (
            <div style={{ padding: '8px 12px', background: 'var(--color-danger-subtle)', borderRadius: 'var(--radius)', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{err}</div>
          )}
          {loadingMembers ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              <Loader2 size={14} className="animate-spin" /> Loading members...
            </div>
          ) : members.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
              No reps in this team yet.
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="team-member-row"
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar avatar-md avatar-accent"><User size={16} /></div>
                  <div>
                    <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{member.full_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                      <Mail size={10} /> {member.email}
                    </div>
                  </div>
                  <span className={`badge ${
                    member.status === 'active' ? 'badge-success' :
                    member.status === 'invited' ? 'badge-warning' : 'badge-muted'
                  }`}>
                    {member.status}
                  </span>
                </div>

                {/* Stats + actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="team-metric-chip" style={{ color: 'var(--color-accent-text)' }}><TrendingUp size={11} /> {member.leads_count ?? 0} Leads</span>
                  <span className="team-metric-chip" style={{ color: 'var(--color-success)' }}><Briefcase size={11} /> {member.deals_count ?? 0} Deals</span>
                  <span className="team-metric-chip" style={{ color: 'var(--color-warning)' }}><CheckCircle2 size={11} /> {member.tasks_open ?? 0} Tasks</span>
                  <button className="btn btn-secondary" onClick={() => navigate(`/admin/permissions?user=${encodeURIComponent(String(member.id))}`)}>
                    <ShieldCheck size={13} /> Permissions
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ color: 'var(--color-danger)' }}
                    onClick={() => handleRemove(member.id)}
                    disabled={removingId === String(member.id)}
                  >
                    {removingId === String(member.id) ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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

/* Section */
const AdminTeams = () => {
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

  const handleDelete = async (team) => {
    if (!team) return;
    const confirmDelete = window.confirm(`Delete team "${team.name}"? This removes members from the team.`);
    if (!confirmDelete) return;
    setErr('');
    try {
      await deleteTeam(team.id);
      setTeams((prev) => prev.filter((t) => String(t.id) !== String(team.id)));
    } catch (e) {
      setErr(getErr(e, 'Failed to delete team.'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>
              Team Management
            </div>
            <h1 className="page-title">Sales Teams</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 6, maxWidth: 500 }}>
              Each sales manager runs their own team. Expand a team to see reps,
              progress stats, and manage permissions.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New team
            </button>
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Teams', value: teams.length, icon: Users, color: 'var(--color-accent)' },
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
          <div key={label} className="card card-padding">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{label}</div>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                <Icon size={18} />
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', fontFamily: 'var(--font-display)', marginTop: 8 }}>{value}</div>
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
        <div className="card card-padding" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
          <Loader2 size={16} className="animate-spin" /> Loading teams...
        </div>
      ) : teams.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Users size={40} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
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
              onDelete={handleDelete}
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

