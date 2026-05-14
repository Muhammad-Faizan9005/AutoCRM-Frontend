import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, RotateCcw, Trash2, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';

const DEFAULT_ENTITY_TYPE = 'general';
const STATUS_BADGE = { open: 'badge-accent', in_progress: 'badge-warning', done: 'badge-success' };
const STATUS_LABEL = { open: 'Open', in_progress: 'In Progress', done: 'Done' };
const PRIORITY_DOT = { high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };

const formatDate = (v) => { if (!v) return '-'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString(undefined, { month:'short', day:'numeric' }); };
const fmtAssignee = (a, u) => { if (!a) return 'Unassigned'; if (u?.id && String(a)===String(u.id)) return u.full_name||u.email||'You'; return String(a).slice(0,8); };
const mapTask = (t, u) => ({ id:t.id, title:t.title, status:t.status||'open', priority:t.priority||'medium', dueDate:formatDate(t.due_at), assignedTo:fmtAssignee(t.assigned_to,u), modified:formatDate(t.updated_at||t.created_at), description:t.description||'' });

const Tasks = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ title:'', description:'', status:'open', priority:'medium', dueDate:'' });
  const latestReq = useRef(0);
  const [listRef] = useAutoAnimate();
  const canDelete = user?.role === 'admin';

  const fetchTasks = useCallback(async (skip=0, append=false) => {
    const rid = ++latestReq.current;
    if (!append) setLoading(true); else setIsLoadingMore(true);
    setError('');
    try {
      const lim = append ? 10 : 20;
      const data = await apiFetch(`/api/tasks/?skip=${skip}&limit=${lim}`);
      if (rid !== latestReq.current) return;
      const m = data.map(t => mapTask(t, user));
      if (append) setTasks(p => [...p,...m]); else setTasks(m);
      setTotalLoaded(p => p + m.length); setHasMore(m.length === lim);
    } catch (e) { if (rid === latestReq.current) setError(e?.message||'Unable to load tasks.'); }
    finally { if (rid === latestReq.current) { if (!append) setLoading(false); else setIsLoadingMore(false); } }
  }, [user]);

  useEffect(() => { fetchTasks(0,false); }, [fetchTasks]);

  const filtered = useMemo(() => tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())), [tasks, searchTerm]);

  const toggleStatus = async (id, current) => {
    const next = current === 'done' ? 'open' : 'done';
    try {
      const updated = await apiFetch(`/api/tasks/${id}`, { method:'PATCH', body:JSON.stringify({ status:next }) });
      setTasks(p => p.map(t => t.id===id ? mapTask(updated, user) : t));
    } catch (e) { setError(e?.message||'Status update failed.'); }
  };

  const handleSave = async (e) => {
    e.preventDefault(); setError('');
    const title = formData.title.trim();
    if (!title) { setError('Title required.'); return; }
    if (!user?.id) { setError('User not identified.'); return; }
    setIsSaving(true);
    try {
      const payload = { entity_type:DEFAULT_ENTITY_TYPE, entity_id:user.id, title, description:formData.description.trim()||undefined, assigned_to:user.id, status:formData.status, priority:formData.priority, due_at:formData.dueDate||undefined };
      const created = await apiFetch('/api/tasks/', { method:'POST', body:JSON.stringify(payload) });
      setTasks(p => [mapTask(created,user),...p]); setIsCreateOpen(false); setFormData({ title:'', description:'', status:'open', priority:'medium', dueDate:'' });
    } catch (e) { setError(e?.message||'Create failed.'); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!canDelete || !window.confirm('Delete?')) return;
    try { await apiFetch(`/api/tasks/${id}`, { method:'DELETE' }); setTasks(p => p.filter(t => t.id!==id)); } catch (e) { setError(e?.message||'Delete failed.'); }
  };

  const exportXl = () => { const ws=XLSX.utils.json_to_sheet(tasks); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Tasks"); XLSX.writeFile(wb,"CRM_Tasks.xlsx"); };

  // Group tasks
  const grouped = useMemo(() => {
    const today = [], thisWeek = [], later = [], completed = [];
    const now = new Date(); const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate()+7);
    filtered.forEach(t => {
      if (t.status === 'done') { completed.push(t); return; }
      const due = new Date(t.dueDate);
      if (!t.dueDate || t.dueDate === '-') { later.push(t); }
      else if (due.toDateString() === now.toDateString()) today.push(t);
      else if (due <= weekEnd) thisWeek.push(t);
      else later.push(t);
    });
    return [
      { label:'Today', items:today },
      { label:'This Week', items:thisWeek },
      { label:'Later', items:later },
      { label:'Completed', items:completed },
    ].filter(g => g.items.length > 0);
  }, [filtered]);

  return (
    <PageTransition>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h1 className="page-title">Tasks</h1>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { setTotalLoaded(0); fetchTasks(0,false); }} className="btn btn-ghost btn-icon" aria-label="Refresh"><RotateCcw size={16}/></button>
            <button onClick={exportXl} className="btn btn-secondary btn-sm"><Download size={14}/> Export</button>
            <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary"><Plus size={15}/> Add Task</button>
          </div>
        </div>

        <div style={{ position:'relative', maxWidth:320 }}>
          <Search size={16} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-tertiary)' }}/>
          <input type="text" placeholder="Search tasks..." className="search-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
        </div>

        {error && <div style={{ padding:12, background:'var(--color-danger-subtle)', border:'1px solid var(--color-danger)', borderRadius:'var(--radius)', fontSize:'var(--text-sm)', color:'var(--color-danger)' }}>{error}</div>}

        {loading ? <SkeletonTable rows={6} cols={5}/> : filtered.length === 0 ? <EmptyState type="tasks"/> : (
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            {grouped.map(group => (
              <div key={group.label}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <h3 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-md)', fontWeight:600 }}>{group.label}</h3>
                  <span className="badge badge-muted">{group.items.length}</span>
                </div>
                <div ref={listRef} className="card" style={{ overflow:'hidden' }}>
                  {group.items.map(task => (
                    <div key={task.id} style={{
                      display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                      borderBottom:'1px solid var(--color-border)',
                      transition:'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--color-bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleStatus(task.id, task.status)}
                        style={{ width:18, height:18, borderRadius:4, border: task.status==='done' ? 'none' : '1.5px solid var(--color-border-strong)', background: task.status==='done' ? 'var(--color-accent)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, transition:'all 0.15s' }}
                        aria-label={task.status==='done' ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {task.status === 'done' && (
                          <motion.svg viewBox="0 0 24 24" width={12} height={12} initial={{ pathLength:0 }} animate={{ pathLength:1 }}>
                            <motion.path d="M4 12 L9 17 L20 6" stroke="var(--color-text-inverse)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ duration:0.2 }}/>
                          </motion.svg>
                        )}
                      </button>

                      {/* Priority dot */}
                      <div className={`priority-dot ${PRIORITY_DOT[task.priority]||'priority-medium'}`} title={task.priority}/>

                      {/* Title */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <span style={{
                          fontWeight:500,
                          textDecoration: task.status==='done' ? 'line-through' : 'none',
                          color: task.status==='done' ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                          transition:'color 0.2s, text-decoration 0.2s',
                        }}>{task.title}</span>
                      </div>

                      {/* Assignee */}
                      <div className="avatar avatar-sm avatar-accent" title={task.assignedTo}>{task.assignedTo[0]}</div>

                      {/* Due date badge */}
                      <span className="badge badge-muted" style={{ fontSize:'var(--text-xs)' }}>{task.dueDate}</span>

                      {/* Status */}
                      <span className={`badge ${STATUS_BADGE[task.status]||'badge-muted'}`}>{STATUS_LABEL[task.status]||task.status}</span>

                      {/* Delete */}
                      {canDelete && (
                        <button onClick={() => handleDelete(task.id)} className="btn btn-ghost btn-icon" style={{ width:24,height:24,padding:2 }} aria-label="Delete">
                          <Trash2 size={12} style={{ color:'var(--color-danger)' }}/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && hasMore && (
          <div style={{ display:'flex', justifyContent:'center' }}>
            <button onClick={() => fetchTasks(totalLoaded,true)} disabled={isLoadingMore} className="btn btn-secondary">{isLoadingMore ? 'Loading...' : 'Load More'}</button>
          </div>
        )}

        <AnimatePresence>
          {isCreateOpen && (
            <motion.div className="modal-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setIsCreateOpen(false)}>
              <motion.div className="modal-content" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()} initial={{ opacity:0,scale:0.97,y:4 }} animate={{ opacity:1,scale:1,y:0 }} exit={{ opacity:0,scale:0.97 }}>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--color-border)' }}>
                  <h3 className="section-title">Create Task</h3>
                  <button onClick={() => setIsCreateOpen(false)} className="btn btn-ghost btn-icon" aria-label="Close"><X size={18}/></button>
                </div>
                <form onSubmit={handleSave} style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
                  <div><label className="label">Title *</label><input type="text" required className="input" value={formData.title} onChange={e => setFormData({...formData,title:e.target.value})}/></div>
                  <div><label className="label">Description</label><textarea className="input" style={{ minHeight:80 }} value={formData.description} onChange={e => setFormData({...formData,description:e.target.value})}/></div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                    <div><label className="label">Status</label><select className="input" value={formData.status} onChange={e => setFormData({...formData,status:e.target.value})}><option value="open">Open</option><option value="in_progress">In Progress</option><option value="done">Done</option></select></div>
                    <div><label className="label">Priority</label><select className="input" value={formData.priority} onChange={e => setFormData({...formData,priority:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                    <div><label className="label">Due Date</label><input type="date" className="input" value={formData.dueDate} onChange={e => setFormData({...formData,dueDate:e.target.value})}/></div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                    <button type="button" onClick={() => setIsCreateOpen(false)} className="btn btn-ghost">Cancel</button>
                    <button type="submit" disabled={isSaving} className="btn btn-primary">{isSaving ? 'Creating...' : 'Create Task'}</button>
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
