import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, RotateCcw, Trash2, X, Download, SquarePen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';
import { toast } from '../utils/toast';

const LEAD_ENTITY_TYPE = 'lead';
const STATUS_ORDER = ['backlog', 'todo', 'in_progress', 'done', 'canceled'];
const REP_STATUS_OPTIONS = ['in_progress', 'done'];
const STATUS_BADGE = { backlog: 'badge-muted', todo: 'badge-accent', in_progress: 'badge-success', done: 'badge-danger', canceled: 'badge-purple' };
const STATUS_LABEL = { backlog: 'Backlog', todo: 'Todo', in_progress: 'In Progress', done: 'Done', canceled: 'Canceled' };
const NOTE_BORDERS = ['note-border-accent', 'note-border-success', 'note-border-warning'];

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
  return `Rep ${String(assignedTo).slice(0, 8)}`;
};

const normalizeTask = (task, currentUser, directory, leadDirectory) => ({
  id: task.id,
  title: task.title || 'Untitled task',
  description: task.description || '',
  status: task.status === 'open' ? 'todo' : task.status || 'backlog',
  priority: task.priority || 'medium',
  dueAt: task.due_at || '',
  dueDateLabel: formatDate(task.due_at),
  assignedTo: task.assigned_to || null,
  assigneeLabel: getAssigneeLabel(task.assigned_to, currentUser, directory),
  modifiedLabel: formatDateTime(task.updated_at || task.created_at),
  leadId: String(task.entity_id || ''),
  leadName: leadDirectory[String(task.entity_id)] || `Lead ${String(task.entity_id || '').slice(0, 8)}`,
});

const Tasks = ({ user }) => {
  const canManageTasks = ['admin', 'sales_manager', 'manager'].includes(String(user?.role || '').toLowerCase());

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [assigneeDirectory, setAssigneeDirectory] = useState({});
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [leadOptions, setLeadOptions] = useState([]);
  const [leadDirectory, setLeadDirectory] = useState({});
  const [loadingLeads, setLoadingLeads] = useState(false);
  const leadDirectoryRef = useRef({});

  const latestReq = useRef(0);
  const [gridRef] = useAutoAnimate();

  const loadAssignees = useCallback(async () => {
    if (!canManageTasks) return;
    setLoadingAssignees(true);
      try {
        const data = await apiFetch('/api/admin/users/?page=1&page_size=200');
        const items = Array.isArray(data?.items) ? data.items : [];
        const reps = items.filter((u) => ['agent', 'sales_rep'].includes(String(u?.role || '').toLowerCase()));
        const directory = {};
        reps.forEach((rep) => {
          directory[String(rep.id)] = rep.full_name || rep.email || String(rep.id).slice(0, 8);
        });
        setAssigneeDirectory(directory);
        setAssigneeOptions(reps);
        setFormData((prev) => ({ ...prev, assignedTo: prev.assignedTo || String(reps[0]?.id || '') }));
      } catch {
        setAssigneeOptions([]);
      } finally {
      setLoadingAssignees(false);
    }
  }, [canManageTasks]);

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const data = await apiFetch('/api/leads/?skip=0&limit=500');
      const leads = Array.isArray(data) ? data : [];
      const directory = {};
      leads.forEach((lead) => {
        directory[String(lead.id)] = lead.name || `Lead ${String(lead.id).slice(0, 8)}`;
      });
      setLeadOptions(leads);
      setLeadDirectory(directory);
      leadDirectoryRef.current = directory;
      setFormData((prev) => ({ ...prev, leadId: prev.leadId || String(leads[0]?.id || '') }));
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
    if (!append) setLoading(true);
    else setIsLoadingMore(true);
    setError('');
    try {
      const limit = append ? 10 : 20;
      const data = await apiFetch(`/api/tasks/?entity_type=${LEAD_ENTITY_TYPE}&skip=${skip}&limit=${limit}`);
      if (rid !== latestReq.current) return;
      const directory = { ...leadDirectoryRef.current };
      const missingLeadIds = Array.from(
        new Set(
          data
            .map((task) => String(task.entity_id || ''))
            .filter((id) => id && !directory[id])
        )
      );

      if (missingLeadIds.length) {
        try {
          const leads = await Promise.all(
            missingLeadIds.map((id) => apiFetch(`/api/leads/${id}`))
          );
          leads.forEach((lead) => {
            if (lead?.id) {
              directory[String(lead.id)] = lead.name || `Lead ${String(lead.id).slice(0, 8)}`;
            }
          });
          leadDirectoryRef.current = directory;
          setLeadDirectory(directory);
        } catch {
          // Ignore lead lookup failures and fall back to IDs.
        }
      }

      const mapped = data.map((task) => normalizeTask(task, user, assigneeDirectory, directory));
      if (append) setTasks((prev) => [...prev, ...mapped]);
      else setTasks(mapped);
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

  const filtered = useMemo(
    () => tasks.filter((task) => task.title.toLowerCase().includes(searchTerm.toLowerCase())),
    [tasks, searchTerm]
  );

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

  const canDeleteTask = (task) => {
    return canManageTasks;
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((task) => task.id !== id));
      toast.success('Task deleted.');
    } catch (err) {
      const message = err?.message || 'Delete failed.';
      setError(message);
      toast.error(message);
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

        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input type="text" placeholder="Search tasks..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>


        {loading ? (
          <div className="masonry-grid">{[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState type="tasks" />
        ) : (
          <div ref={gridRef} className="masonry-grid">
            {filtered.map((task, idx) => (
              <motion.div
                key={task.id}
                className={`card ${NOTE_BORDERS[idx % 3]}`}
                style={{ padding: 16, cursor: canManageTasks ? 'pointer' : 'default' }}
                onClick={() => {
                  if (canManageTasks) openEdit(task);
                }}
                whileHover={{ scale: 1.01 }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-md)' }}>{task.title}</h3>
                  <span className={`badge ${STATUS_BADGE[task.status] || 'badge-muted'}`}>{STATUS_LABEL[task.status] || task.status}</span>
                </div>

                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', minHeight: 44 }}>
                  {task.description || 'No description added.'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <span className="badge badge-muted">{task.leadName}</span>
                  <span className="badge badge-muted">{task.dueDateLabel}</span>
                  <span className="badge badge-muted">{task.priority}</span>
                  <span className="badge badge-muted">Assigned: {task.assigneeLabel}</span>
                  <span className="badge badge-muted">{task.modifiedLabel}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: canManageTasks ? 'space-between' : 'flex-end', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border)', gap: 8 }}>
                  <select
                    className="input"
                    value={task.status}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation();
                      updateTaskStatus(task, event.target.value);
                    }}
                    style={{ maxWidth: 180, height: 34, padding: '0 10px' }}
                    aria-label="Change task status"
                  >
                    {statusOptionsFor(task).map((status) => (
                      <option key={status} value={status}>{STATUS_LABEL[status] || status}</option>
                    ))}
                  </select>
                  {canManageTasks && (
                    <div style={{ display: 'flex', gap: 6 }}>
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
                        onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                        className="btn btn-ghost btn-icon"
                        style={{ width: 24, height: 24, padding: 2 }}
                        aria-label="Delete"
                      >
                        <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                      </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
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
                        <option key={lead.id} value={lead.id}>{lead.name || `Lead ${String(lead.id).slice(0, 8)}`}</option>
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
