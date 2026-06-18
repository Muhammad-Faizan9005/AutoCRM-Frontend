import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckSquare, Mail, Phone, PhoneOff, Plus, StickyNote } from 'lucide-react';
import { apiFetch } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { EntityCard } from '../components/EntityCard';
import { SkeletonLeadDetail } from '../components/Skeleton';
import { useCallSession } from '../hooks/useCallSession';
import { useCallRecording } from '../hooks/useCallRecording';
import { toast } from '../utils/toast';

const CARD_ACCENTS = ['note-border-accent', 'note-border-success', 'note-border-warning'];


const TABS = [
  { id: 'activity', label: 'Activity' },
  { id: 'emails', label: 'Emails' },
  { id: 'calls', label: 'Calls' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
  { id: 'attachments', label: 'Attachments' },
];

const LEAD_STATUS_LABELS = { new: 'New', contacted: 'Contacted', nurture: 'Nurture', qualified: 'Qualified', unqualified: 'Unqualified', junk: 'Junk' };
const TASK_STATUS_LABELS = { backlog: 'Backlog', todo: 'Todo', in_progress: 'In Progress', done: 'Done', canceled: 'Canceled' };
const TASK_STATUS_BADGE = { backlog: 'badge-muted', todo: 'badge-accent', in_progress: 'badge-warning', done: 'badge-success', canceled: 'badge-danger' };
const TASK_STATUS_ACCENT = { backlog: 'note-border-muted', todo: 'note-border-accent', in_progress: 'note-border-warning', done: 'note-border-success', canceled: 'note-border-danger' };
const normalizeStatus = (status) => (status || '').toString().trim().toLowerCase().replace(/[/-]/g, '_').replace(/\s+/g, '_');
const formatLeadStatus = (status) => LEAD_STATUS_LABELS[normalizeStatus(status)] || status || 'New';
const formatTaskStatus = (status) => TASK_STATUS_LABELS[normalizeStatus(status) === 'open' ? 'todo' : normalizeStatus(status)] || status || 'Backlog';
const formatLeadSource = (source) => {
  const normalized = normalizeStatus(source);
  if (!normalized || normalized === 'manual' || normalized === 'manually_added') return 'Manually Added';
  return String(source).trim();
};

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

const formatTimer = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const buildRecordingUrl = (recordingPath) => {
  if (!recordingPath) return '';
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const normalized = recordingPath.replace(/\\/g, '/');
  const urlPath = normalized.replace(/^storage\//, '/static/');
  return `${apiBase}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
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

const LeadDetail = ({ user }) => {
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [emails, setEmails] = useState([]);
  const [calls, setCalls] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [aiHistory, setAiHistory] = useState([]);
  const [ownerName, setOwnerName] = useState('');
  const [activeTab, setActiveTab] = useState('activity');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [notice, setNotice] = useState('');
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callSession, setCallSession] = useState(null);
  const [inviteUrl, setInviteUrl] = useState('');
  const [callTimer, setCallTimer] = useState(0);
  const [callWorking, setCallWorking] = useState(false);
  const [callNotice, setCallNotice] = useState('');
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const recordingUploadedRef = useRef(new Set());
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

  const {
    status: callStatus,
    error: callError,
    localStream,
    remoteStream,
    muted,
    recordingActive,
    start: startCallSession,
    end: endCallSession,
    toggleMute,
    sendSignal,
  } = useCallSession();

  const {
    isRecording,
    isPaused,
    start: startRecording,
    stop: stopRecording,
    pause: pauseRecording,
    resume: resumeRecording,
    attachRemoteStream,
  } = useCallRecording();

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      if (!leadId) return;
      setLoading(true);
      setError('');
      try {
        const results = await Promise.allSettled([
          apiFetch(`/api/leads/${leadId}`),
          apiFetch(`/api/leads/${leadId}/owner`),
          apiFetch(`/api/leads/${leadId}/emails`),
          apiFetch(`/api/leads/${leadId}/calls`),
          apiFetch(`/api/tasks/?entity_type=lead&entity_id=${leadId}&skip=0&limit=50`),
          apiFetch(`/api/notes/?entity_type=lead&entity_id=${leadId}&skip=0&limit=50`),
          apiFetch(`/api/leads/${leadId}/ai-history`),
        ]);
        if (!active) return;
        const [leadRes, ownerRes, emailRes, callRes, taskRes, noteRes, aiHistoryRes] = results;

        if (leadRes.status === 'fulfilled') {
          setLead(leadRes.value);
        } else if (leadRes.reason?.status === 404) {
          setLead(null);
          setError('Lead not found.');
        } else {
          setError(leadRes.reason?.message || 'Unable to load lead details.');
        }

        if (ownerRes.status === 'fulfilled') {
          setOwnerName(ownerRes.value?.name || ownerRes.value?.email || 'Unassigned');
        }
        if (emailRes.status === 'fulfilled') {
          setEmails(Array.isArray(emailRes.value) ? emailRes.value : []);
        }
        if (callRes.status === 'fulfilled') {
          setCalls(Array.isArray(callRes.value) ? callRes.value : []);
        }
        if (taskRes.status === 'fulfilled') {
          setTasks(Array.isArray(taskRes.value) ? taskRes.value.map(normalizeTask) : []);
        }
        if (noteRes.status === 'fulfilled') {
          setNotes(Array.isArray(noteRes.value) ? noteRes.value.map(normalizeNote) : []);
        }
        if (aiHistoryRes.status === 'fulfilled') {
          setAiHistory(Array.isArray(aiHistoryRes.value) ? aiHistoryRes.value : []);
        }
      } catch (err) {
        if (active) setError(err?.message || 'Unable to load lead details.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchAll();
    return () => { active = false; };
  }, [leadId, refreshTick]);

  const refreshLeadScore = async () => {
    try {
      const result = await apiFetch(`/api/leads/${leadId}/score/recalculate`, { method: 'POST' }, { cache: false });
      setLead((prev) => prev ? { ...prev, score: result.score, score_reason: result.score_reason } : prev);
      toast.success('Lead score updated.');
    } catch (err) {
      toast.error(err?.message || 'Unable to update lead score.');
    }
  };

  const handleRetryLoad = () => {
    setRefreshTick((prev) => prev + 1);
  };

  useEffect(() => {
    if (callStatus === 'active' && callModalOpen) {
      const timer = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
    setCallTimer(0);
    return undefined;
  }, [callStatus, callModalOpen]);

  useEffect(() => {
    if (remoteStream) {
      attachRemoteStream(remoteStream);
    }
  }, [remoteStream, attachRemoteStream]);

  const uploadRecordingBlob = async ({ blob, mimeType }) => {
    if (!blob || !callSession?.id) return;
    if (!blob.size) {
      throw new Error('Recording is empty. Please try recording the call again.');
    }
    const extension = mimeType.includes('ogg') ? 'ogg' : 'webm';
    const formData = new FormData();
    formData.append('file', blob, `call-${callSession.id}.${extension}`);
    const uploadResponse = await apiFetch(
      `/api/calls/${callSession.id}/recording`,
      {
        method: 'POST',
        body: formData,
      },
      { timeoutMs: 30000, cache: false }
    );
    setCalls((prev) => prev.map((call) => (
      call.id === callSession.id
        ? { ...call, recording_path: uploadResponse.recording_path }
        : call
    )));
    recordingUploadedRef.current.add(callSession.id);
    toast.success('Recording saved successfully.');
  };

  useEffect(() => {
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
      localAudioRef.current.muted = true;
      localAudioRef.current.play().catch(() => {});
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

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
      toast.success('Note added successfully.');
    } catch (err) {
      const message = err?.message || 'Unable to create note.';
      setError(message);
      toast.error(message);
    }
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    if (!isManager) return;
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
      const assigneeLabel = ownerName || 'sales rep';
      toast.success(`Task added for ${assigneeLabel}.`);
    } catch (err) {
      const message = err?.message || 'Unable to create task.';
      setError(message);
      toast.error(message);
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
      toast.success('Deal converted successfully.');
    } catch (err) {
      const message = err?.message || 'Unable to convert lead.';
      setError(message);
      toast.error(message);
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
      setNotice('Deal moved back to Qualification.');
    } catch (err) {
      setError(err?.message || 'Unable to discard deal.');
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleStartCall = async () => {
    if (!leadId) return;
    setCallWorking(true);
    setCallNotice('');
    try {
      const response = await apiFetch(
        '/api/calls/start',
        {
          method: 'POST',
          body: JSON.stringify({ lead_id: leadId, direction: 'outbound' }),
        },
        { timeoutMs: 20000, cache: false }
      );
      setCallSession(response.call);
      setCalls((prev) => [response.call, ...prev]);
      setInviteUrl(response.invite_url || '');
      if (lead?.email) {
        setCallNotice(`Invite emailed to ${lead.email}.`);
      }
      setCallModalOpen(true);
      await startCallSession({ roomId: response.call.room_id, token: response.room_token, isCaller: true });
      toast.success('Call started successfully.');
    } catch (err) {
      const message = err?.message || 'Unable to start call.';
      setError(message);
      toast.error(message);
    } finally {
      setCallWorking(false);
    }
  };

  const handleEndCall = async () => {
    if (!callSession?.id) {
      endCallSession();
      setCallModalOpen(false);
      return;
    }
    setCallWorking(true);
    try {
      // Stop and upload the recorder before tearing down the WebRTC streams.
      // If we close the call first, the mic/remote tracks are stopped and the
      // final MediaRecorder blob can become silent or unplayable in some browsers.
      if (isRecording) {
        const { blob, mimeType } = await stopRecording();
        if (!recordingUploadedRef.current.has(callSession.id)) {
          try {
            await uploadRecordingBlob({ blob, mimeType });
          } catch {
            setCallNotice('Recording upload failed. You can retry later.');
            toast.error('Recording upload failed.');
          }
        }
      }

      sendSignal({ type: 'recording', active: false });
      endCallSession();
      try {
        await apiFetch(
          `/api/calls/${callSession.id}/end`,
          { method: 'POST' },
          { timeoutMs: 20000, cache: false }
        );
      } catch {
        setCallNotice('Call ended locally. Server sync pending.');
      }

      try {
        const refreshed = await apiFetch(`/api/leads/${leadId}/calls`, {}, { cache: false });
        setCalls(Array.isArray(refreshed) ? refreshed : []);
        setCallNotice('Call ended and saved.');
        toast.success('Call ended and saved.');
      } catch {
        setCallNotice('Call ended. Sync will update later.');
      }
    } catch (err) {
      const message = err?.message || 'Unable to end call.';
      setError(message);
      toast.error(message);
    } finally {
      sendSignal({ type: 'recording', active: false });
      setCallWorking(false);
      setCallModalOpen(false);
    }
  };

  const handleToggleRecording = async () => {
    if (!localStream) {
      setCallNotice('Microphone not ready. Please start the call first.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setCallNotice('Recording is not supported in this browser.');
      return;
    }
    if (!isRecording) {
      try {
        await startRecording(localStream);
        if (remoteStream) {
          attachRemoteStream(remoteStream);
        }
        sendSignal({ type: 'recording', active: true });
        setCallNotice('Recording started.');
        toast.success('Recording started.');
      } catch (err) {
        const message = err?.message || 'Unable to start recording.';
        setCallNotice(message);
        toast.error(message);
      }
      return;
    }

    if (isPaused) {
      resumeRecording();
      sendSignal({ type: 'recording', active: true });
      setCallNotice('Recording resumed.');
      return;
    }

    pauseRecording();
    sendSignal({ type: 'recording', active: false });
    setCallNotice('Recording paused.');
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCallNotice('Invite link copied.');
    } catch {
      setCallNotice('Unable to copy invite link.');
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <SkeletonLeadDetail />
      </PageTransition>
    );
  }

  if (!lead && !loading) {
    return (
      <PageTransition>
        <EmptyState
          type="leads"
          title={error || 'Lead not found'}
          desc="Try refreshing the page or retry the request."
          actionLabel="Retry"
          onAction={handleRetryLoad}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div className="reveal-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              <button className="btn btn-secondary btn-sm" onClick={handleStartCall} disabled={callWorking}>
                <Phone size={14} /> {callWorking ? 'Starting...' : 'Call'}
              </button>
              {isManager && activeTab === 'tasks' && (
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

          {error && (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-danger-subtle)', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
              {error}
            </div>
          )}
          {notice && (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-success-subtle)', color: 'var(--color-success)', fontSize: 'var(--text-sm)' }}>
              {notice}
            </div>
          )}

          {lead && (
            <div className="card card-padding" style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-text-tertiary)' }}>AI Lead Score</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <strong style={{ fontSize: 'var(--text-xl)' }}>{lead.score ?? 'Not scored'}</strong>
                  {lead.score !== null && lead.score !== undefined && <span className={`badge ${Number(lead.score) >= 75 ? 'badge-success' : Number(lead.score) >= 45 ? 'badge-warning' : 'badge-danger'}`}>{Number(lead.score) >= 75 ? 'High' : Number(lead.score) >= 45 ? 'Medium' : 'Low'} Priority</span>}
                </div>
                <div style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>{lead.score_reason || 'Run scoring to generate an AI priority explanation.'}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={refreshLeadScore}>Refresh AI Score</button>
            </div>
          )}

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

          {activeTab === 'activity' && aiHistory.length > 0 && (
            <div className="card card-padding" style={{ display: 'grid', gap: 12 }}>
              <h2 className="section-title">AI History</h2>
              {aiHistory.map((item) => (
                <div key={item.id} style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong>{item.trigger_type || item.action_type}</strong>
                    <span className="badge badge-purple">AI</span>
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>{item.reason || 'AI action recorded.'}</div>
                  <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>{formatDateTime(item.created_at)} � {item.approval_status || item.dispatch_status}</div>
                </div>
              ))}
            </div>
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
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                      {(call.outcome || 'Call')} · {Math.round((call.duration_seconds || 0) / 60)} min
                    </div>
                    {call.recording_path && (
                      <audio
                        controls
                        style={{ marginTop: 10, width: '100%' }}
                        src={buildRecordingUrl(call.recording_path)}
                      />
                    )}
                    <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                      Transcript: {call.transcript ? 'Available' : (call.processing_status === 'failed' ? 'Failed' : 'Processing')}
                    </div>
                    {call.meeting_summary && (
                      <div style={{ marginTop: 8, padding: 10, borderRadius: 'var(--radius)', background: 'var(--color-accent-subtle)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', whiteSpace: 'pre-wrap' }}>
                        <strong>Meeting Summary:</strong> {call.meeting_summary}
                      </div>
                    )}
                    {call.transcript && (
                      <div style={{
                        marginTop: 8,
                        padding: 10,
                        borderRadius: 'var(--radius)',
                        background: 'var(--color-bg-elevated)',
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--text-sm)',
                        whiteSpace: 'pre-wrap',
                        maxHeight: 180,
                        overflowY: 'auto',
                      }}>
                        {call.transcript}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState type="calls" title="No calls" desc="No call logs for this lead." />
            )
          )}

          {activeTab === 'tasks' && (
            tasks.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {tasks.map((task) => (
                  <EntityCard
                    key={task.id}
                    title={task.title}
                    description={task.source === 'ai' && task.aiReason ? `${task.description || ''}${task.description ? '\n\n' : ''}AI reason: ${task.aiReason}` : task.description}
                    descriptionFallback="No description."
                    accentClass={TASK_STATUS_ACCENT[normalizeStatus(task.status) === 'open' ? 'todo' : normalizeStatus(task.status)] || 'note-border-muted'}
                    statusSlot={<div className={`badge ${TASK_STATUS_BADGE[normalizeStatus(task.status) === 'open' ? 'todo' : normalizeStatus(task.status)] || 'badge-muted'}`}>{formatTaskStatus(task.status)}</div>}
                    badges={[
                      { label: task.dueDateLabel },
                      { label: `Priority: ${task.priority}` },
                      { label: task.updatedLabel },
                      task.source === 'ai' ? { label: 'AI Generated', className: 'badge-purple' } : null,
                    ]}
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="tasks" title="No tasks" desc="No tasks linked to this lead." />
            )
          )}

          {activeTab === 'notes' && (
            notes.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {notes.map((note, idx) => (
                  <EntityCard
                    key={note.id}
                    title="Note"
                    description={note.source === 'ai' && note.aiReason ? `${note.content || ''}${note.content ? '\n\n' : ''}AI reason: ${note.aiReason}` : note.content}
                    descriptionFallback="No note content added."
                    accentClass={CARD_ACCENTS[idx % CARD_ACCENTS.length]}
                    iconSlot={<StickyNote size={14} style={{ color: 'var(--color-text-tertiary)' }} />}
                    badges={[{ label: note.updatedLabel }, note.source === 'ai' ? { label: 'AI Generated', className: 'badge-purple' } : null]}
                    clampDescription
                  />
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

        <div className="reveal-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Lead</div>
            <div style={{ fontWeight: 'var(--weight-medium)', marginBottom: 12 }}>{lead.name || 'Lead'}</div>
            <div style={{ display: 'grid', gap: 8, fontSize: 'var(--text-sm)' }}>
              <div><strong>Status:</strong> {formatLeadStatus(lead.status)}</div>
              <div><strong>Source:</strong> {formatLeadSource(lead.source)}</div>
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

      {isManager && taskModalOpen && (
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

      {callModalOpen && (
        <div className="modal-overlay no-blur">
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h3 className="section-title">Live Call</h3>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{callStatus === 'active' ? 'Connected' : 'Connecting...'}</div>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{formatTimer(callTimer)}</div>
            </div>
            <div style={{ padding: 20, display: 'grid', gap: 12 }}>
              {callError && (
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-danger-subtle)', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
                  {callError}
                </div>
              )}
              <div style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                <div>Recording: {isRecording ? (isPaused ? 'Paused' : 'On') : recordingActive ? 'Started by other participant' : 'Off'}</div>
                <div>Invite link: {inviteUrl ? 'Ready' : 'Generating...'}</div>
                <div>Lead email: {lead?.email || 'Missing'}</div>
              </div>
              {callNotice && (
                <div style={{ padding: 10, borderRadius: 8, background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                  {callNotice}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={toggleMute} disabled={callWorking}>
                  {muted ? 'Unmute' : 'Mute'}
                </button>
                <button className="btn btn-secondary" onClick={handleToggleRecording} disabled={!localStream}>
                  {!isRecording ? 'Start recording' : isPaused ? 'Resume recording' : 'Pause recording'}
                </button>
                <button className="btn btn-secondary" onClick={handleCopyInvite} disabled={!inviteUrl}>
                  Copy invite link
                </button>
                <button className="btn btn-danger" onClick={handleEndCall} disabled={callWorking}>
                  <PhoneOff size={14} /> End call
                </button>
              </div>
            </div>
            <audio ref={localAudioRef} autoPlay playsInline style={{ display: 'none' }} />
            <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
          </div>
        </div>
      )}
    </PageTransition>
  );
};

export default LeadDetail;
