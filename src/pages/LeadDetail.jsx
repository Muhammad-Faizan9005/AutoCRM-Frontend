import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CheckSquare, ChevronDown, ChevronRight, Mail, Phone, PhoneOff, Plus, RotateCcw, StickyNote } from 'lucide-react';
import { API_BASE, apiFetch } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { EntityCard } from '../components/EntityCard';
import AIInsights from '../components/AIInsights';
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
const LEAD_STATUS_OPTIONS = ['new', 'contacted', 'nurture', 'qualified', 'unqualified', 'junk'];
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

const buildRecordingUrl = (callId) => `${API_BASE}/api/calls/${encodeURIComponent(callId)}/recording/file`;

const RecordingAudio = ({ call }) => {
  const [sourceUrl, setSourceUrl] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!call?.id || !call?.recording_path) {
      setSourceUrl('');
      setLoadError('');
      return undefined;
    }

    const controller = new AbortController();
    let objectUrl = '';

    const loadRecording = async () => {
      setLoadError('');

      try {
        const response = await fetch(buildRecordingUrl(call.id), {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Recording unavailable');
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setSourceUrl(objectUrl);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setLoadError('Recording unavailable.');
        }
      }
    };

    loadRecording();

    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [call?.id, call?.recording_path]);

  if (loadError) {
    return <div style={{ marginTop: 10, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{loadError}</div>;
  }

  if (!sourceUrl) {
    return <div style={{ marginTop: 10, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Loading recording...</div>;
  }

  return <audio controls style={{ marginTop: 10, width: '100%' }} src={sourceUrl} />;
};

const recordingExtensionForMime = (mimeType = '') => (mimeType.includes('ogg') ? 'ogg' : 'webm');

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
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callSession, setCallSession] = useState(null);
  const [inviteUrl, setInviteUrl] = useState('');
  const [callTimer, setCallTimer] = useState(0);
  const [callWorking, setCallWorking] = useState(false);
  const [callNotice, setCallNotice] = useState('');
  const [expandedCallSections, setExpandedCallSections] = useState({});
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [teamReps, setTeamReps] = useState([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('new');
  const [quickActionSaving, setQuickActionSaving] = useState(false);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const recordingUploadedRef = useRef(new Set());
  const recordingMimeTypeRef = useRef('audio/webm');
  const recordingExtensionRef = useRef('webm');
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
  const canUnassignLead = String(user?.role || '').toLowerCase() === 'admin';

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
        const workspace = await apiFetch(
          `/api/leads/${leadId}/workspace`,
          {},
          { forceRefresh: refreshTick > 0 }
        );
        if (!active) return;
        setLead(workspace.lead || null);
        setOwnerName(workspace.owner?.name || workspace.owner?.email || 'Unassigned');
        setSelectedOwnerId(workspace.lead?.owner_id || '');
        setSelectedStatus(workspace.lead?.status || 'new');
        setEmails(Array.isArray(workspace.emails) ? workspace.emails : []);
        setCalls(Array.isArray(workspace.calls) ? workspace.calls : []);
        setTasks(Array.isArray(workspace.tasks) ? workspace.tasks.map(normalizeTask) : []);
        setNotes(Array.isArray(workspace.notes) ? workspace.notes.map(normalizeNote) : []);
        setAiHistory(Array.isArray(workspace.ai_history) ? workspace.ai_history : []);
      } catch (err) {
        if (!active) return;
        if (err?.status === 404) {
          setLead(null);
          setError('Lead not found.');
        } else {
          setError(err?.message || 'Unable to load lead details.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchAll();
    return () => { active = false; };
  }, [leadId, refreshTick]);

  useEffect(() => {
    let active = true;
    const fetchReps = async () => {
      if (!isManager) return;
      try {
        const data = await apiFetch('/api/leads/assignment-reps');
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        const role = String(user?.role || '').toLowerCase();
        const assignableRoles = role === 'admin' ? ['manager', 'sales_manager'] : ['agent', 'sales_rep'];
        const reps = items.filter((rep) => assignableRoles.includes(String(rep.role || '').toLowerCase()));
        if (active) setTeamReps(reps);
      } catch {
        if (active) setTeamReps([]);
      }
    };
    fetchReps();
    return () => { active = false; };
  }, [isManager]);

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

  const isCallSectionExpanded = (callId, section) => (
    expandedCallSections[`${callId}-${section}`] === true
  );

  const toggleCallSection = (callId, section) => {
    const key = `${callId}-${section}`;
    setExpandedCallSections((current) => ({
      ...current,
      [key]: current[key] === false,
    }));
  };

  const getRepLabel = (ownerId) => {
    if (!ownerId) return 'Unassigned';
    const rep = teamReps.find((item) => String(item.id) === String(ownerId));
    if (rep) return rep.full_name || rep.email || 'Assigned';
    if (String(user?.id || '') === String(ownerId)) {
      return user?.full_name || user?.email || 'Assigned';
    }
    return ownerName || 'Assigned';
  };

  const getAssignableLeadOwnerId = (ownerId) => (
    teamReps.some((rep) => String(rep.id) === String(ownerId || '')) ? ownerId : ''
  );

  const handleOpenAssignModal = () => {
    setSelectedOwnerId(getAssignableLeadOwnerId(lead?.owner_id) || '');
    setAssignModalOpen(true);
  };

  const handleOpenStatusModal = () => {
    setSelectedStatus(lead?.status || 'new');
    setStatusModalOpen(true);
  };

  const handleAssignLead = async (event) => {
    event.preventDefault();
    if (!leadId) return;
    setQuickActionSaving(true);
    try {
      const updated = await apiFetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ owner_id: selectedOwnerId || null }),
      });
      setLead((prev) => (prev ? { ...prev, ...updated } : updated));
      setOwnerName(getRepLabel(selectedOwnerId));
      setAssignModalOpen(false);
      toast.success('Lead assignment updated.');
    } catch (err) {
      const message = err?.message || 'Unable to assign lead.';
      toast.error(message);
    } finally {
      setQuickActionSaving(false);
    }
  };

  const handleUpdateLeadStatus = async (event) => {
    event.preventDefault();
    if (!leadId) return;
    const nextStatus = normalizeStatus(selectedStatus) || 'new';
    setQuickActionSaving(true);
    try {
      const updated = await apiFetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setLead((prev) => (prev ? { ...prev, ...updated } : updated));
      setSelectedStatus(updated?.status || nextStatus);
      setStatusModalOpen(false);
      toast.success('Lead status updated.');
    } catch (err) {
      const message = err?.message || 'Unable to update lead status.';
      toast.error(message);
    } finally {
      setQuickActionSaving(false);
    }
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

  const startRecordingUpload = async (mimeType) => {
    if (!callSession?.id) return;
    const extension = recordingExtensionForMime(mimeType);
    recordingMimeTypeRef.current = mimeType || 'audio/webm';
    recordingExtensionRef.current = extension;
    await apiFetch(
      `/api/calls/${callSession.id}/recording/start?extension=${encodeURIComponent(extension)}`,
      { method: 'POST' },
      { timeoutMs: 10000, cache: false }
    );
  };

  const uploadRecordingChunk = async ({ blob, chunkIndex, mimeType }) => {
    if (!blob || !blob.size || !callSession?.id) return;
    recordingMimeTypeRef.current = mimeType || recordingMimeTypeRef.current;
    recordingExtensionRef.current = recordingExtensionForMime(recordingMimeTypeRef.current);
    const formData = new FormData();
    formData.append('chunk_index', String(chunkIndex));
    formData.append('file', blob, `chunk-${chunkIndex}.${recordingExtensionRef.current}`);
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await apiFetch(
          `/api/calls/${callSession.id}/recording/chunks`,
          {
            method: 'POST',
            body: formData,
          },
          { timeoutMs: 20000, cache: false }
        );
        return;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
    throw lastError || new Error('Recording chunk upload failed.');
  };

  const completeRecordingUpload = async () => {
    if (!callSession?.id || recordingUploadedRef.current.has(callSession.id)) return null;
    const search = new URLSearchParams({
      extension: recordingExtensionRef.current,
      mime_type: recordingMimeTypeRef.current,
    });
    const uploadResponse = await apiFetch(
      `/api/calls/${callSession.id}/recording/complete?${search.toString()}`,
      { method: 'POST' },
      { timeoutMs: 10000, cache: false }
    );
    setCalls((prev) => prev.map((call) => (
      call.id === callSession.id
        ? { ...call, recording_path: uploadResponse.recording_path, processing_status: 'processing' }
        : call
    )));
    recordingUploadedRef.current.add(callSession.id);
    return uploadResponse;
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
      toast.error(message);
    }
  };

  const handleConvertToDeal = async () => {
    if (!leadId) return;
    setIsConverting(true);
    try {
      await apiFetch(`/api/leads/${leadId}/convert-to-deal`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setLead((prev) => (prev ? { ...prev, converted: true, status: 'qualified' } : prev));
      setDealDiscarded(false);
      toast.success(lead?.converted ? 'New deal created.' : 'Deal converted successfully.');
    } catch (err) {
      const message = err?.message || 'Unable to convert lead.';
      toast.error(message);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDiscardDeal = async () => {
    if (!leadId) return;
    setIsDiscarding(true);
    try {
      await apiFetch(`/api/leads/${leadId}/discard-deal`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setLead((prev) => (prev ? { ...prev, converted: false, status: 'qualified' } : prev));
      setSelectedStatus('qualified');
      setDealDiscarded(true);
      setDiscardConfirmOpen(false);
      toast.success('Deal discarded.');
    } catch (err) {
      const message = err?.message || 'Unable to discard deal.';
      toast.error(message);
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
      const recordingStop = isRecording ? stopRecording() : Promise.resolve({ failedUploads: [] });

      sendSignal({ type: 'recording', active: false });
      endCallSession();
      setCallModalOpen(false);
      setCallWorking(false);
      setCallNotice('Call ended. Recording and transcription will continue in the background.');
      toast.success('Call ended. Recording is processing in the background.');

      (async () => {
        let failedUploads = [];
        try {
          ({ failedUploads = [] } = await recordingStop);
        } catch {
          toast.error('Recording could not finish flushing.');
        }
        if (failedUploads?.length) {
          toast.error('Some recording chunks failed to upload.');
        } else if (isRecording && !recordingUploadedRef.current.has(callSession.id)) {
          try {
            await completeRecordingUpload();
            toast.success('Recording is being finalized in the background.');
          } catch {
            toast.error('Recording finalization failed to queue.');
          }
        }

        try {
          await apiFetch(
            `/api/calls/${callSession.id}/end`,
            { method: 'POST' },
            { timeoutMs: 20000, cache: false }
          );
        } catch {
          toast.error('Call ended locally. Server sync is pending.');
        }

        try {
          const refreshed = await apiFetch(`/api/leads/${leadId}/calls`, {}, { cache: false });
          setCalls(Array.isArray(refreshed) ? refreshed : []);
        } catch {
          // The next page refresh will pick up server-side call state.
        }
      })().catch(() => {
        toast.error('Background call cleanup failed.');
      });
    } catch (err) {
      const message = err?.message || 'Unable to end call.';
      toast.error(message);
    } finally {
      sendSignal({ type: 'recording', active: false });
      setCallWorking(false);
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
        const mimeType = await startRecording(localStream, {
          onChunk: uploadRecordingChunk,
          timesliceMs: 8000,
        });
        await startRecordingUpload(mimeType || 'audio/webm');
        if (remoteStream) {
          attachRemoteStream(remoteStream);
        }
        sendSignal({ type: 'recording', active: true });
        setCallNotice('Recording started.');
        toast.success('Recording started.');
      } catch (err) {
        try {
          await stopRecording();
        } catch {
          // Recorder may not have started yet.
        }
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
      <div className="crm-page deal-detail-page">
        <div className="deal-detail-hero">
          <div>
            <Link to="/leads" className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }}>
              <ArrowLeft size={14} /> Leads
            </Link>
            <div className="page-kicker">Lead Workspace</div>
            <h1 className="page-title">{lead.name || 'Lead'}</h1>
            <div className="deal-detail-subtitle">
              <span><Mail size={14} /> {lead.email || 'No email'}</span>
              <span><Phone size={14} /> {lead.phone || 'No phone'}</span>
              {lead.company && <span><Building2 size={14} /> {lead.company}</span>}
            </div>
          </div>
          <div className="deal-detail-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleStartCall} disabled={callWorking}>
              <Phone size={14} /> {callWorking ? 'Starting...' : 'Call'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setNoteModalOpen(true)}>
              <StickyNote size={14} /> Add Note
            </button>
            {isManager && (
              <button className="btn btn-primary btn-sm" onClick={() => setTaskModalOpen(true)}>
                <Plus size={14} /> Add Task
              </button>
            )}
          </div>
        </div>

        <div className="deal-detail-grid">
          <div className="deal-detail-main">
          <section className="deal-detail-metrics">
            <div className="deal-detail-metric lead-score-metric">
              <div className="lead-score-metric-head">
                <span>AI score</span>
                <button className="btn btn-ghost btn-icon" type="button" onClick={refreshLeadScore} aria-label="Refresh AI score" title="Refresh AI score">
                  <RotateCcw size={14} />
                </button>
              </div>
              <strong>
                {lead.score ?? 'Not scored'}
                {lead.score !== null && lead.score !== undefined && (
                  <span className={`badge ${Number(lead.score) >= 75 ? 'badge-success' : Number(lead.score) >= 45 ? 'badge-warning' : 'badge-danger'}`} style={{ marginLeft: 8 }}>
                    {Number(lead.score) >= 75 ? 'High' : Number(lead.score) >= 45 ? 'Medium' : 'Low'}
                  </span>
                )}
              </strong>
              <p>{lead.score_reason || 'Run scoring to generate an AI priority explanation.'}</p>
            </div>
            <div className="deal-detail-metric">
              <span>Status</span>
              <strong><span className="badge badge-accent">{formatLeadStatus(lead.status)}</span></strong>
            </div>
            <div className="deal-detail-metric">
              <span>Open tasks</span>
              <strong>{tasks.filter((task) => !['done', 'canceled'].includes(normalizeStatus(task.status))).length}</strong>
            </div>
            <div className="deal-detail-metric">
              <span>Owner</span>
              <strong>{ownerName || 'Unassigned'}</strong>
            </div>
          </section>

          <AIInsights
            items={aiHistory}
            title="AI Follow-up Intelligence"
            eyebrow="Lead Assistant"
            emptyTitle="No AI follow-up suggestions yet"
            emptyDescription="Trigger a stale lead or follow-up agent run to see the recommended next step here."
            collapsible
          />

          <div className="tab-row">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>


          {activeTab === 'activity' && (
            activityItems.length ? (
              <div className="card" style={{ padding: 16 }}>
                <div className="activity-list">
                {activityItems.map((item) => (
                  <div key={item.id} className="activity-item">
                    <div className="activity-icon">
                      {item.type === 'email' ? <Mail size={14} /> : item.type === 'call' ? <Phone size={14} /> : item.type === 'task' ? <CheckSquare size={14} /> : <StickyNote size={14} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'var(--weight-medium)' }}>{item.title}</div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>{item.subtitle}</div>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{formatDateTime(item.timestamp)}</div>
                  </div>
                ))}
                </div>
              </div>
            ) : (
              <EmptyState type="activity" title="No activity" desc="No recent activity for this lead." />
            )
          )}

          {false && activeTab === 'activity' && aiHistory.length > 0 && (
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
              <div className="card" style={{ padding: 16 }}>
                <div className="activity-list">
                {emails.map((email) => (
                  <div key={email.id} className="activity-item">
                    <div className="activity-icon"><Mail size={14} /></div>
                    <div>
                      <div style={{ fontWeight: 'var(--weight-medium)' }}>{email.subject || 'Email'}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{email.direction === 'sent' ? `To: ${email.to}` : `From: ${email.from}`}</div>
                      <div style={{ color: 'var(--color-text-secondary)' }}>{email.snippet}</div>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{formatDateTime(email.sent_at)}</div>
                  </div>
                ))}
                </div>
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
                      <RecordingAudio call={call} />
                    )}
                    <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                      Transcript: {call.transcript ? 'Available' : (call.processing_status === 'failed' ? 'Failed' : 'Processing')}
                    </div>
                    {call.meeting_summary && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => toggleCallSection(call.id, 'summary')}
                          aria-expanded={isCallSectionExpanded(call.id, 'summary')}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '8px 10px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius)',
                            background: 'var(--color-accent-subtle)',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 'var(--weight-semibold)',
                          }}
                        >
                          <span>Meeting Summary</span>
                          {isCallSectionExpanded(call.id, 'summary') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {isCallSectionExpanded(call.id, 'summary') && (
                          <div style={{ marginTop: 6, padding: 10, borderRadius: 'var(--radius)', background: 'var(--color-accent-subtle)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', whiteSpace: 'pre-wrap' }}>
                            {call.meeting_summary}
                          </div>
                        )}
                      </div>
                    )}
                    {call.transcript && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => toggleCallSection(call.id, 'transcript')}
                          aria-expanded={isCallSectionExpanded(call.id, 'transcript')}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '8px 10px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius)',
                            background: 'var(--color-bg-elevated)',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 'var(--weight-semibold)',
                          }}
                        >
                          <span>Transcript</span>
                          {isCallSectionExpanded(call.id, 'transcript') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {isCallSectionExpanded(call.id, 'transcript') && (
                          <div style={{
                            marginTop: 6,
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
              <div className="entity-grid">
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
              <div className="entity-grid">
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

          <aside className="deal-detail-sidebar">
            <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div className="section-title">Lead Details</div>
              <div className="detail-list">
                <div><strong>Status:</strong> {formatLeadStatus(lead.status)}</div>
                <div><strong>Source:</strong> {formatLeadSource(lead.source)}</div>
                <div><strong>Created:</strong> {formatDate(lead.created_at)}</div>
                <div><strong>Updated:</strong> {formatDate(lead.updated_at)}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div className="section-title">Contact</div>
              <div className="detail-list">
                <div><strong>Name:</strong> {lead.name || '-'}</div>
                <div><strong>Email:</strong> {lead.email || '-'}</div>
                <div><strong>Phone:</strong> {lead.phone || '-'}</div>
                <div><strong>Organization:</strong> {lead.company || '-'}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div className="section-title">Quick Actions</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {isManager && (
                  <button className="btn btn-secondary btn-sm" type="button" onClick={handleOpenAssignModal}>
                    Assign Lead
                  </button>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  onClick={handleConvertToDeal}
                  disabled={isConverting}
                >
                  {isConverting ? 'Creating...' : lead?.converted ? 'Create Another Deal' : 'Convert to Deal'}
                </button>
                {isManager && lead?.converted && (
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => setDiscardConfirmOpen(true)}
                    disabled={isDiscarding || dealDiscarded}
                  >
                    {dealDiscarded ? 'Deal Discarded' : isDiscarding ? 'Discarding...' : 'Discard Deal'}
                  </button>
                )}
                {isManager && (
                  <button className="btn btn-secondary btn-sm" type="button" onClick={handleOpenStatusModal}>
                    Update Status
                  </button>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div className="section-title">Workspace Signals</div>
              <div className="deal-signal-grid">
                <span><Phone size={14} /> {calls.length} calls</span>
                <span><Mail size={14} /> {emails.length} emails</span>
                <span><CheckSquare size={14} /> {tasks.length} tasks</span>
                <span><StickyNote size={14} /> {notes.length} notes</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {isManager && assignModalOpen && (
        <div className="modal-overlay" onClick={() => setAssignModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="section-title">Assign Lead</h3>
              <button onClick={() => setAssignModalOpen(false)} className="btn btn-ghost btn-icon" aria-label="Close">X</button>
            </div>
            <form onSubmit={handleAssignLead} style={{ padding: 20, display: 'grid', gap: 12 }}>
              <div>
                <label className="label">Owner</label>
                <select
                  className="input"
                  value={getAssignableLeadOwnerId(selectedOwnerId)}
                  onChange={(event) => setSelectedOwnerId(event.target.value)}
                >
                  <option value="" disabled={!canUnassignLead}>Unassigned to team</option>
                  {teamReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.full_name || rep.email || 'Assignable user'}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setAssignModalOpen(false)} disabled={quickActionSaving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={quickActionSaving || (!canUnassignLead && !selectedOwnerId)}>
                  {quickActionSaving ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isManager && statusModalOpen && (
        <div className="modal-overlay" onClick={() => setStatusModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="section-title">Update Status</h3>
              <button onClick={() => setStatusModalOpen(false)} className="btn btn-ghost btn-icon" aria-label="Close">X</button>
            </div>
            <form onSubmit={handleUpdateLeadStatus} style={{ padding: 20, display: 'grid', gap: 12 }}>
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                >
                  {LEAD_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{LEAD_STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setStatusModalOpen(false)} disabled={quickActionSaving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={quickActionSaving}>
                  {quickActionSaving ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isManager && discardConfirmOpen && (
        <div className="modal-overlay" onClick={() => !isDiscarding && setDiscardConfirmOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="section-title">Discard Deal</h3>
              <button
                onClick={() => setDiscardConfirmOpen(false)}
                className="btn btn-ghost btn-icon"
                aria-label="Close"
                disabled={isDiscarding}
              >
                X
              </button>
            </div>
            <div style={{ padding: 20, display: 'grid', gap: 14 }}>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                This will move the deal back to Qualification for this lead.
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setDiscardConfirmOpen(false)}
                  disabled={isDiscarding}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDiscardDeal}
                  disabled={isDiscarding}
                >
                  {isDiscarding ? 'Discarding...' : 'Discard Deal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        <div className="modal-overlay no-blur" onClick={() => !callWorking && setCallModalOpen(false)}>
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
