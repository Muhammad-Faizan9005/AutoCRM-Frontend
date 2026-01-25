import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, Download, X, MoreHorizontal, Check, List as ListIcon, ChevronDown, RotateCcw, Calendar, User, Trash2, Settings } from 'lucide-react';
import * as XLSX from 'xlsx';

const Tasks = () => {
  // --- STATES ---
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tasks, setTasks] = useState([
    { id: 1, title: 'call with aslam', status: 'Done', priority: 'Low', dueDate: '2024-04-01', assignedTo: 'abbbccd', modified: '1 week ago' },
    { id: 2, title: 'Project documentation', status: 'Backlog', priority: 'High', dueDate: '2024-04-05', assignedTo: 'abbbccd', modified: '2 days ago' },
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false); // Export Popup state
  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  
  // Column Visibility Functional
  const [visibleColumns, setVisibleColumns] = useState({ 
    title: true, status: true, priority: true, dueDate: true, assignedTo: true, modified: true 
  });

  const [formData, setFormData] = useState({
    title: '', description: '', status: 'Backlog', priority: 'Low', assignedTo: 'abbbccd', dueDate: '2024-04-01'
  });

  // --- FUNCTIONS ---
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [tasks, searchTerm]);

  // Sort Functionality
  const handleSort = (key) => {
    const sorted = [...tasks].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
    setTasks(sorted);
    setActiveDropdown(null);
  };

  const toggleStatus = (id, currentStatus) => {
    const nextStatus = currentStatus === 'Done' ? 'Backlog' : 'Done';
    setTasks(tasks.map(t => t.id === id ? { ...t, status: nextStatus } : t));
    setActiveDropdown(null);
  };

  const handleSaveTask = (e) => {
    e.preventDefault();
    const newEntry = {
      id: Date.now(),
      title: formData.title || 'New Task',
      status: formData.status,
      priority: formData.priority,
      dueDate: formData.dueDate,
      assignedTo: 'abbbccd', // Default assigned name
      modified: 'Just now'
    };
    setTasks([newEntry, ...tasks]);
    setIsCreateModalOpen(false);
    setFormData({ title: '', description: '', status: 'Backlog', priority: 'Low', assignedTo: 'abbbccd', dueDate: '2024-04-01' });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(tasks);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "CRM_Tasks.xlsx");
    setIsExportModalOpen(false);
  };

  return (
    <div className={`flex flex-col h-screen bg-white overflow-hidden text-left font-sans transition-opacity duration-300 ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}>
      
      {/* 1. Header (Leads Design) */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 z-[100]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Tasks /</h2>
            <div className="relative">
              <button onClick={() => setActiveDropdown(activeDropdown === 'view' ? null : 'view')} className="flex items-center gap-1 text-slate-400 font-bold text-sm hover:text-purple-700 transition-colors">
                <ListIcon size={18}/> List <ChevronDown size={14}/>
              </button>
            </div>
          </div>
         {/* Right Side: Create Button */}
    <button 
      onClick={() => setIsCreateModalOpen(true)} 
      className="bg-black text-white px-4 py-1.5 rounded-md flex items-center gap-2 hover:bg-gray-800 text-sm font-medium transition-all shadow-sm active:scale-95"
    >
      <Plus size={16} /> Create
    </button>
        </div>
      </div>

      {/* 2. Action Bar (Functional Dropdowns) */}
      <div className="bg-white px-6 py-3 border-b border-slate-200 sticky top-0 z-40 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="text" placeholder="Search tasks..." 
                className="pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-md text-sm w-72 outline-none focus:ring-1 focus:ring-purple-200 transition-all"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={handleRefresh} className={`p-2 hover:bg-slate-100 rounded-lg text-gray-400 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`}><RotateCcw size={18}/></button>
          </div>

          <div className="flex items-center gap-1">
            {/* Filter */}
            <div className="relative">
              <button onClick={() => setActiveDropdown(activeDropdown === 'filter' ? null : 'filter')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm font-bold border border-transparent hover:border-slate-200 transition-all"><Filter size={16}/> Filter</button>
              {activeDropdown === 'filter' && (
                <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 p-6 animate-in slide-in-from-top-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filters</p>
                  <div className="space-y-1">
                    {['Status', 'Priority', 'Assigned To'].map(f => (
                      <div key={f} className="p-2.5 hover:bg-purple-50 rounded-lg text-xs font-medium text-slate-600 cursor-pointer">{f}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="relative">
              <button onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm font-bold border border-transparent hover:border-slate-200 transition-all"><ArrowUpDown size={16}/> Sort</button>
              {activeDropdown === 'sort' && (
                <div className="absolute right-0 top-10 w-64 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 p-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sort by</p>
                   <button onClick={() => handleSort('title')} className="w-full text-left p-2 hover:bg-purple-50 rounded-lg text-xs font-bold text-gray-600">Title</button>
                   <button onClick={() => handleSort('status')} className="w-full text-left p-2 hover:bg-purple-50 rounded-lg text-xs font-bold text-gray-600">Status</button>
                </div>
              )}
            </div>

            {/* Columns */}
            <div className="relative">
              <button onClick={() => setActiveDropdown(activeDropdown === 'cols' ? null : 'cols')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm font-bold border border-transparent hover:border-slate-200 transition-all"><LayoutPanelLeft size={16}/> Columns</button>
              {activeDropdown === 'cols' && (
                <div className="absolute right-0 top-10 w-72 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Column Display</p>
                  <div className="space-y-2">
                    {Object.keys(visibleColumns).map(col => (
                      <div key={col} className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors" onClick={() => setVisibleColumns({...visibleColumns, [col]: !visibleColumns[col]})}>
                        <div className="flex items-center gap-3">
                          <MoreHorizontal size={14} className="text-slate-300 rotate-90" />
                          <span className="text-xs font-bold text-slate-600 capitalize">{col}</span>
                        </div>
                        {visibleColumns[col] && <Check size={14} className="text-purple-600" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative">
              <button onClick={() => setActiveDropdown(activeDropdown === 'more' ? null : 'more')} className="p-2 hover:bg-gray-100 rounded text-gray-500 transition-colors"><MoreHorizontal size={20}/></button>
              {activeDropdown === 'more' && (
                <div className="absolute right-0 top-10 w-44 bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-50 overflow-hidden">
                  <button onClick={() => setIsExportModalOpen(true)} className="w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-purple-50 flex items-center gap-2 text-slate-600 uppercase tracking-widest transition-colors"><Download size={14}/> Export</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Task Table (Clean Leads Look) */}
      <main className="flex-1 overflow-y-auto p-4 bg-white">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b tracking-wider uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4 w-10"><input type="checkbox" className="rounded border-slate-300"/></th>
                {visibleColumns.title && <th className="px-6 py-4">Title</th>}
                {visibleColumns.status && <th className="px-6 py-4">Status</th>}
                {visibleColumns.priority && <th className="px-6 py-4">Priority</th>}
                {visibleColumns.dueDate && <th className="px-6 py-4 text-center">Due Date</th>}
                {visibleColumns.assignedTo && <th className="px-6 py-4">Assigned To</th>}
                {visibleColumns.modified && <th className="px-6 py-4">Last Modified</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4"><input type="checkbox" className="rounded border-slate-300"/></td>
                  {visibleColumns.title && <td className="px-6 py-4 font-semibold text-slate-800">{task.title}</td>}
                  {visibleColumns.status && (
                    <td className="px-6 py-4 relative">
                      <button 
                        onClick={() => toggleStatus(task.id, task.status)}
                        className="flex items-center gap-2 text-[11px] font-black text-slate-700 uppercase tracking-tighter hover:bg-white p-1 px-2 rounded-md transition-all border border-transparent hover:border-slate-200"
                      >
                        <Check size={14} className={task.status === 'Done' ? 'text-green-500 bg-green-50 rounded-full p-0.5' : 'text-slate-400 border border-slate-300 rounded-full'} />
                        {task.status} <ChevronDown size={12} className="text-slate-400"/>
                      </button>
                    </td>
                  )}
                  {visibleColumns.priority && (
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                        <div className={`w-2 h-2 rounded-full ${task.priority === 'High' ? 'bg-red-500' : 'bg-slate-300'}`}></div> {task.priority}
                      </span>
                    </td>
                  )}
                  {visibleColumns.dueDate && <td className="px-6 py-4 text-center text-slate-400 opacity-50"><Calendar size={14} className="inline"/></td>}
                  {visibleColumns.assignedTo && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-black">A</div>
                        <span className="text-xs font-bold text-slate-600">{task.assignedTo}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.modified && <td className="px-6 py-4 text-slate-400 text-[11px] font-bold italic">{task.modified}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* 4. CREATE TASK MODAL (Aapka original layout) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-left animate-in zoom-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-white sticky top-0">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Create Task</h3>
              <X size={20} className="cursor-pointer text-slate-400 hover:text-red-500 transition-colors" onClick={() => setIsCreateModalOpen(false)} />
            </div>
            
            <form onSubmit={handleSaveTask} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest text-left">Title *</label>
                <input type="text" required className="w-full border border-slate-200 p-3 rounded-xl bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100" placeholder="Call with John Doe" value={formData.title} onChange={e=>setFormData({...formData, title:e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest text-left">Description</label>
                <textarea className="w-full border border-slate-200 p-4 rounded-2xl bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100 min-h-[120px] resize-none" placeholder="Task details..." value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value})}></textarea>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                 <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-100"><RotateCcw size={14} /> {formData.status}</div>
                 <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-100"><User size={14} /> {formData.assignedTo}</div>
                 <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-100"><Calendar size={14} /> 01/04/2024</div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="bg-black text-white px-10 py-3 rounded-xl font-bold text-sm shadow-xl hover:bg-gray-800 transition-all active:scale-95 uppercase tracking-widest">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. EXPORT MODAL (Professional Download Popup) */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-center animate-in zoom-in duration-150">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 relative">
            <X size={18} className="absolute right-6 top-6 cursor-pointer text-gray-400 hover:text-black" onClick={()=>setIsExportModalOpen(false)}/>
            <h3 className="text-xl font-bold text-gray-800 text-left mb-4 border-b pb-2">Export Tasks</h3>
            <div className="text-left space-y-4 py-2">
               <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Export Type</label><p className="text-sm font-bold text-gray-700">Excel (.xlsx)</p></div>
               <div className="flex items-center gap-3"><input type="checkbox" defaultChecked className="w-4 h-4 rounded text-purple-600 border-gray-300"/><label className="text-sm text-gray-600 font-bold">Export All records</label></div>
            </div>
            <button onClick={exportToExcel} className="w-full mt-6 py-3.5 bg-[#2d3a60] text-white rounded-xl font-bold hover:bg-[#1e2a4a] transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs">Download Now</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;