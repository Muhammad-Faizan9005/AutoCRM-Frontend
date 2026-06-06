import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileClock,
  GitBranch,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import {
  approveAgentAction,
  getAgentMemory,
  getAgentRunTrace,
  getControlCenterSnapshot,
  rejectAgentAction,
  updateAiAgent,
} from './aiControlApi';

const getId = (item) => String(item?.id || item?.run_id || item?.external_run_id || '');
const asArray = (value) => (Array.isArray(value) ? value : []);
const shortId = (value) => String(value || '').slice(0, 8) || 'n/a';
const formatDate = (value) => (value ? new Date(value).toLocaleString() : 'n/a');

const statusTone = (status = '') => {
  const normalized = status.toLowerCase();
  if (normalized.includes('fail') || normalized.includes('reject')) return 'danger';
  if (normalized.includes('pending') || normalized.includes('running')) return 'warning';
  if (normalized.includes('complete') || normalized.includes('approved') || normalized.includes('dispatch')) return 'success';
  return 'neutral';
};

const Pill = ({ children, tone = 'neutral' }) => {
  const colors = {
    success: ['var(--color-success-subtle)', 'var(--color-success)'],
    warning: ['var(--color-warning-subtle)', 'var(--color-warning)'],
    danger: ['var(--color-danger-subtle)', 'var(--color-danger)'],
    neutral: ['var(--color-bg-hover)', 'var(--color-text-secondary)'],
  };
  const [bg, color] = colors[tone] || colors.neutral;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      minHeight: 24,
      padding: '3px 8px',
      borderRadius: 999,
      background: bg,
      color,
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-semibold)',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
};

const Metric = ({ label, value, icon: Icon, tone = 'neutral' }) => (
  <div className="card card-padding">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
        <div style={{ marginTop: 8, fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>{value}</div>
      </div>
      <div style={{
        width: 38,
        height: 38,
        borderRadius: 'var(--radius)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tone === 'danger' ? 'var(--color-danger-subtle)' : tone === 'warning' ? 'var(--color-warning-subtle)' : 'var(--color-accent-subtle)',
        color: tone === 'danger' ? 'var(--color-danger)' : tone === 'warning' ? 'var(--color-warning)' : 'var(--color-accent)',
      }}>
        <Icon size={18} />
      </div>
    </div>
  </div>
);

const EmptyState = ({ children }) => (
  <div style={{
    minHeight: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-tertiary)',
    fontSize: 'var(--text-sm)',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius)',
    background: 'var(--color-bg-elevated)',
  }}>
    {children}
  </div>
);

const AIControlCenter = () => {
  const [runs, setRuns] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [trace, setTrace] = useState([]);
  const [memory, setMemory] = useState([]);
  const [aiAgents, setAiAgents] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState('');
  const [agentToggleBusy, setAgentToggleBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const loadControlCenter = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const snapshot = await getControlCenterSnapshot();
      const nextRuns = asArray(snapshot?.runs);
      setRuns(nextRuns);
      setApprovals(asArray(snapshot?.approvals));
      setAiAgents(asArray(snapshot?.ai_agents));
      setSelectedRun((current) => current || nextRuns[0] || null);
    } catch (err) {
      setError(err?.message || 'Unable to load AI control center.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadControlCenter();
  }, [loadControlCenter]);

  useEffect(() => {
    let active = true;
    const loadDetails = async () => {
      if (!selectedRun?.id) {
        setTrace([]);
        setMemory([]);
        return;
      }
      setDetailLoading(true);
      try {
        const [traceData, memoryData] = await Promise.all([
          getAgentRunTrace(selectedRun.id),
          selectedRun.entity_type && selectedRun.entity_id
            ? getAgentMemory(selectedRun.entity_type, selectedRun.entity_id)
            : Promise.resolve([]),
        ]);
        if (!active) return;
        setTrace(asArray(traceData));
        setMemory(asArray(memoryData));
      } catch {
        if (active) {
          setTrace([]);
          setMemory([]);
        }
      } finally {
        if (active) setDetailLoading(false);
      }
    };
    loadDetails();
    return () => { active = false; };
  }, [selectedRun]);

  const metrics = useMemo(() => {
    const running = runs.filter((run) => ['running', 'pending'].includes(String(run.status).toLowerCase())).length;
    const failed = runs.filter((run) => String(run.status).toLowerCase().includes('fail')).length;
    const completed = runs.filter((run) => String(run.status).toLowerCase().includes('complete')).length;
    return { running, failed, completed, pendingApprovals: approvals.length };
  }, [runs, approvals]);

  const decideApproval = async (approval, decision) => {
    const id = getId(approval);
    setActionBusy(`${decision}:${id}`);
    setError('');
    try {
      if (decision === 'approve') {
        await approveAgentAction(id, note);
      } else {
        await rejectAgentAction(id, note);
      }
      setNote('');
      setSelectedApproval(null);
      await loadControlCenter();
    } catch (err) {
      setError(err?.message || `Unable to ${decision} action.`);
    } finally {
      setActionBusy('');
    }
  };

  const activeApproval = selectedApproval || approvals[0] || null;

  const toggleAiAgent = async (agent) => {
    setAgentToggleBusy(agent.agent_key);
    setError('');
    try {
      const updated = await updateAiAgent(agent.agent_key, { enabled: !agent.enabled });
      setAiAgents((prev) => prev.map((a) => (a.agent_key === agent.agent_key ? { ...a, ...updated } : a)));
    } catch (err) {
      setError(err?.message || 'Unable to update AI agent.');
    } finally {
      setAgentToggleBusy('');
    }
  };

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>AI Operations</div>
              <h1 className="page-title" style={{ marginTop: 4 }}>AI Control Center</h1>
              <p style={{ marginTop: 6, maxWidth: 620, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                Inspect agent runs, approval gates, action history, and the context used before the system writes back to CRM.
              </p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={loadControlCenter} disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: 12, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          <Metric label="Running" value={metrics.running} icon={CircleDot} tone="warning" />
          <Metric label="Pending Approval" value={metrics.pendingApprovals} icon={ShieldCheck} tone="warning" />
          <Metric label="Completed" value={metrics.completed} icon={CheckCircle2} tone="success" />
          <Metric label="Failed" value={metrics.failed} icon={XCircle} tone="danger" />
        </div>

        <section className="card card-padding">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="section-title">AI Agents</h2>
              <Pill>
                {aiAgents.filter((a) => a.enabled).length}/{aiAgents.length} active
              </Pill>
            </div>
            {loading ? (
              <EmptyState><Loader2 size={16} className="animate-spin" />&nbsp;Loading agents...</EmptyState>
            ) : aiAgents.length === 0 ? (
              <EmptyState>No AI agents registered yet.</EmptyState>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ color: 'var(--color-text-tertiary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '8px 6px' }}>Agent</th>
                      <th style={{ padding: '8px 6px' }}>Type</th>
                      <th style={{ padding: '8px 6px' }}>Runs</th>
                      <th style={{ padding: '8px 6px' }}>Pending</th>
                      <th style={{ padding: '8px 6px' }}>Last Seen</th>
                      <th style={{ padding: '8px 6px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiAgents.map((agent) => (
                      <tr key={agent.agent_key} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '9px 6px' }}>
                          <strong>{agent.display_name}</strong>
                          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
                            {agent.agent_key}
                          </div>
                          {agent.description && (
                            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
                              {agent.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '9px 6px', color: 'var(--color-text-secondary)' }}>
                          {agent.agent_type?.replaceAll('_', ' ')}
                        </td>
                        <td style={{ padding: '9px 6px' }}>{agent.total_runs ?? 0}</td>
                        <td style={{ padding: '9px 6px' }}>
                          <Pill tone={(agent.pending_actions ?? 0) > 0 ? 'warning' : 'success'}>
                            {agent.pending_actions ?? 0}
                          </Pill>
                        </td>
                        <td style={{ padding: '9px 6px', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                          {agent.last_seen_at ? formatDate(agent.last_seen_at) : 'Never'}
                        </td>
                        <td style={{ padding: '9px 6px' }}>
                          <button
                            type="button"
                            className={agent.enabled ? 'btn btn-primary' : 'btn btn-secondary'}
                            style={{ padding: '4px 10px', fontSize: 'var(--text-xs)', minWidth: 52 }}
                            disabled={agentToggleBusy === agent.agent_key}
                            onClick={() => toggleAiAgent(agent)}
                          >
                            {agentToggleBusy === agent.agent_key
                              ? <Loader2 size={13} className="animate-spin" />
                              : agent.enabled
                                ? <><CheckCircle2 size={13} /> On</>
                                : <><XCircle size={13} /> Off</>
                            }
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(420px, 1.4fr)', gap: 14 }}>
          <section className="card card-padding" style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="section-title">Agent Runs</h2>
              <Pill>{runs.length} total</Pill>
            </div>
            {loading ? (
              <EmptyState><Loader2 size={16} className="animate-spin" />&nbsp;Loading runs...</EmptyState>
            ) : runs.length === 0 ? (
              <EmptyState>No agent runs yet.</EmptyState>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                {runs.map((run) => {
                  const active = selectedRun?.id === run.id;
                  return (
                    <button
                      type="button"
                      key={getId(run)}
                      onClick={() => setSelectedRun(run)}
                      style={{
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius)',
                        border: active ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                        background: active ? 'var(--color-accent-subtle)' : 'var(--color-bg-elevated)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                        <strong style={{ fontSize: 'var(--text-sm)' }}>{run.trigger_type || 'agent_run'}</strong>
                        <span style={{ display: 'inline-flex', gap: 6 }}>
                          {run.legacy_source && <Pill>legacy</Pill>}
                          <Pill tone={statusTone(run.status)}>{run.status || 'unknown'}</Pill>
                        </span>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        <span>{run.entity_type}:{shortId(run.entity_id)}</span>
                        <span><Clock3 size={12} style={{ verticalAlign: 'text-bottom' }} /> {formatDate(run.started_at)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card card-padding" style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="section-title">Run Inspector</h2>
              {selectedRun && <Pill tone={statusTone(selectedRun.status)}>{selectedRun.status}</Pill>}
            </div>
            {!selectedRun ? (
              <EmptyState>Select a run to inspect its trace.</EmptyState>
            ) : detailLoading ? (
              <EmptyState><Loader2 size={16} className="animate-spin" />&nbsp;Loading trace...</EmptyState>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: trace.length === 0 ? '1fr' : 'minmax(260px, 0.9fr) minmax(320px, 1.1fr)',
                  gap: 14,
                  alignItems: 'start',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  {(selectedRun.summary || selectedRun.failure_cause || selectedRun.failure_detail) && (
                    <div style={{
                      marginBottom: 12,
                      padding: 10,
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius)',
                      background: 'var(--color-bg-elevated)',
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--text-xs)',
                    }}>
                      {selectedRun.summary && <div><strong>Summary:</strong> {selectedRun.summary}</div>}
                      {selectedRun.failure_cause && <div><strong>Failure:</strong> {selectedRun.failure_cause}</div>}
                      {selectedRun.failure_detail && (
                        <pre style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', maxHeight: 140, overflow: 'auto' }}>
                          {selectedRun.failure_detail}
                        </pre>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontWeight: 'var(--weight-semibold)' }}>
                    <GitBranch size={16} /> Run Trace
                  </div>
                  {trace.length === 0 ? (
                    <EmptyState>No trace events recorded.</EmptyState>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                      {trace.map((item, index) => (
                        <div key={`${item.step}-${index}`} style={{ padding: 10, border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-elevated)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <strong style={{ fontSize: 'var(--text-sm)' }}>{item.step}</strong>
                            <span style={{ display: 'inline-flex', gap: 6 }}>
                              {item.legacy_source && <Pill>legacy</Pill>}
                              <Pill tone={statusTone(item.status)}>{item.status}</Pill>
                            </span>
                          </div>
                          <pre style={{ margin: '8px 0 0', maxHeight: 120, overflow: 'auto', fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(item.payload || {}, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontWeight: 'var(--weight-semibold)' }}>
                    <FileClock size={16} /> Entity Memory
                  </div>
                  {memory.length === 0 ? (
                    <EmptyState>No memory for this entity.</EmptyState>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                      {memory.map((item) => (
                        <div key={getId(item)} style={{ padding: 10, border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-elevated)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <strong style={{ fontSize: 'var(--text-sm)' }}>{item.action_type}</strong>
                            <span style={{ display: 'inline-flex', gap: 6 }}>
                              {item.legacy_source && <Pill>legacy</Pill>}
                              <Pill tone={statusTone(item.approval_status)}>{item.approval_status || 'n/a'}</Pill>
                            </span>
                          </div>
                          <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{item.reason}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="card card-padding">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 className="section-title">Pending Approvals</h2>
            <Pill tone={approvals.length ? 'warning' : 'success'}>{approvals.length} waiting</Pill>
          </div>
          {approvals.length === 0 ? (
            <EmptyState>No actions waiting for approval.</EmptyState>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(420px, 1.4fr)', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {approvals.map((approval) => {
                  const active = getId(activeApproval) === getId(approval);
                  return (
                    <button
                      key={getId(approval)}
                      type="button"
                      onClick={() => setSelectedApproval(approval)}
                      style={{
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius)',
                        border: active ? '1px solid var(--color-warning)' : '1px solid var(--color-border)',
                        background: active ? 'var(--color-warning-subtle)' : 'var(--color-bg-elevated)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ fontSize: 'var(--text-sm)' }}>Approval {shortId(getId(approval))}</strong>
                        <Pill tone="warning">{approval.state || 'pending'}</Pill>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{approval.reason || 'No reason provided'}</div>
                    </button>
                  );
                })}
              </div>

              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 14, background: 'var(--color-bg-elevated)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <AlertTriangle size={16} color="var(--color-warning)" />
                  <strong>Review Action</strong>
                </div>
                <pre style={{ margin: 0, minHeight: 120, maxHeight: 220, overflow: 'auto', fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(activeApproval || {}, null, 2)}
                </pre>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Decision note"
                  style={{
                    width: '100%',
                    minHeight: 72,
                    marginTop: 12,
                    resize: 'vertical',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    padding: 10,
                    background: 'var(--color-bg-surface)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!activeApproval || Boolean(actionBusy)}
                    onClick={() => decideApproval(activeApproval, 'reject')}
                  >
                    {actionBusy.startsWith('reject') ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!activeApproval || Boolean(actionBusy)}
                    onClick={() => decideApproval(activeApproval, 'approve')}
                  >
                    {actionBusy.startsWith('approve') ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                    Approve
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="card card-padding">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={17} />
              <h2 className="section-title">Quick Controls</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={loadControlCenter}><RefreshCw size={15} /> Retry Load</button>
              <button type="button" className="btn btn-secondary" disabled><GitBranch size={15} /> Reroute</button>
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
};

export default AIControlCenter;
