import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, CheckSquare, Mail, Phone, Plus, StickyNote } from 'lucide-react';
import { apiFetch } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';

const TABS = [
  { id: 'activity', label: 'Activity' },
  { id: 'emails', label: 'Emails' },
  { id: 'calls', label: 'Calls' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
  { id: 'attachments', label: 'Attachments' },
];

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const now = new Date();
  const diffMin = Math.floor((now - date) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const normalizeTask = (task) => ({
  id: task.id,
  title: task.title || 'Untitled task',
  description: task.description || '',
  status: task.status || 'open',
  priority: task.priority || 'medium',
  dueAt: task.due_at || '',
  dueDateLabel: formatDate(task.due_at),
  updatedLabel: formatDateTime(task.updated_at || task.created_at),
});

const normalizeNote = (note) => ({
  id: note.id,
  content: note.content || '',
  timestamp: note.updated_at || note.created_at,
  updatedLabel: formatDateTime(note.updated_at || note.created_at),
});

const LeadDetail = ({ user }) => {
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [emails, setEmails] = useState([]);
  const [calls, setCalls] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [ownerName, setOwnerName] = useState('');
  const [activeTab, setActiveTab] = useState('activity');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [dealDiscarded, setDealDiscarded] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
  });
  const isManager = ['sales_manager', 'manager', 'admin'].includes(String(user?.role || '').toLowerCase());

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      if (!leadId) return;
      setLoading(true);
      setError('');
      try {
        const [leadData, ownerData, emailData, callData, taskData, noteData] = await Promise.all([
          apiFetch(`/api/leads/${leadId}`),
          apiFetch(`/api/leads/${leadId}/owner`),
          apiFetch(`/api/leads/${leadId}/emails`),
          apiFetch(`/api/leads/${leadId}/calls`),
          apiFetch(`/api/tasks/?entity_type=lead&entity_id=${leadId}&skip=0&limit=50`),
          apiFetch(`/api/notes/?entity_type=lead&entity_id=${leadId}&skip=0&limit=50`),
        ]);
        if (!active) return;
        setLead(leadData);
        setOwnerName(ownerData?.name || ownerData?.email || 'Unassigned');
        setEmails(Array.isArray(emailData) ? emailData : []);
        setCalls(Array.isArray(callData) ? callData : []);
        setTasks(Array.isArray(taskData) ? taskData.map(normalizeTask) : []);
        setNotes(Array.isArray(noteData) ? noteData.map(normalizeNote) : []);
      } catch (err) {
        if (active) setError(err?.message || 'Unable to load lead details.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchAll();
    return () => { active = false; };
  }, [leadId]);

  const activityItems = useMemo(() => {
    const items = [];
    emails.forEach((email) => {
      items.push({
        id: `email-${email.id}`,
        type: 'email',
        title: email.subject || 'Email',
        subtitle: `${email.direction === 'sent' ? 'Sent to' : 'Received from'} ${email.direction === 'sent' ? email.to : email.from}`,
        timestamp: email.sent_at,
      });
    });
    calls.forEach((call) => {
      items.push({
        id: `call-${call.id}`,
        type: 'call',
        title: `${call.direction === 'outbound' ? 'Outbound call' : 'Inbound call'}`,
        subtitle: `${call.outcome || 'Call'} - ${Math.round((call.duration_seconds || 0) / 60)} min`,
        timestamp: call.started_at,
      });
    });
    tasks.forEach((task) => {
      items.push({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        subtitle: `Task · ${task.status}`,
        timestamp: task.dueAt || null,
      });
    });
    notes.forEach((note) => {
      items.push({
        id: `note-${note.id}`,
        type: 'note',
        title: 'Note added',
        subtitle: note.content.split('\n')[0] || 'Note',
        timestamp: note.timestamp,
      });
    });
    return items
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 50);
  }, [emails, calls, tasks, notes]);

  const handleCreateNote = async (event) => {
    event.preventDefault();
    if (!noteContent.trim()) return;
    try {
      const created = await apiFetch('/api/notes/', {
        method: 'POST',
        body: JSON.stringify({
          entity_type: 'lead',
          entity_id: leadId,
          content: noteContent.trim(),
        }),
      });
      setNotes((prev) => [normalizeNote(created), ...prev]);
      setNoteContent('');
      setNoteModalOpen(false);
    } catch (err) {
      setError(err?.message || 'Unable to create note.');
    }
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    if (!taskForm.title.trim()) return;
    const assignee = lead?.owner_id || user?.id;
    try {
      const created = await apiFetch('/api/tasks/', {
        method: 'POST',
        body: JSON.stringify({
          entity_type: 'lead',
          entity_id: leadId,
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || undefined,
          due_at: taskForm.dueDate || undefined,
          priority: taskForm.priority,
          assigned_to: assignee || undefined,
        }),
      });
      setTasks((prev) => [normalizeTask(created), ...prev]);
      setTaskForm({ title: '', description: '', dueDate: '', priority: 'medium' });
      setTaskModalOpen(false);
    } catch (err) {
      setError(err?.message || 'Unable to create task.');
    }
  };

  const handleConvertToDeal = async () => {
    if (!leadId) return;
    setError('');
    setNotice('');
    setIsConverting(true);
    try {
      await apiFetch(`/api/leads/${leadId}/convert-to-deal`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setLead((prev) => (prev ? { ...prev, converted: true, status: 'qualified' } : prev));
      setDealDiscarded(false);
      setNotice('Lead converted to deal.');
    } catch (err) {
      setError(err?.message || 'Unable to convert lead.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDiscardDeal = async () => {
    if (!leadId) return;
    setError('');
    setNotice('');
    setIsDiscarding(true);
    try {
      await apiFetch(`/api/leads/${leadId}/discard-deal`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setDealDiscarded(true);
      setNotice('Deal marked as lost.');
    } catch (err) {
      setError(err?.message || 'Unable to discard deal.');
    } finally {
      setIsDiscarding(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div style={{ display: 'grid', gap: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageTransition>
    );
  }

  if (!lead) {
    return (
      <PageTransition>
        <EmptyState type="leads" title="Lead not found" desc="We could not find this lead." />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
            <Link to="/leads" style={{ color: 'inherit', textDecoration: 'none' }}>Leads</Link>
            <span>/</span>
            <span>{lead.name || 'Lead details'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 className="page-title" style={{ marginBottom: 4 }}>{lead.name || 'Lead'}</h1>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                {lead.email || 'No email'} - {lead.phone || 'No phone'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {activeTab === 'tasks' && (
                <button className="btn btn-primary btn-sm" onClick={() => setTaskModalOpen(true)}>
                  <Plus size={14} /> New Task
                </button>
              )}
              {activeTab === 'notes' && (
                <button className="btn btn-primary btn-sm" onClick={() => setNoteModalOpen(true)}>
                  <Plus size={14} /> New Note
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="btn btn-sm"
                  style={{
                    borderColor: isActive ? 'var(--color-border-strong)' : 'var(--color-border)',
                    background: isActive ? 'var(--color-bg-elevated)' : 'transparent',
                    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {error && (
            <div style={{ padding: 12, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}

          {notice && (
            <div style={{ padding: 12, background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--color-accent-text)' }}>
              {notice}
            </div>
          )}

          {activeTab === 'activity' && (
            activityItems.length ? (
              <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activityItems.map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div className="avatar avatar-sm avatar-accent" style={{ marginTop: 2 }}>
                      {item.type === 'email' ? <Mail size={12} /> : item.type === 'call' ? <Phone size={12} /> : item.type === 'task' ? <CheckSquare size={12} /> : <StickyNote size={12} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'var(--weight-medium)' }}>{item.title}</div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>{item.subtitle}</div>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{formatDateTime(item.timestamp)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState type="activity" title="No activity" desc="No recent activity for this lead." />
            )
          )}

          {activeTab === 'emails' && (
            emails.length ? (
              <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
                {emails.map((email) => (
                  <div key={email.id} style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: 'var(--weight-medium)' }}>{email.subject || 'Email'}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{formatDateTime(email.sent_at)}</div>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{email.direction === 'sent' ? `To: ${email.to}` : `From: ${email.from}`}</div>
                    <div style={{ marginTop: 6, color: 'var(--color-text-secondary)' }}>{email.snippet}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState type="emails" title="No emails" desc="No email activity yet." />
            )
          )}

          {activeTab === 'calls' && (
            calls.length ? (
              <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
                {calls.map((call) => (
                  <div key={call.id} style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: 'var(--weight-medium)' }}>{call.direction === 'outbound' ? 'Outbound call' : 'Inbound call'}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{formatDateTime(call.started_at)}</div>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{call.outcome} - {Math.round((call.duration_seconds || 0) / 60)} min</div>
                    <div style={{ marginTop: 6, color: 'var(--color-text-secondary)' }}>{call.note}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState type="calls" title="No calls" desc="No call logs for this lead." />
            )
          )}

          {activeTab === 'tasks' && (
            tasks.length ? (
              <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
                {tasks.map((task) => (
                  <div key={task.id} style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: 'var(--weight-medium)' }}>{task.title}</div>
                      <div className="badge badge-muted">{task.status}</div>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{task.description || 'No description.'}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                      <span><Calendar size={12} /> {task.dueDateLabel}</span>
                      <span>Priority: {task.priority}</span>
                      <span>{task.updatedLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState type="tasks" title="No tasks" desc="No tasks linked to this lead." />
            )
          )}

          {activeTab === 'notes' && (
            notes.length ? (
              <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
                {notes.map((note) => (
                  <div key={note.id} style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: 'var(--weight-medium)' }}>Note</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{note.updatedLabel}</div>
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)', marginTop: 6 }}>{note.content}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState type="notes" title="No notes" desc="No notes linked to this lead." />
            )
          )}

          {activeTab === 'attachments' && (
            <EmptyState type="files" title="No attachments" desc="Attachments will appear here." />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Lead</div>
            <div style={{ fontWeight: 'var(--weight-medium)', marginBottom: 12 }}>{lead.name || 'Lead'}</div>
            <div style={{ display: 'grid', gap: 8, fontSize: 'var(--text-sm)' }}>
              <div><strong>Status:</strong> {lead.status || 'new'}</div>
              <div><strong>Source:</strong> {lead.source || '-'}</div>
              <div><strong>Organization:</strong> {lead.company || '-'}</div>
              <div><strong>Owner:</strong> {ownerName || 'Unassigned'}</div>
            </div>
          </div>

          <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 'var(--weight-medium)' }}>Quick actions</div>
            {isManager && <button className="btn btn-secondary btn-sm">Assign Lead</button>}
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleConvertToDeal}
              disabled={isConverting || lead?.converted}
            >
              {lead?.converted ? 'Converted to Deal' : isConverting ? 'Converting...' : 'Convert to Deal'}
            </button>
            {isManager && lead?.converted && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleDiscardDeal}
                disabled={isDiscarding || dealDiscarded}
              >
                {dealDiscarded ? 'Deal Discarded' : isDiscarding ? 'Discarding...' : 'Discard Deal'}
              </button>
            )}
            {isManager && <button className="btn btn-secondary btn-sm">Update Status</button>}
          </div>
        </div>
      </div>

      {noteModalOpen && (
        <div className="modal-overlay" onClick={() => setNoteModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="section-title">Add Note</h3>
              <button onClick={() => setNoteModalOpen(false)} className="btn btn-ghost btn-icon" aria-label="Close">X</button>
            </div>
            <form onSubmit={handleCreateNote} style={{ padding: 20, display: 'grid', gap: 12 }}>
              <textarea
                className="input"
                style={{ minHeight: 120 }}
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Write a note about this lead..."
              />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="section-title">Add Task</h3>
              <button onClick={() => setTaskModalOpen(false)} className="btn btn-ghost btn-icon" aria-label="Close">X</button>
            </div>
            <form onSubmit={handleCreateTask} style={{ padding: 20, display: 'grid', gap: 12 }}>
              <div>
                <label className="label">Title *</label>
                <input
                  className="input"
                  value={taskForm.title}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  style={{ minHeight: 100 }}
                  value={taskForm.description}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="label">Due date</label>
                  <input
                    type="date"
                    className="input"
                    value={taskForm.dueDate}
                    onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select
                    className="input"
                    value={taskForm.priority}
                    onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value }))}
                  >
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
    </PageTransition>
  );
};

export default LeadDetail;
