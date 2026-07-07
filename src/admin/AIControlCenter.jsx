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
import { SkeletonAIControlCenter } from '../components/Skeleton';
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
const RUNS_PAGE_SIZE = 25;

const statusTone = (status = '') => {
  const normalized = status.toLowerCase();
  if (normalized.includes('fail') || normalized.includes('reject')) return 'danger';
  if (normalized.includes('pending') || normalized.includes('running')) return 'warning';
  if (normalized.includes('complete') || normalized.includes('approved') || normalized.includes('dispatch')) return 'success';
  return 'neutral';
};

const humanize = (value, fallback = 'AI action') => {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const actionTitle = (item) => item?.action_display_title || humanize(item?.action_type || item?.trigger_type);
const actionSummary = (item) => item?.action_summary || item?.reason || item?.summary || 'No summary provided.';
const entityLabel = (item) => item?.entity_display_label || item?.entity_display_name || item?.entity_display_type || humanize(item?.entity_type, 'CRM record');
const actorLabel = (item) => item?.requested_by_name || item?.created_by_name || 'AI service';

const traceTitle = (item) => {
  const labels = {
    build_context: 'Collected CRM context',
    retrieve_context: 'Reviewed knowledge base',
    build_action: 'Prepared recommendation',
    dispatch_action: 'Sent action for approval',
    create_action: 'Created CRM action',
    create_alert: 'Created alert request',
    score_lead: 'Calculated lead score',
  };
  const step = String(item?.step || '').trim().toLowerCase();
  return labels[step] || humanize(item?.step, 'Workflow step');
};

const traceSummary = (item) => {
  const payload = item?.payload && typeof item.payload === 'object' ? item.payload : {};
  if (payload.summary) return String(payload.summary);
  if (payload.reason) return String(payload.reason);
  if (payload.rag_sources?.length) return `Reviewed ${payload.rag_sources.length} knowledge source${payload.rag_sources.length === 1 ? '' : 's'}.`;
  if (payload.context_keys?.length) return `Prepared ${payload.context_keys.length} context field${payload.context_keys.length === 1 ? '' : 's'} for the agent.`;
  if (payload.entity_type) return `Prepared context for ${humanize(payload.entity_type, 'record')}.`;
  return 'Workflow step recorded.';
};

const isAdminUser = (user) => {
  const role = String(user?.role || '').toLowerCase();
  return Boolean(user?.is_admin || user?.is_superuser || role === 'admin');
};

const TechnicalDetails = ({ label = 'Technical details', data, enabled = false }) => {
  if (!enabled) return null;
  return (
  <details style={{ marginTop: 10, paddingTop: 2 }}>
    <summary style={{ cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', lineHeight: 1.4 }}>{label}</summary>
    <pre style={{ margin: '8px 0 0', maxHeight: 160, overflow: 'auto', fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(data || {}, null, 2)}
    </pre>
  </details>
  );
};

const RelatedEntities = ({ entities = [] }) => {
  const visible = entities.filter((entity) => entity?.name);
  if (visible.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
      {visible.map((entity, index) => (
        <Pill key={`${entity.field}-${index}`}>{entity.label}: {entity.name}</Pill>
      ))}
    </div>
  );
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

const actionCardStyle = {
  padding: 12,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  background: 'var(--color-bg-elevated)',
  display: 'grid',
  gap: 8,
};

const actionCardHeaderStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'start',
  gap: 10,
};

const actionTitleStyle = {
  minWidth: 0,
  fontSize: 'var(--text-sm)',
  lineHeight: 1.35,
};

const mutedLineStyle = {
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--text-xs)',
  lineHeight: 1.45,
};

const metadataRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 16,
  color: 'var(--color-text-tertiary)',
  fontSize: 'var(--text-xs)',
  lineHeight: 1,
};

const sectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: 28,
  marginBottom: 10,
  fontWeight: 'var(--weight-semibold)',
};

const AIControlCenter = ({ currentUser }) => {
  const [runs, setRuns] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [trace, setTrace] = useState([]);
  const [memory, setMemory] = useState([]);
  const [aiAgents, setAiAgents] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runsLoadingMore, setRunsLoadingMore] = useState(false);
  const [runsPagination, setRunsPagination] = useState({ page: 1, limit: RUNS_PAGE_SIZE, has_more: false });
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState('');
  const [agentToggleBusy, setAgentToggleBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const developerModeEnabled = isAdminUser(currentUser) && Boolean(currentUser?.developer_mode);

  const loadControlCenter = useCallback(async ({ page = 1, append = false } = {}) => {
    if (append) {
      setRunsLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const snapshot = await getControlCenterSnapshot({ runsPage: page, runsLimit: RUNS_PAGE_SIZE });
      const nextRuns = asArray(snapshot?.runs);
      setRuns((currentRuns) => {
        if (!append) return nextRuns;
        const byId = new Map(currentRuns.map((run) => [getId(run), run]));
        nextRuns.forEach((run) => byId.set(getId(run), run));
        return Array.from(byId.values());
      });
      setApprovals(asArray(snapshot?.approvals));
      setAiAgents(asArray(snapshot?.ai_agents));
      setRunsPagination(snapshot?.runs_pagination || { page, limit: RUNS_PAGE_SIZE, has_more: false });
      setSelectedRun((current) => current || nextRuns[0] || null);
    } catch (err) {
      setError(err?.message || 'Unable to load AI control center.');
    } finally {
      setLoading(false);
      setRunsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadControlCenter();
  }, [loadControlCenter]);

  useEffect(() => {
    let active = true;
    const loadDetails = async () => {
      const selectedRunId = getId(selectedRun);
      if (!selectedRunId) {
        setTrace([]);
        setMemory([]);
        return;
      }
      setDetailLoading(true);
      const tracePromise = getAgentRunTrace(selectedRunId);
      const memoryPromise = selectedRun.entity_type && selectedRun.entity_id
        ? getAgentMemory(selectedRun.entity_type, selectedRun.entity_id)
        : Promise.resolve([]);
      try {
        const [traceResult, memoryResult] = await Promise.allSettled([tracePromise, memoryPromise]);
        if (!active) return;
        setTrace(traceResult.status === 'fulfilled' ? asArray(traceResult.value) : []);
        setMemory(memoryResult.status === 'fulfilled' ? asArray(memoryResult.value) : []);
        if (traceResult.status === 'rejected') {
          setError(traceResult.reason?.message || 'Unable to load run trace.');
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
    const isTaskApproval = String(approval?.action_type || '').toLowerCase() === 'create_task';
    if (decision === 'approve' && isTaskApproval && !taskDueAt) {
      setError('Please choose a deadline before approving this AI task.');
      return;
    }
    setActionBusy(`${decision}:${id}`);
    setError('');
    try {
      if (decision === 'approve') {
        await approveAgentAction(id, note, isTaskApproval ? { due_at: taskDueAt } : {});
      } else {
        await rejectAgentAction(id, note);
      }
      setNote('');
      setTaskDueAt('');
      setSelectedApproval(null);
      await loadControlCenter();
    } catch (err) {
      setError(err?.message || `Unable to ${decision} action.`);
    } finally {
      setActionBusy('');
    }
  };

  const activeApproval = selectedApproval || approvals[0] || null;
  const activeApprovalId = getId(activeApproval);
  const activeApprovalCreatesTask = String(activeApproval?.action_type || '').toLowerCase() === 'create_task';

  useEffect(() => {
    const suggestedDueAt = activeApproval?.payload?.due_at;
    setTaskDueAt(activeApprovalCreatesTask && suggestedDueAt ? String(suggestedDueAt).slice(0, 16) : '');
  }, [activeApprovalId, activeApprovalCreatesTask, activeApproval?.payload?.due_at]);

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

  if (loading && aiAgents.length === 0 && runs.length === 0) {
    return (
      <PageTransition>
        <SkeletonAIControlCenter />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="reveal-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>AI Operations</div>
              <h1 className="page-title" style={{ marginTop: 4 }}>AI Control Center</h1>
              <p style={{ marginTop: 6, maxWidth: 620, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                Inspect agent runs, approval gates, action history, and the context used before the system writes back to CRM.
              </p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => loadControlCenter()} disabled={loading}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(420px, 1.4fr)', gap: 14, alignItems: 'start' }}>
          <section className="card card-padding" style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="section-title">Agent Runs</h2>
              <Pill>{runs.length} loaded</Pill>
            </div>
            {loading ? (
              <EmptyState><Loader2 size={16} className="animate-spin" />&nbsp;Loading runs...</EmptyState>
            ) : runs.length === 0 ? (
              <EmptyState>No agent runs yet.</EmptyState>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                {runs.map((run) => {
                  const active = getId(selectedRun) === getId(run);
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
                        display: 'grid',
                        gridTemplateRows: 'auto auto auto',
                        gap: 7,
                        minHeight: 94,
                      }}
                    >
                      <div style={actionCardHeaderStyle}>
                        <strong style={actionTitleStyle}>{actionTitle(run)}</strong>
                        <span style={{ display: 'inline-flex', gap: 6 }}>
                          {run.legacy_source && <Pill>legacy</Pill>}
                          <Pill tone={statusTone(run.status)}>{run.status || 'unknown'}</Pill>
                        </span>
                      </div>
                      <div style={mutedLineStyle}>
                        {entityLabel(run)}
                      </div>
                      <div style={metadataRowStyle}>
                        <Clock3 size={12} style={{ flexShrink: 0 }} />
                        <span>{formatDate(run.started_at)}</span>
                      </div>
                    </button>
                  );
                })}
                {runsPagination.has_more && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ justifyContent: 'center', minHeight: 38 }}
                    disabled={runsLoadingMore}
                    onClick={() => loadControlCenter({ page: runsPagination.page + 1, append: true })}
                  >
                    {runsLoadingMore ? <Loader2 size={15} className="animate-spin" /> : <FileClock size={15} />}
                    Load more runs
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="card card-padding" style={{ minWidth: 0, height: 503, maxHeight: 503, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="section-title">Run Inspector</h2>
              {selectedRun && <Pill tone={statusTone(selectedRun.status)}>{selectedRun.status}</Pill>}
            </div>
            {!selectedRun ? (
              <EmptyState>Select a run to inspect its trace.</EmptyState>
            ) : detailLoading ? (
              <EmptyState><Loader2 size={16} className="animate-spin" />&nbsp;Loading trace...</EmptyState>
            ) : (
              <div style={{ display: 'grid', gap: 14, flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
                <div style={actionCardStyle}>
                  <div style={actionCardHeaderStyle}>
                    <div>
                      <div style={{ fontWeight: 'var(--weight-semibold)', lineHeight: 1.35 }}>{actionTitle(selectedRun)}</div>
                      <div style={{ ...mutedLineStyle, marginTop: 6 }}>{actionSummary(selectedRun)}</div>
                    </div>
                    <Pill tone={statusTone(selectedRun.status)}>{selectedRun.status || 'unknown'}</Pill>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Pill>{entityLabel(selectedRun)}</Pill>
                  </div>
                  {(selectedRun.failure_cause || selectedRun.failure_detail) && (
                    <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)', lineHeight: 1.45 }}>
                      <strong>Failure:</strong> {selectedRun.failure_cause || 'Run failed'}
                      {selectedRun.failure_detail && <TechnicalDetails label="Failure details" data={{ detail: selectedRun.failure_detail }} enabled={developerModeEnabled} />}
                    </div>
                  )}
                  <TechnicalDetails label="Developer details" data={selectedRun} enabled={developerModeEnabled} />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 14,
                    alignItems: 'start',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={sectionHeaderStyle}>
                      <GitBranch size={16} /> Run Trace
                    </div>
                    {trace.length === 0 ? (
                      <EmptyState>No trace events recorded.</EmptyState>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                        {trace.map((item, index) => (
                          <div key={`${item.step}-${index}`} style={actionCardStyle}>
                            <div style={actionCardHeaderStyle}>
                              <strong style={actionTitleStyle}>{traceTitle(item)}</strong>
                              <span style={{ display: 'inline-flex', gap: 6 }}>
                                {item.legacy_source && <Pill>legacy</Pill>}
                                <Pill tone={statusTone(item.status)}>{item.status}</Pill>
                              </span>
                            </div>
                            <div style={mutedLineStyle}>{traceSummary(item)}</div>
                            <TechnicalDetails label="Trace payload" data={item.payload || {}} enabled={developerModeEnabled} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={sectionHeaderStyle}>
                      <FileClock size={16} /> Entity Memory
                    </div>
                    {memory.length === 0 ? (
                      <EmptyState>No memory for this entity.</EmptyState>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                        {memory.map((item) => (
                          <div key={getId(item)} style={actionCardStyle}>
                            <div style={actionCardHeaderStyle}>
                              <strong style={actionTitleStyle}>{actionTitle(item)}</strong>
                              <span style={{ display: 'inline-flex', gap: 6 }}>
                                {item.legacy_source && <Pill>legacy</Pill>}
                                <Pill tone={statusTone(item.approval_status)}>{item.approval_status || 'n/a'}</Pill>
                              </span>
                            </div>
                            <div style={mutedLineStyle}>{actionSummary(item)}</div>
                            <RelatedEntities entities={item.related_entities} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                        padding: 12,
                        borderRadius: 'var(--radius)',
                        border: active ? '1px solid var(--color-warning)' : '1px solid var(--color-border)',
                        background: active ? 'var(--color-warning-subtle)' : 'var(--color-bg-elevated)',
                        cursor: 'pointer',
                        display: 'grid',
                        gap: 8,
                      }}
                    >
                      <div style={actionCardHeaderStyle}>
                        <strong style={actionTitleStyle}>{actionTitle(approval)}</strong>
                        <Pill tone="warning">{approval.state || 'pending'}</Pill>
                      </div>
                      <div style={mutedLineStyle}>{entityLabel(approval)}</div>
                      <div style={{ ...mutedLineStyle, color: 'var(--color-text-tertiary)' }}>{actionSummary(approval)}</div>
                    </button>
                  );
                })}
              </div>

              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 14, background: 'var(--color-bg-elevated)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <AlertTriangle size={16} color="var(--color-warning)" />
                  <strong>Review Action</strong>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Action</div>
                    <div style={{ marginTop: 4, fontWeight: 'var(--weight-semibold)' }}>{actionTitle(activeApproval)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Related record</div>
                    <div style={{ marginTop: 4 }}>{entityLabel(activeApproval)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recommendation</div>
                    <div style={{ marginTop: 4, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{actionSummary(activeApproval)}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                    <div>
                      <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>Requested by</div>
                      <div style={{ marginTop: 3 }}>{actorLabel(activeApproval)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>Created</div>
                      <div style={{ marginTop: 3 }}>{formatDate(activeApproval?.created_at)}</div>
                    </div>
                  </div>
                  <RelatedEntities entities={activeApproval?.related_entities} />
                  <TechnicalDetails label="Technical payload" data={activeApproval || {}} enabled={developerModeEnabled} />
                </div>
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
                {activeApprovalCreatesTask && (
                  <div style={{ marginTop: 12 }}>
                    <label className="label" htmlFor="ai-task-deadline">Task deadline *</label>
                    <input
                      id="ai-task-deadline"
                      className="input"
                      type="datetime-local"
                      value={taskDueAt}
                      onChange={(event) => setTaskDueAt(event.target.value)}
                      required
                    />
                    <div style={{ marginTop: 6, color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
                      Required before approving AI-created tasks.
                    </div>
                  </div>
                )}
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
                    disabled={!activeApproval || Boolean(actionBusy) || (activeApprovalCreatesTask && !taskDueAt)}
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
