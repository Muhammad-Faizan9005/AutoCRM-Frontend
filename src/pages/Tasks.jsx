import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, Download, X, Check, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../api/client';

const DEFAULT_ENTITY_TYPE = 'general';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const formatAssignee = (assignedTo, currentUser) => {
  if (!assignedTo) return 'Unassigned';
  if (currentUser?.id && String(assignedTo) === String(currentUser.id)) {
    return currentUser.full_name || currentUser.email || 'You';
  }
  return String(assignedTo).slice(0, 8);
};

const mapTaskToRow = (task, currentUser) => ({
  id: task.id,
  title: task.title,
  status: task.status || 'open',
  priority: task.priority || 'medium',
  dueDate: formatDate(task.due_at),
  assignedTo: formatAssignee(task.assigned_to, currentUser),
  modified: formatDate(task.updated_at || task.created_at),
  description: task.description || '',
});

const Tasks = ({ user }) => {
  // --- STATES ---
  const [tasks, setTasks] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({ title: true, status: true, priority: true, dueDate: true, assignedTo: true, modified: true });
  const [formData, setFormData] = useState({ title: '', description: '', status: 'open', priority: 'medium', dueDate: '' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const latestRequestId = useRef(0);

  const canDelete = user?.role === 'admin';

  const resetForm = () => setFormData({ title: '', description: '', status: 'open', priority: 'medium', dueDate: '' });

  const fetchTasks = useCallback(async () => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    setLoading(true);
    setError('');

    try {
      const data = await apiFetch('/api/tasks/');
      if (requestId !== latestRequestId.current) return;
      setTasks(data.map((task) => mapTaskToRow(task, user)));
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err?.message || 'Unable to load tasks.');
    } finally {
      if (requestId === latestRequestId.current) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // --- FUNCTIONS ---
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTasks();
    setIsRefreshing(false);
  };

  const filteredTasks = useMemo(() => tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())), [tasks, searchTerm]);

  const handleSort = (key) => {
    setTasks([...tasks].sort((a,b)=>String(a[key]).localeCompare(String(b[key]))));
    setActiveDropdown(null);
  };

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'done' ? 'open' : 'done';
    setActiveDropdown(null);
    setError('');

    try {
      const updated = await apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setTasks((prev) => prev.map((task) => (
        task.id === id ? mapTaskToRow(updated, user) : task
      )));
    } catch (err) {
      setError(err?.message || 'Unable to update task status.');
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setError('');

    const title = formData.title.trim();
    if (!title) {
      setError('Task title is required.');
      return;
    }

    if (!user?.id) {
      setError('Unable to identify current user for tasks.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        entity_type: DEFAULT_ENTITY_TYPE,
        entity_id: user.id,
        title,
        description: formData.description.trim() || undefined,
        assigned_to: user.id,
        status: formData.status || 'open',
        priority: formData.priority || 'medium',
        due_at: formData.dueDate || undefined,
      };

      const created = await apiFetch('/api/tasks/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setTasks((prev) => [mapTaskToRow(created, user), ...prev]);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err?.message || 'Unable to create task.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!canDelete) return;
    const confirmed = window.confirm('Delete this task?');
    if (!confirmed) return;

    setError('');
    try {
      await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (err) {
      setError(err?.message || 'Unable to delete task.');
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(tasks);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "CRM_Tasks.xlsx");
    setIsExportModalOpen(false);
  };

  return (
    <div className="min-h-screen p-4 space-y-3 bg-gray-50 font-sans text-sm">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-black">Tasks</h1>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className={`p-2 bg-white border rounded hover:bg-gray-100 ${isRefreshing?'animate-spin text-purple-600':''}`}><RotateCcw size={18}/></button>
          <button onClick={()=>setIsCreateModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-900 font-semibold"><Plus size={16}/> Create</button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-xs text-gray-500">Loading tasks...</div>
      )}

      {/* SEARCH + ACTIONS */}
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2 text-gray-400" size={16}/>
          <input type="text" placeholder="Search tasks..." className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 w-full text-xs" onChange={e=>setSearchTerm(e.target.value)} />
        </div>

        <div className="flex gap-2">
          {/* FILTER */}
          <div className="relative">
            <button onClick={()=>setActiveDropdown(activeDropdown==='filter'?null:'filter')} className="px-2 py-1 border rounded bg-white text-xs flex gap-1 items-center"><Filter size={14}/> Filter</button>
            {activeDropdown==='filter' && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border rounded shadow z-50 text-xs">
                {['Status','Priority','Assigned To'].map(f=><div key={f} className="p-2 hover:bg-gray-100 cursor-pointer">{f}</div>)}
              </div>
            )}
          </div>

          {/* SORT */}
          <div className="relative">
            <button onClick={()=>setActiveDropdown(activeDropdown==='sort'?null:'sort')} className="px-2 py-1 border rounded bg-white text-xs flex gap-1 items-center"><ArrowUpDown size={14}/> Sort</button>
            {activeDropdown==='sort' && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border rounded shadow z-50 text-xs">
                {['title','status','priority','dueDate'].map(s=><div key={s} onClick={()=>handleSort(s)} className="p-2 hover:bg-gray-100 cursor-pointer capitalize">{s}</div>)}
              </div>
            )}
          </div>

          {/* COLUMNS */}
          <div className="relative">
            <button onClick={()=>setActiveDropdown(activeDropdown==='cols'?null:'cols')} className="px-2 py-1 border rounded bg-white text-xs flex gap-1 items-center"><LayoutPanelLeft size={14}/> Columns</button>
            {activeDropdown==='cols' && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border rounded shadow z-50 text-xs p-2">
                {Object.keys(visibleColumns).map(col=>(
                  <div key={col} className="flex justify-between p-1 hover:bg-gray-100 cursor-pointer capitalize" onClick={()=>setVisibleColumns({...visibleColumns,[col]:!visibleColumns[col]})}>
                    {col} {visibleColumns[col] && <Check size={14} className="text-purple-600"/>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EXPORT */}
          <button onClick={()=>setIsExportModalOpen(true)} className="flex items-center gap-1 px-2 py-1 border rounded bg-white text-xs"><Download size={14}/> Export</button>
        </div>
      </div>

      {/* TASK TABLE */}
      <div className="mt-2 overflow-x-auto bg-white border rounded-lg shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-black text-white uppercase font-bold text-[10px]">
            <tr>
              <th className="px-2 py-2 w-6"><input type="checkbox"/></th>
              {visibleColumns.title && <th className="px-2 py-2">Title</th>}
              {visibleColumns.status && <th className="px-2 py-2">Status</th>}
              {visibleColumns.priority && <th className="px-2 py-2">Priority</th>}
              {visibleColumns.dueDate && <th className="px-2 py-2 text-center">Due Date</th>}
              {visibleColumns.assignedTo && <th className="px-2 py-2">Assigned To</th>}
              {visibleColumns.modified && <th className="px-2 py-2">Last Modified</th>}
              <th className="px-2 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTasks.map(task=>(
              <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-2 py-2"><input type="checkbox"/></td>
                {visibleColumns.title && <td className="px-2 py-2 font-bold">{task.title}</td>}
                {visibleColumns.status && (
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => toggleStatus(task.id, task.status)}
                      className="text-left"
                    >
                      {task.status}
                    </button>
                  </td>
                )}
                {visibleColumns.priority && <td className="px-2 py-2">{task.priority}</td>}
                {visibleColumns.dueDate && <td className="px-2 py-2 text-center">{task.dueDate}</td>}
                {visibleColumns.assignedTo && <td className="px-2 py-2">{task.assignedTo}</td>}
                {visibleColumns.modified && <td className="px-2 py-2 text-gray-400 italic">{task.modified}</td>}
                <td className="px-2 py-2 text-right">
                  {canDelete && (
                    <button onClick={() => handleDeleteTask(task.id)} className="text-red-500 text-xs">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && filteredTasks.length === 0 && (
        <div className="text-xs text-gray-500">No tasks found.</div>
      )}

      {/* CREATE TASK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Create Task</h3>
              <X size={20} className="cursor-pointer" onClick={()=>setIsCreateModalOpen(false)}/>
            </div>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase mb-1 block">Title *</label>
                <input type="text" required className="w-full border p-2.5 rounded text-sm outline-none" value={formData.title} onChange={e=>setFormData({...formData,title:e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase mb-1 block">Description</label>
                <textarea className="w-full border p-3 rounded text-sm outline-none min-h-[100px]" value={formData.description} onChange={e=>setFormData({...formData,description:e.target.value})}></textarea>
              </div>
              <div className="flex gap-2">
                <select className="border p-2 rounded text-xs w-1/3" value={formData.status} onChange={e=>setFormData({...formData,status:e.target.value})}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <select className="border p-2 rounded text-xs w-1/3" value={formData.priority} onChange={e=>setFormData({...formData,priority:e.target.value})}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <input type="date" className="border p-2 rounded text-xs w-1/3" value={formData.dueDate} onChange={e=>setFormData({...formData,dueDate:e.target.value})}/>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={isSaving} className="bg-black text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-gray-900 disabled:opacity-60">{isSaving ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm">Export Tasks</h3>
              <X size={18} className="cursor-pointer" onClick={()=>setIsExportModalOpen(false)}/>
            </div>
            <button onClick={exportToExcel} className="w-full bg-black text-white py-2 rounded text-xs font-bold hover:bg-gray-900 transition">Download Excel</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Tasks;
