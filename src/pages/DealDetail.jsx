import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BriefcaseBusiness, Building2, CalendarClock, CheckSquare, Copy, FileText, Mail, Paperclip, Pencil, Phone, PhoneOff, Plus, StickyNote, UserRound, X } from 'lucide-react';
import { apiFetch } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { EntityCard } from '../components/EntityCard';
import AIInsights from '../components/AIInsights';
import { SkeletonDealDetail } from '../components/Skeleton';
import { toast } from '../utils/toast';

const TABS = [
  { id: 'activity', label: 'Activity' },
  { id: 'emails', label: 'Emails' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
  { id: 'attachments', label: 'Attachments' },
];

const STATUS_LABELS = { qualification: 'Qualification', demo_making: 'Demo/Making', proposal_quotation: 'Proposal/Quotation', negotiation: 'Negotiation', ready_to_close: 'Ready to Close', won: 'Won' };
const STATUS_ORDER = ['qualification', 'demo_making', 'proposal_quotation', 'negotiation', 'ready_to_close', 'won'];
const STATUS_BADGE = { qualification: 'badge-muted', demo_making: 'badge-accent', proposal_quotation: 'badge-success', negotiation: 'badge-danger', ready_to_close: 'badge-purple', won: 'badge-orange' };
const TASK_STATUS_BADGE = { backlog: 'badge-muted', todo: 'badge-accent', in_progress: 'badge-warning', done: 'badge-success', canceled: 'badge-danger', open: 'badge-accent' };
const TASK_STATUS_LABELS = { backlog: 'Backlog', todo: 'Todo', in_progress: 'In Progress', done: 'Done', canceled: 'Canceled', open: 'Open' };
const DEAL_TYPE_LABELS = { new_business: 'New Business', upsell: 'Upsell', renewal: 'Renewal', cross_sell: 'Cross-sell' };
const DEAL_TYPE_ORDER = ['new_business', 'upsell', 'renewal', 'cross_sell'];
const CURRENCY_OPTIONS = ['USD', 'PKR', 'EUR', 'GBP', 'AED'];

const normalizeKey = (value) => (value || '').toString().trim().toLowerCase().replace(/[/-]/g, '_').replace(/\s+/g, '_');
const formatStatus = (value) => STATUS_LABELS[normalizeKey(value)] || value || 'Qualification';
const formatTaskStatus = (value) => TASK_STATUS_LABELS[normalizeKey(value)] || value || 'Backlog';
const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(String(value).replace(/[^0-9.-]+/g, ''));
  return Number.isNaN(parsed) ? undefined : parsed;
};

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const toApiDateTime = (value) => (value ? `${value}T00:00:00` : undefined);

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const formatMoney = (value, currency = 'USD') => {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(number);
  } catch {
    return `${currency} ${number.toFixed(2)}`;
  }
};

const normalizeTask = (task) => ({
  id: task.id,
  title: task.title || 'Untitled task',
  description: task.description || '',
  status: task.status === 'open' ? 'todo' : task.status || 'backlog',
  priority: task.priority || 'medium',
  dueAt: task.due_at || '',
  dueDateLabel: formatDate(task.due_at),
  updatedLabel: formatDateTime(task.updated_at || task.created_at),
  source: task.source || 'manual',
  aiReason: task.ai_reason || '',
});

const normalizeNote = (note) => ({
  id: note.id,
  content: note.content || '',
  timestamp: note.updated_at || note.created_at,
  updatedLabel: formatDateTime(note.updated_at || note.created_at),
  source: note.source || 'manual',
  aiReason: note.ai_reason || '',
});

const DetailMetric = ({ label, value }) => (
  <div className="deal-detail-metric">
    <span>{label}</span>
    <strong>{value || '-'}</strong>
  </div>
);

const DealDetail = ({ user }) => {
  const { dealId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('activity');
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSavingDeal, setIsSavingDeal] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callSession, setCallSession] = useState(null);
  const [inviteUrl, setInviteUrl] = useState('');
  const [callWorking, setCallWorking] = useState(false);
  const [callNotice, setCallNotice] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [taskForm, setTaskForm] = useState({ title: '', description: '', dueDate: '', priority: 'medium' });
  const [dealForm, setDealForm] = useState({
    value: '',
    currency: 'USD',
    status: 'qualification',
    dealType: 'new_business',
    expectedClose: '',
    closedAt: '',
    lostReason: '',
  });

  const isManager = ['sales_manager', 'manager', 'admin'].includes(String(user?.role || '').toLowerCase());

  const loadWorkspace = async () => {
    if (!dealId) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/deals/${dealId}/workspace`, {}, { forceRefresh: true, cache: false });
      setWorkspace(data);
    } catch (err) {
      setError(err?.message || 'Unable to load deal workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [dealId]);

  const deal = workspace?.deal || {};
  const lead = workspace?.lead || {};
  const organization = workspace?.organization || {};
  const owner = workspace?.owner || {};
  const emails = workspace?.emails || [];
  const calls = workspace?.calls || [];
  const tasks = useMemo(() => (workspace?.tasks || []).map(normalizeTask), [workspace]);
  const notes = useMemo(() => (workspace?.notes || []).map(normalizeNote), [workspace]);
  const aiHistory = workspace?.ai_history || [];
  const statusLogs = workspace?.status_logs || [];
  const attachments = workspace?.attachments || [];

  const dealName = organization.name || deal.lead_company || lead.company || lead.name || 'Deal';

  const openEditDeal = () => {
    setDealForm({
      value: deal.value === null || deal.value === undefined ? '' : String(deal.value),
      currency: deal.currency || 'USD',
      status: normalizeKey(deal.status || deal.stage || 'qualification'),
      dealType: normalizeKey(deal.deal_type || 'new_business'),
      expectedClose: toDateInputValue(deal.expected_close_at),
      closedAt: toDateInputValue(deal.closed_at),
      lostReason: deal.lost_reason || '',
    });
    setEditModalOpen(true);
  };

  const activityItems = useMemo(() => {
    const items = [];
    aiHistory.forEach((item) => items.push({
      id: `ai-${item.id}`,
      type: 'AI',
      title: item.payload?.title || item.action_type || 'AI insight',
      subtitle: item.reason || 'Deal risk analysis',
      timestamp: item.created_at,
    }));
    statusLogs.forEach((item) => items.push({
      id: `status-${item.id}`,
      type: 'Status',
      title: `Status changed to ${formatStatus(item.new_status)}`,
      subtitle: item.old_status ? `From ${formatStatus(item.old_status)}` : 'Initial deal status',
      timestamp: item.created_at,
    }));
    emails.forEach((email) => items.push({
      id: `email-${email.id}`,
      type: 'Email',
      title: email.subject || 'Email',
      subtitle: `${email.direction === 'sent' ? 'Sent to' : 'Received from'} ${email.direction === 'sent' ? email.to : email.from}`,
      timestamp: email.sent_at,
    }));
    calls.forEach((call) => items.push({
      id: `call-${call.id}`,
      type: 'Meeting',
      title: call.outcome || `${call.direction === 'outbound' ? 'Outbound' : 'Inbound'} call`,
      subtitle: `${Math.round((call.duration_seconds || 0) / 60)} min`,
      timestamp: call.started_at || call.created_at,
    }));
    tasks.forEach((task) => items.push({
      id: `task-${task.id}`,
      type: 'Task',
      title: task.title,
      subtitle: formatTaskStatus(task.status),
      timestamp: task.dueAt || task.updated_at,
    }));
    notes.forEach((note) => items.push({
      id: `note-${note.id}`,
      type: 'Note',
      title: 'Note added',
      subtitle: note.content.split('\n')[0] || 'Note',
      timestamp: note.timestamp,
    }));
    return items.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).slice(0, 60);
  }, [aiHistory, statusLogs, emails, calls, tasks, notes]);

  const handleCreateNote = async (event) => {
    event.preventDefault();
    if (!noteContent.trim()) return;
    try {
      await apiFetch('/api/notes/', {
        method: 'POST',
        body: JSON.stringify({ entity_type: 'deal', entity_id: dealId, content: noteContent.trim() }),
      });
      setNoteContent('');
      setNoteModalOpen(false);
      toast.success('Deal note added.');
      await loadWorkspace();
    } catch (err) {
      toast.error(err?.message || 'Unable to add deal note.');
    }
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    if (!taskForm.title.trim()) return;
    try {
      await apiFetch('/api/tasks/', {
        method: 'POST',
        body: JSON.stringify({
          entity_type: 'deal',
          entity_id: dealId,
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || undefined,
          due_at: taskForm.dueDate || undefined,
          priority: taskForm.priority,
          assigned_to: deal.owner_id || user?.id || undefined,
        }),
      });
      setTaskForm({ title: '', description: '', dueDate: '', priority: 'medium' });
      setTaskModalOpen(false);
      toast.success('Deal task added.');
      await loadWorkspace();
    } catch (err) {
      toast.error(err?.message || 'Unable to add deal task.');
    }
  };

  const handleUpdateDeal = async (event) => {
    event.preventDefault();
    setIsSavingDeal(true);
    try {
      const status = normalizeKey(dealForm.status || 'qualification');
      const payload = {
        value: parseAmount(dealForm.value),
        currency: dealForm.currency || 'USD',
        status,
        stage: status,
        deal_type: normalizeKey(dealForm.dealType || 'new_business'),
        expected_close_at: toApiDateTime(dealForm.expectedClose),
        closed_at: toApiDateTime(dealForm.closedAt),
        lost_reason: dealForm.lostReason.trim() || undefined,
      };
      await apiFetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await loadWorkspace();
      setEditModalOpen(false);
      toast.success('Deal updated.');
    } catch (err) {
      toast.error(err?.message || 'Unable to update deal.');
    } finally {
      setIsSavingDeal(false);
    }
  };

  const handleStartCall = async () => {
    if (!lead.id) {
      toast.error('This deal has no linked lead to call.');
      return;
    }
    setCallWorking(true);
    setCallNotice('');
    try {
      const response = await apiFetch(
        '/api/calls/start',
        {
          method: 'POST',
          body: JSON.stringify({ lead_id: lead.id, direction: 'outbound' }),
        },
        { timeoutMs: 20000, cache: false }
      );
      setCallSession(response.call);
      setInviteUrl(response.invite_url || '');
      setWorkspace((current) => current ? { ...current, calls: [response.call, ...(current.calls || [])] } : current);
      setActiveTab('meetings');
      setCallModalOpen(true);
      setCallNotice(lead.email ? `Invite ready for ${lead.email}.` : 'Invite link is ready.');
      toast.success('Deal call started.');
    } catch (err) {
      toast.error(err?.message || 'Unable to start deal call.');
    } finally {
      setCallWorking(false);
    }
  };

  const handleEndCall = async () => {
    if (!callSession?.id) {
      setCallModalOpen(false);
      return;
    }
    setCallWorking(true);
    try {
      const updated = await apiFetch(
        `/api/calls/${callSession.id}/end`,
        { method: 'POST' },
        { timeoutMs: 20000, cache: false }
      );
      setWorkspace((current) => current ? {
        ...current,
        calls: (current.calls || []).map((call) => call.id === updated.id ? updated : call),
      } : current);
      setCallSession(updated);
      setCallModalOpen(false);
      toast.success('Call ended.');
    } catch (err) {
      toast.error(err?.message || 'Unable to end call.');
    } finally {
      setCallWorking(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCallNotice('Invite link copied.');
      toast.success('Invite link copied.');
    } catch {
      setCallNotice('Unable to copy invite link.');
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <SkeletonDealDetail />
      </PageTransition>
    );
  }

  if (error || !workspace) {
    return (
      <PageTransition>
        <div className="card" style={{ padding: 24, display: 'grid', gap: 12 }}>
          <Link to="/deals" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}><ArrowLeft size={14} /> Deals</Link>
          <div style={{ color: 'var(--color-danger)' }}>{error || 'Deal not found.'}</div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="crm-page deal-detail-page">
        <div className="deal-detail-hero">
          <div>
            <Link to="/deals" className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }}><ArrowLeft size={14} /> Deals</Link>
            <div className="page-kicker">Deal Workspace</div>
            <h1 className="page-title">{dealName}</h1>
            <div className="deal-detail-subtitle">
              {lead.name && <span><UserRound size={14} /> {lead.name}</span>}
              {organization.name && <span><Building2 size={14} /> {organization.name}</span>}
              {owner.name || owner.email ? <span><BriefcaseBusiness size={14} /> {owner.name || owner.email}</span> : null}
            </div>
          </div>
          <div className="deal-detail-actions">
            {isManager && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={openEditDeal}>
                <Pencil size={14} /> Edit Deal
              </button>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleStartCall} disabled={callWorking || !lead.id}>
              <Phone size={14} /> {callWorking ? 'Starting...' : 'Call'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNoteModalOpen(true)}>
              <StickyNote size={14} /> Add Note
            </button>
            {isManager && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setTaskModalOpen(true)}>
                <Plus size={14} /> Add Task
              </button>
            )}
          </div>
        </div>

        <div className="deal-detail-grid">
          <div className="deal-detail-main">
            <section className="deal-detail-metrics">
              <DetailMetric label="Deal value" value={formatMoney(deal.value, deal.currency)} />
              <DetailMetric label="Status" value={<span className={`badge ${STATUS_BADGE[normalizeKey(deal.status)] || 'badge-muted'}`}>{formatStatus(deal.status)}</span>} />
              <DetailMetric label="Deal type" value={String(deal.deal_type || 'new_business').replace(/_/g, ' ')} />
              <DetailMetric label="Expected close" value={formatDate(deal.expected_close_at)} />
            </section>

            <AIInsights
              items={aiHistory}
              title="Deal Risk Analysis"
              eyebrow="AI Risk Watcher"
              emptyTitle="No AI risk analysis yet"
              emptyDescription="Deal risk recommendations will appear here after the risk watcher runs."
              limit={4}
              collapsible
            />

            <div className="tab-row">
              {TABS.map((tab) => (
                <button key={tab.id} className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`} type="button" onClick={() => setActiveTab(tab.id)}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="card" style={{ padding: 16 }}>
              {activeTab === 'activity' && (
                activityItems.length ? (
                  <div className="activity-list">
                    {activityItems.map((item) => (
                      <div className="activity-item" key={item.id}>
                        <div className="activity-icon"><FileText size={14} /></div>
                        <div>
                          <div style={{ fontWeight: 'var(--weight-medium)' }}>{item.title}</div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>{item.subtitle}</div>
                        </div>
                        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>{formatDateTime(item.timestamp)}</div>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState type="activity" title="No activity" desc="Deal activity will appear here." />
              )}

              {activeTab === 'emails' && (
                emails.length ? (
                  <div className="activity-list">
                    {emails.map((email) => (
                      <div className="activity-item" key={email.id}>
                        <div className="activity-icon"><Mail size={14} /></div>
                        <div>
                          <div style={{ fontWeight: 'var(--weight-medium)' }}>{email.subject || 'Email'}</div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>{email.snippet}</div>
                          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>{email.direction === 'sent' ? `To ${email.to}` : `From ${email.from}`}</div>
                        </div>
                        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>{formatDateTime(email.sent_at)}</div>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState type="emails" title="No emails" desc="Deal emails will appear here." />
              )}

              {activeTab === 'meetings' && (
                calls.length ? (
                  <div className="activity-list">
                    {calls.map((call) => (
                      <div className="activity-item" key={call.id}>
                        <div className="activity-icon"><Phone size={14} /></div>
                        <div>
                          <div style={{ fontWeight: 'var(--weight-medium)' }}>{call.outcome || 'Deal meeting'}</div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                            {call.direction || 'call'} - {Math.round((call.duration_seconds || 0) / 60)} min
                          </div>
                          {call.transcript && <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>{call.transcript.slice(0, 180)}</div>}
                        </div>
                        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>{formatDateTime(call.started_at || call.created_at)}</div>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState type="calls" title="No meetings" desc="Calls and meetings linked through the deal contact will appear here." />
              )}

              {activeTab === 'tasks' && (
                tasks.length ? (
                  <div className="entity-grid">
                    {tasks.map((task) => (
                      <EntityCard
                        key={task.id}
                        title={task.title}
                        description={task.description}
                        descriptionFallback="No description."
                        accentClass="note-border-accent"
                        statusSlot={<span className={`badge ${TASK_STATUS_BADGE[normalizeKey(task.status)] || 'badge-muted'}`}>{formatTaskStatus(task.status)}</span>}
                        badges={[{ label: task.dueDateLabel }, { label: `Priority: ${task.priority}` }, { label: task.updatedLabel }]}
                      />
                    ))}
                  </div>
                ) : <EmptyState type="tasks" title="No deal tasks" desc="Add next steps for this deal." />
              )}

              {activeTab === 'notes' && (
                notes.length ? (
                  <div className="entity-grid">
                    {notes.map((note) => (
                      <EntityCard
                        key={note.id}
                        title="Deal note"
                        description={note.content}
                        descriptionFallback="No note content."
                        accentClass="note-border-success"
                        iconSlot={<StickyNote size={14} style={{ color: 'var(--color-text-tertiary)' }} />}
                        badges={[{ label: note.updatedLabel }]}
                        clampDescription
                      />
                    ))}
                  </div>
                ) : <EmptyState type="notes" title="No deal notes" desc="Capture decisions, blockers, and next steps here." />
              )}

              {activeTab === 'attachments' && (
                attachments.length ? (
                  <div className="entity-grid">
                    {attachments.map((file) => (
                      <EntityCard key={file.id} title={file.name || 'Attachment'} description={file.description || ''} iconSlot={<Paperclip size={14} />} />
                    ))}
                  </div>
                ) : <EmptyState type="files" title="No attachments" desc="Deal proposals, quotes, and signed documents will appear here." />
              )}
            </div>
          </div>

          <aside className="deal-detail-sidebar">
            <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div className="section-title">Deal Details</div>
              <div className="detail-list">
                <div><strong>Type:</strong> {String(deal.deal_type || 'new_business').replace(/_/g, ' ')}</div>
                <div><strong>Currency:</strong> {deal.currency || '-'}</div>
                <div><strong>Created:</strong> {formatDate(deal.created_at)}</div>
                <div><strong>Updated:</strong> {formatDate(deal.updated_at)}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div className="section-title">Account</div>
              <div className="detail-list">
                <div><strong>Organization:</strong> {organization.id ? <Link to={`/orgs/${organization.id}`}>{organization.name || 'Open organization'}</Link> : organization.name || '-'}</div>
                <div><strong>Industry:</strong> {organization.industry || '-'}</div>
                <div><strong>Website:</strong> {organization.website || '-'}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div className="section-title">Primary Contact</div>
              <div className="detail-list">
                <div><strong>Lead:</strong> {lead.id ? <Link to={`/leads/${lead.id}`}>{lead.name || 'Open lead'}</Link> : lead.name || '-'}</div>
                <div><strong>Email:</strong> {lead.email || '-'}</div>
                <div><strong>Phone:</strong> {lead.phone || '-'}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div className="section-title">Workspace Signals</div>
              <div className="deal-signal-grid">
                <span><CalendarClock size={14} /> {calls.length} meetings</span>
                <span><Mail size={14} /> {emails.length} emails</span>
                <span><CheckSquare size={14} /> {tasks.length} tasks</span>
                <span><StickyNote size={14} /> {notes.length} notes</span>
              </div>
            </div>
          </aside>
        </div>

        {noteModalOpen && (
          <div className="modal-overlay" onClick={() => setNoteModalOpen(false)}>
            <div className="modal-content" style={{ maxWidth: 520 }} onClick={(event) => event.stopPropagation()}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 className="section-title">Add Deal Note</h3>
              </div>
              <form onSubmit={handleCreateNote} style={{ padding: 20, display: 'grid', gap: 12 }}>
                <textarea className="input" style={{ minHeight: 120 }} value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="Capture deal context..." />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setNoteModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Note</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {taskModalOpen && (
          <div className="modal-overlay" onClick={() => setTaskModalOpen(false)}>
            <div className="modal-content" style={{ maxWidth: 520 }} onClick={(event) => event.stopPropagation()}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 className="section-title">Add Deal Task</h3>
              </div>
              <form onSubmit={handleCreateTask} style={{ padding: 20, display: 'grid', gap: 12 }}>
                <div>
                  <label className="label">Title *</label>
                  <input className="input" value={taskForm.title} onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))} required />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input" style={{ minHeight: 90 }} value={taskForm.description} onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="label">Due date</label>
                    <input type="date" className="input" value={taskForm.dueDate} onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Priority</label>
                    <select className="input" value={taskForm.priority} onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value }))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setTaskModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Task</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editModalOpen && (
          <div className="modal-overlay" onClick={() => !isSavingDeal && setEditModalOpen(false)}>
            <div className="modal-content" style={{ maxWidth: 560 }} onClick={(event) => event.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 className="section-title">Edit Deal</h3>
                <button className="btn btn-ghost btn-icon" type="button" onClick={() => setEditModalOpen(false)} disabled={isSavingDeal} aria-label="Close">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleUpdateDeal} style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Deal value</label>
                    <input className="input" value={dealForm.value} onChange={(event) => setDealForm((prev) => ({ ...prev, value: event.target.value }))} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="label">Currency</label>
                    <select className="input" value={dealForm.currency} onChange={(event) => setDealForm((prev) => ({ ...prev, currency: event.target.value }))}>
                      {CURRENCY_OPTIONS.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Status</label>
                    <select className="input" value={dealForm.status} onChange={(event) => setDealForm((prev) => ({ ...prev, status: event.target.value }))}>
                      {STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Deal type</label>
                    <select className="input" value={dealForm.dealType} onChange={(event) => setDealForm((prev) => ({ ...prev, dealType: event.target.value }))}>
                      {DEAL_TYPE_ORDER.map((type) => <option key={type} value={type}>{DEAL_TYPE_LABELS[type]}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Expected close</label>
                    <input type="date" className="input" value={dealForm.expectedClose} onChange={(event) => setDealForm((prev) => ({ ...prev, expectedClose: event.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Closed date</label>
                    <input type="date" className="input" value={dealForm.closedAt} onChange={(event) => setDealForm((prev) => ({ ...prev, closedAt: event.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="label">Lost reason</label>
                  <textarea className="input" style={{ minHeight: 90 }} value={dealForm.lostReason} onChange={(event) => setDealForm((prev) => ({ ...prev, lostReason: event.target.value }))} placeholder="Capture loss reason if this deal is not moving forward." />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditModalOpen(false)} disabled={isSavingDeal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSavingDeal}>{isSavingDeal ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {callModalOpen && (
          <div className="modal-overlay no-blur" onClick={() => !callWorking && setCallModalOpen(false)}>
            <div className="modal-content" style={{ maxWidth: 500 }} onClick={(event) => event.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <h3 className="section-title">Deal Call</h3>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                    {lead.name || dealName}
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon" type="button" onClick={() => setCallModalOpen(false)} disabled={callWorking} aria-label="Close">
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: 20, display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  <div>Contact: {lead.name || 'Linked lead'}</div>
                  <div>Email: {lead.email || 'Missing'}</div>
                  <div>Invite link: {inviteUrl ? 'Ready' : 'Generating...'}</div>
                </div>
                {callNotice && (
                  <div style={{ padding: 10, borderRadius: 8, background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                    {callNotice}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" type="button" onClick={handleCopyInvite} disabled={!inviteUrl}>
                    <Copy size={14} /> Copy invite
                  </button>
                  <button className="btn btn-danger" type="button" onClick={handleEndCall} disabled={callWorking}>
                    <PhoneOff size={14} /> {callWorking ? 'Ending...' : 'End call'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default DealDetail;
