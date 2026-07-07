import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, RotateCcw, Trash2, X, Download, SquarePen, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import * as XLSX from 'xlsx';
import { apiFetch, peekCache } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';
import { EntityCard } from '../components/EntityCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toast } from '../utils/toast';
import { useCloseFilterMenusOnOutside } from '../hooks/useOutsideDismiss';

const CARD_GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20, alignItems: 'stretch' };

const LEAD_ENTITY_TYPE = 'lead';
const STATUS_ORDER = ['backlog', 'todo', 'in_progress', 'done', 'canceled'];
const REP_STATUS_OPTIONS = ['in_progress', 'done'];
const STATUS_BADGE = { backlog: 'badge-muted', todo: 'badge-accent', in_progress: 'badge-warning', done: 'badge-success', canceled: 'badge-danger' };
const STATUS_LABEL = { backlog: 'Backlog', todo: 'Todo', in_progress: 'In Progress', done: 'Done', canceled: 'Canceled' };
const STATUS_ACCENT = { backlog: 'note-border-muted', todo: 'note-border-accent', in_progress: 'note-border-warning', done: 'note-border-success', canceled: 'note-border-danger' };
const STATUS_FILTERS = [{ id: 'all', label: 'All' }, ...STATUS_ORDER.map((status) => ({ id: status, label: STATUS_LABEL[status] }))];
const PRIORITY_FILTERS = [
  { id: 'all', label: 'All priorities' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];
const DUE_FILTERS = [
  { id: 'all', label: 'All due dates' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Due today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'none', label: 'No due date' },
];

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const now = new Date();
  const diffMin = Math.floor((now - date) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getAssigneeLabel = (assignedTo, currentUser, directory) => {
  if (!assignedTo) return 'Unassigned';
  if (currentUser?.id && String(assignedTo) === String(currentUser.id)) return 'You';
  const rep = directory[String(assignedTo)];
  if (rep) return rep;
  return 'Assigned rep';
};

const normalizeTask = (task, currentUser, directory, leadDirectory) => {
  const rawStatus = String(task.status || 'backlog').toLowerCase();
  return {
  id: task.id,
  title: task.title || 'Untitled task',
  description: task.description || '',
  status: rawStatus === 'open' ? 'todo' : rawStatus,
  priority: String(task.priority || 'medium').toLowerCase(),
  dueAt: task.due_at || '',
  dueDateLabel: formatDate(task.due_at),
  assignedTo: task.assigned_to || null,
  assigneeLabel: task.assignee_name || getAssigneeLabel(task.assigned_to, currentUser, directory),
  modifiedLabel: formatDateTime(task.updated_at || task.created_at),
  leadId: String(task.entity_id || ''),
  leadName: task.lead_name || leadDirectory[String(task.entity_id)] || 'Loading lead...',
  source: String(task.source || 'manual').toLowerCase(),
  aiReason: task.ai_reason || '',
  };
};

const TASKS_INITIAL_PATH = `/api/tasks/?entity_type=${LEAD_ENTITY_TYPE}&skip=0&limit=20`;
const TASKS_LEADS_PATH = '/api/leads/?skip=0&limit=500';
const TASKS_ASSIGNEES_PATH = '/api/admin/users/?page=1&page_size=200';

const buildLeadDir = (leads) => {
  const list = Array.isArray(leads) ? leads : [];
  const directory = {};
  list.forEach((lead) => { directory[String(lead.id)] = lead.name || 'Unnamed lead'; });
  return { list, directory };
};

const Tasks = ({ user }) => {
  const canManageTasks = ['admin', 'sales_manager', 'manager'].includes(String(user?.role || '').toLowerCase());

  const cachedLeads = peekCache(TASKS_LEADS_PATH);
  const initialLeadDir = cachedLeads.hit ? buildLeadDir(cachedLeads.value) : { list: [], directory: {} };
  const cachedAssignees = peekCache(TASKS_ASSIGNEES_PATH);
  const initialReps = cachedAssignees.hit && Array.isArray(cachedAssignees.value?.items)
    ? cachedAssignees.value.items.filter((u) => ['agent', 'sales_rep'].includes(String(u?.role || '').toLowerCase()))
    : [];
  const initialAssigneeDir = {};
  initialReps.forEach((rep) => { initialAssigneeDir[String(rep.id)] = rep.full_name || rep.email || 'Assigned rep'; });
  const cachedTasks = peekCache(TASKS_INITIAL_PATH);
  const initialTasks = cachedTasks.hit
    ? cachedTasks.value.map((task) => normalizeTask(task, user, initialAssigneeDir, initialLeadDir.directory))
    : [];

  const [tasks, setTasks] = useState(initialTasks);
  const [loading, setLoading] = useState(!cachedTasks.hit);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [leadFilter, setLeadFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalType, setModalType] = useState(null); // create | edit | null
  const [selectedTask, setSelectedTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'backlog',
    priority: 'medium',
    dueDate: '',
    assignedTo: '',
    leadId: '',
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState(initialReps);
  const [assigneeDirectory, setAssigneeDirectory] = useState(initialAssigneeDir);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [leadOptions, setLeadOptions] = useState(initialLeadDir.list);
  const [leadDirectory, setLeadDirectory] = useState(initialLeadDir.directory);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const leadDirectoryRef = useRef(initialLeadDir.directory);
  const hasDataRef = useRef(cachedTasks.hit);

  const latestReq = useRef(0);
  const [gridRef] = useAutoAnimate();
  useCloseFilterMenusOnOutside();

  const loadAssignees = useCallback(async () => {
    if (!canManageTasks) return;
    setLoadingAssignees(true);
      try {
        const data = await apiFetch(TASKS_ASSIGNEES_PATH);
        const items = Array.isArray(data?.items) ? data.items : [];
        const reps = items.filter((u) => ['agent', 'sales_rep'].includes(String(u?.role || '').toLowerCase()));
        const directory = {};
        reps.forEach((rep) => {
          directory[String(rep.id)] = rep.full_name || rep.email || 'Assigned rep';
        });
        setAssigneeDirectory(directory);
        setAssigneeOptions(reps);
        setFormData((prev) => ({ ...prev, assignedTo: prev.assignedTo || String(reps[0]?.id || '') }));
        setTasks((prev) => prev.map((task) => ({ ...task, assigneeLabel: getAssigneeLabel(task.assignedTo, user, directory) })));
      } catch {
        setAssigneeOptions([]);
      } finally {
      setLoadingAssignees(false);
    }
  }, [canManageTasks, user]);

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const data = await apiFetch(TASKS_LEADS_PATH);
      const { list: leads, directory } = buildLeadDir(data);
      setLeadOptions(leads);
      setLeadDirectory(directory);
      leadDirectoryRef.current = directory;
      setFormData((prev) => ({ ...prev, leadId: prev.leadId || String(leads[0]?.id || '') }));
      setTasks((prev) => prev.map((task) => ({ ...task, leadName: directory[String(task.leadId)] || task.leadName || 'Loading lead...' })));
    } catch {
      setLeadOptions([]);
      setLeadDirectory({});
      leadDirectoryRef.current = {};
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  useEffect(() => {
    if (!canManageTasks) return;
    loadAssignees();
  }, [canManageTasks, loadAssignees]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const fetchTasks = useCallback(async (skip = 0, append = false) => {
    const rid = ++latestReq.current;
    if (append) setIsLoadingMore(true);
    else if (!hasDataRef.current) setLoading(true);
    setError('');
    try {
      const limit = append ? 10 : 20;
      const data = await apiFetch(`/api/tasks/?entity_type=${LEAD_ENTITY_TYPE}&skip=${skip}&limit=${limit}`);
      if (rid !== latestReq.current) return;
      const directory = { ...leadDirectoryRef.current };

      const mapped = data.map((task) => normalizeTask(task, user, assigneeDirectory, directory));
      if (append) setTasks((prev) => [...prev, ...mapped]);
      else { setTasks(mapped); hasDataRef.current = true; }
      setTotalLoaded((prev) => prev + mapped.length);
      setHasMore(mapped.length === limit);
    } catch (err) {
      if (rid === latestReq.current) setError(err?.message || 'Unable to load tasks.');
    } finally {
      if (rid === latestReq.current) {
        if (!append) setLoading(false);
        else setIsLoadingMore(false);
      }
    }
  }, [assigneeDirectory, user]);

  useEffect(() => {
    fetchTasks(0, false);
  }, [fetchTasks]);

  const taskAssigneeOptions = useMemo(() => {
    const seen = new Map();
    tasks.forEach((task) => {
      const key = task.assignedTo ? String(task.assignedTo) : '__unassigned__';
      if (!seen.has(key)) seen.set(key, task.assigneeLabel || 'Unassigned');
    });
    return Array.from(seen, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [tasks]);

  const taskLeadOptions = useMemo(() => {
    const seen = new Map();
    tasks.forEach((task) => {
      const key = task.leadId || '__none__';
      if (!seen.has(key)) seen.set(key, task.leadName || 'No linked lead');
    });
    return Array.from(seen, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [tasks]);

  const sourceOptions = useMemo(() => (
    Array.from(new Set(tasks.map((task) => String(task.source || 'manual').toLowerCase()).filter(Boolean))).sort()
  ), [tasks]);

  const activeFilterLabels = useMemo(() => {
    const labels = [];
    if (statusFilter !== 'all') labels.push(STATUS_LABEL[statusFilter] || statusFilter);
    if (priorityFilter !== 'all') labels.push(PRIORITY_FILTERS.find((filter) => filter.id === priorityFilter)?.label || priorityFilter);
    if (assigneeFilter !== 'all') labels.push(taskAssigneeOptions.find((option) => option.id === assigneeFilter)?.label || 'Assignee');
    if (leadFilter !== 'all') labels.push(taskLeadOptions.find((option) => option.id === leadFilter)?.label || 'Lead');
    if (sourceFilter !== 'all') labels.push(`Source: ${sourceFilter}`);
    if (dueFilter !== 'all') labels.push(DUE_FILTERS.find((filter) => filter.id === dueFilter)?.label || dueFilter);
    return labels;
  }, [statusFilter, priorityFilter, assigneeFilter, leadFilter, sourceFilter, dueFilter, taskAssigneeOptions, taskLeadOptions]);

  const hasActiveFilters = activeFilterLabels.length > 0;
  const secondaryFilterCount = [priorityFilter, assigneeFilter, leadFilter, sourceFilter, dueFilter].filter((value) => value !== 'all').length;

  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setLeadFilter('all');
    setSourceFilter('all');
    setDueFilter('all');
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return tasks.filter((task) => {
      const dueAt = task.dueAt ? new Date(task.dueAt) : null;
      const hasValidDueDate = dueAt && !Number.isNaN(dueAt.getTime());
      const isClosed = ['done', 'canceled'].includes(task.status);
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'all') {
        const key = task.assignedTo ? String(task.assignedTo) : '__unassigned__';
        if (key !== assigneeFilter) return false;
      }
      if (leadFilter !== 'all') {
        const key = task.leadId || '__none__';
        if (key !== leadFilter) return false;
      }
      if (sourceFilter !== 'all' && String(task.source || 'manual').toLowerCase() !== sourceFilter) return false;
      if (dueFilter === 'none' && hasValidDueDate) return false;
      if (dueFilter === 'overdue' && (!hasValidDueDate || dueAt >= today || isClosed)) return false;
      if (dueFilter === 'today' && (!hasValidDueDate || dueAt < today || dueAt >= tomorrow)) return false;
      if (dueFilter === 'upcoming' && (!hasValidDueDate || dueAt < tomorrow)) return false;
      if (!term) return true;
      return [task.title, task.description, task.leadName, task.assigneeLabel, task.priority, task.source].some((value) => String(value).toLowerCase().includes(term));
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter, assigneeFilter, leadFilter, sourceFilter, dueFilter]);

  const openCreate = async () => {
    if (!canManageTasks) return;
    setError('');
    setSelectedTask(null);
    setFormData({
      title: '',
      description: '',
      status: 'backlog',
      priority: 'medium',
      dueDate: '',
      assignedTo: '',
      leadId: leadOptions[0]?.id ? String(leadOptions[0].id) : '',
    });
    setModalType('create');
    await loadAssignees();
  };

  const openEdit = async (task) => {
    if (!canManageTasks) return;
    setError('');
    setSelectedTask(task);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'backlog',
      priority: task.priority || 'medium',
      dueDate: task.dueAt ? String(task.dueAt).slice(0, 10) : '',
      assignedTo: task.assignedTo ? String(task.assignedTo) : '',
      leadId: task.leadId ? String(task.leadId) : '',
    });
    setModalType('edit');
    await loadAssignees();
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedTask(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!user?.id) {
      setError('User not identified.');
      return;
    }
    if (!canManageTasks) {
      setError('Only managers can create or update tasks.');
      return;
    }
    if (!formData.assignedTo) {
      setError('Please select a sales rep.');
      return;
    }
    if (!formData.leadId) {
      setError('Please select a lead.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        due_at: formData.dueDate || undefined,
        assigned_to: formData.assignedTo,
        entity_type: LEAD_ENTITY_TYPE,
        entity_id: formData.leadId,
      };

      if (modalType === 'create') {
        const created = await apiFetch('/api/tasks/', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
          }),
        });
        setTasks((prev) => [normalizeTask(created, user, assigneeDirectory, leadDirectory), ...prev]);
      } else if (modalType === 'edit' && selectedTask?.id) {
        const updated = await apiFetch(`/api/tasks/${selectedTask.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? normalizeTask(updated, user, assigneeDirectory, leadDirectory) : t)));
      }
      const assigneeLabel = getAssigneeLabel(payload.assigned_to, user, assigneeDirectory);
      const leadName = leadDirectory[String(payload.entity_id)] || 'lead';
      toast.success(`Task saved for ${assigneeLabel} on ${leadName}.`);
      closeModal();
    } catch (err) {
      const message = err?.message || (modalType === 'edit' ? 'Update failed.' : 'Create failed.');
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const statusOptionsFor = (task) => {
    const options = canManageTasks ? STATUS_ORDER : REP_STATUS_OPTIONS;
    if (options.includes(task.status)) return options;
    return [task.status, ...options].filter(Boolean);
  };

  const updateTaskStatus = async (task, nextStatus) => {
    if (!nextStatus || nextStatus === task.status) return;
    try {
      const updated = await apiFetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? normalizeTask(updated, user, assigneeDirectory, leadDirectory) : t)));
      toast.success(`Task marked ${(STATUS_LABEL[nextStatus] || nextStatus).toLowerCase()}.`);
    } catch (err) {
      const message = err?.message || 'Status update failed.';
      setError(message);
      toast.error(message);
    }
  };

  const canDeleteTask = () => {
    return canManageTasks;
  };

  const requestDelete = (task) => {
    setDeleteTarget(task);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/tasks/${deleteTarget.id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((task) => task.id !== deleteTarget.id));
      toast.success('Task deleted.');
      setDeleteTarget(null);
    } catch (err) {
      const message = err?.message || 'Delete failed.';
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const exportXl = () => {
    const sheet = XLSX.utils.json_to_sheet(tasks);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Tasks');
    XLSX.writeFile(wb, 'CRM_Tasks.xlsx');
  };

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="page-title">Tasks</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setTotalLoaded(0); fetchTasks(0, false); }} className="btn btn-ghost btn-icon" aria-label="Refresh"><RotateCcw size={16} /></button>
            <button onClick={exportXl} className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
            {canManageTasks && <button onClick={openCreate} className="btn btn-primary"><Plus size={15} /> Add Task</button>}
          </div>
        </div>

        <div className="filter-toolbar">
          <div className="filter-search">
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
            <input type="text" placeholder="Search tasks..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="filter-group">
            {STATUS_FILTERS.map((filter) => (
              <button key={filter.id} className={`btn btn-sm ${statusFilter === filter.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setStatusFilter(filter.id)} type="button">
                {filter.label}
              </button>
            ))}
          </div>
          <details className="filter-menu">
            <summary className={`btn btn-sm ${secondaryFilterCount > 0 ? 'btn-primary' : 'btn-secondary'}`}>
              <SlidersHorizontal size={14} />
              Filters{secondaryFilterCount > 0 ? ` (${secondaryFilterCount})` : ''}
            </summary>
            <div className="filter-menu-panel filter-menu-panel-wide">
              <div>
                <label className="label">Priority</label>
                <select className="input" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} aria-label="Filter tasks by priority">
                  {PRIORITY_FILTERS.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Assignee</label>
                <select className="input" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} aria-label="Filter tasks by assignee">
                  <option value="all">All assignees</option>
                  {taskAssigneeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Lead</label>
                <select className="input" value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)} aria-label="Filter tasks by lead">
                  <option value="all">All leads</option>
                  {taskLeadOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Source</label>
                <select className="input" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} aria-label="Filter tasks by source">
                  <option value="all">All sources</option>
                  {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Due date</label>
                <select className="input" value={dueFilter} onChange={(e) => setDueFilter(e.target.value)} aria-label="Filter tasks by due date">
                  {DUE_FILTERS.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
                </select>
              </div>
              {hasActiveFilters && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear filters</button>
              )}
            </div>
          </details>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}


        {loading ? (
          <div style={CARD_GRID_STYLE}>{[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState type="tasks" />
        ) : (
          <div ref={gridRef} style={CARD_GRID_STYLE}>
            {filtered.map((task) => (
              <EntityCard
                key={task.id}
                title={task.title}
                description={task.source === 'ai' && task.aiReason ? `${task.description || ''}${task.description ? '\n\n' : ''}AI reason: ${task.aiReason}` : task.description}
                accentClass={STATUS_ACCENT[task.status] || 'note-border-muted'}
                clickable={canManageTasks}
                onClick={() => {
                  if (canManageTasks) openEdit(task);
                }}
                statusSlot={<span className={`badge ${STATUS_BADGE[task.status] || 'badge-muted'}`}>{STATUS_LABEL[task.status] || task.status}</span>}
                badges={[
                  { label: task.leadName },
                  { label: task.dueDateLabel },
                  { label: task.priority },
                  { label: `Assigned: ${task.assigneeLabel}` },
                  { label: task.modifiedLabel },
                  task.source === 'ai' ? { label: 'AI Generated', className: 'badge-purple' } : null,
                ]}
                footerLeft={(
                  <select
                    className="input"
                    value={task.status}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation();
                      updateTaskStatus(task, event.target.value);
                    }}
                    style={{ width: 180, maxWidth: '100%', height: 34, padding: '0 10px' }}
                    aria-label="Change task status"
                  >
                    {statusOptionsFor(task).map((status) => (
                      <option key={status} value={status}>{STATUS_LABEL[status] || status}</option>
                    ))}
                  </select>
                )}
                actions={canManageTasks && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(task); }}
                      className="btn btn-ghost btn-icon"
                      style={{ width: 24, height: 24, padding: 2 }}
                      aria-label="Edit"
                    >
                      <SquarePen size={12} />
                    </button>
                    {canDeleteTask(task) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); requestDelete(task); }}
                        className="btn btn-ghost btn-icon"
                        style={{ width: 24, height: 24, padding: 2 }}
                        aria-label="Delete"
                      >
                        <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                      </button>
                    )}
                  </>
                )}
              />
            ))}
          </div>
        )}

        {!loading && hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => fetchTasks(totalLoaded, true)} disabled={isLoadingMore} className="btn btn-secondary">
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}


        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete task?"
          message={deleteTarget ? `This will permanently delete "${deleteTarget.title}". This action cannot be undone.` : 'This action cannot be undone.'}
          confirmLabel="Delete task"
          isLoading={isDeleting}
          onCancel={() => { if (!isDeleting) setDeleteTarget(null); }}
          onConfirm={handleDelete}
        />

        <AnimatePresence>
          {modalType && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal}>
              <motion.div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.97, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                  <h3 className="section-title">{modalType === 'create' ? 'Create Task' : 'Edit Task'}</h3>
                  <button onClick={closeModal} className="btn btn-ghost btn-icon" aria-label="Close"><X size={18} /></button>
                </div>
                <form onSubmit={handleSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="label">Linked Lead *</label>
                    <select
                      className="input"
                      value={formData.leadId}
                      onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                      disabled={loadingLeads}
                      required
                    >
                      {!formData.leadId && <option value="">Select lead</option>}
                      {leadOptions.map((lead) => (
                        <option key={lead.id} value={lead.id}>{lead.name || 'Unnamed lead'}</option>
                      ))}
                    </select>
                  </div>
                  <div><label className="label">Title *</label><input type="text" required className="input" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></div>
                  <div><label className="label">Description</label><textarea className="input" style={{ minHeight: 100 }} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div><label className="label">Status</label><select className="input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>{STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select></div>
                    <div><label className="label">Priority</label><select className="input" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                    <div><label className="label">Due Date</label><input type="date" className="input" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} /></div>
                  </div>
                  {canManageTasks && (
                    <div>
                      <label className="label">Assign To</label>
                      <select className="input" value={formData.assignedTo} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} disabled={loadingAssignees} required>
                        {!formData.assignedTo && <option value="">Select sales rep</option>}
                        {assigneeOptions.map((rep) => (
                          <option key={rep.id} value={rep.id}>{rep.full_name || rep.email} ({rep.email})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button type="button" onClick={closeModal} className="btn btn-ghost">Cancel</button>
                    <button type="submit" disabled={isSaving} className="btn btn-primary">{isSaving ? 'Saving...' : modalType === 'create' ? 'Create Task' : 'Update Task'}</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default Tasks;
