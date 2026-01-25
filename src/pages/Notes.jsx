import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, Download, X, MoreHorizontal, Check, List as ListIcon, LayoutGrid, ChevronDown, RotateCcw, Settings, RefreshCcw, Trash2 } from 'lucide-react';

const Notes = () => {
  // --- STATES ---
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('Notes View'); 
  const [notes, setNotes] = useState([
    { id: 1, title: 'aslam industries called', content: 'they asked about products', author: 'Administrator', time: '1 week ago' },
    { id: 2, title: 'Follow up with Binance', content: 'Discussed the Q1 roadmap', author: 'Administrator', time: '2 days ago' },
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  
  // Elements visibility matching Column display logic
  const [visibleElements, setVisibleElements] = useState({ title: true, content: true, author: true, time: true });
  const [formData, setFormData] = useState({ title: '', content: '' });

  // --- FUNCTIONS ---
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [notes, searchTerm]);

  const handleSort = (key) => {
    const sorted = [...notes].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
    setNotes(sorted);
    setActiveDropdown(null);
  };

  const handleNoteClick = (note) => {
    setSelectedNote(note);
    setFormData({ title: note.title, content: note.content });
    setIsEditModalOpen(true);
  };

  const handleUpdateNote = (e) => {
    e.preventDefault();
    const updated = notes.map(n => n.id === selectedNote.id ? { ...n, title: formData.title, content: formData.content } : n);
    setNotes(updated);
    setIsEditModalOpen(false);
  };

  const handleDeleteTask = (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this task?")) {
      setNotes(notes.filter(n => n.id !== id));
      setActiveDropdown(null);
    }
  };

  const handleSaveNote = (e) => {
    e.preventDefault();
    const newEntry = { id: Date.now(), title: formData.title, content: formData.content, author: 'Administrator', time: 'Just now' };
    setNotes([newEntry, ...notes]);
    setIsCreateModalOpen(false);
    setFormData({ title: '', content: '' });
  };

  return (
    <div className="space-y-6 text-left relative min-h-screen bg-[#f8fafc]">
      
      {/* 1. Header (Solid Style from Deals) */}
      <div className="flex justify-between items-center px-2 py-4 bg-white border-b border-gray-100 sticky top-0 z-[100]">
        <div className="flex items-center gap-2">
           <h2 className="text-xl font-bold text-gray-800">Notes /</h2>
           <div className="relative">
              <button onClick={() => setActiveDropdown(activeDropdown === 'view' ? null : 'view')} className="flex items-center gap-1 text-gray-500 hover:text-purple-700 font-medium transition-colors">
                <ListIcon size={18}/> {viewMode} <ChevronDown size={14}/>
              </button>
              {activeDropdown === 'view' && (
                <div className="absolute top-8 left-0 w-40 bg-white border shadow-lg rounded-md z-[60] py-1">
                  <button onClick={() => {setViewMode('Notes View'); setActiveDropdown(null)}} className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 flex items-center gap-2 font-bold text-gray-600"><ListIcon size={14}/> Notes View</button>
                </div>
              )}
           </div>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="bg-black text-white px-4 py-1.5 rounded-md flex items-center gap-2 hover:bg-gray-800 text-sm font-medium transition-all shadow-sm active:scale-95">
          <Plus size={16} /> Create
        </button>
      </div>

      {/* 2. Task Bar (Deals Layout Alignment) */}
      <div className="flex justify-between items-center bg-white px-4 py-2 border-b border-gray-100 sticky top-[68px] z-40">
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Search tasks..." 
              className="pl-10 pr-4 py-1.5 bg-gray-50 rounded-md text-sm w-72 outline-none border border-transparent focus:ring-1 focus:ring-purple-200 transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={handleRefresh} className={`p-2 hover:bg-gray-100 rounded-lg text-gray-400 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`}><RotateCcw size={18}/></button>
        </div>

        <div className="flex items-center gap-1">
          {/* Functional Popups */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'filter' ? null : 'filter')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm font-bold border border-transparent hover:border-gray-200"><Filter size={16}/> Filter</button>
            {activeDropdown === 'filter' && (
              <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 p-6 animate-in slide-in-from-top-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filters</p>
                <div className="space-y-1">
                  {['By Author', 'By Time', 'By Title'].map(f => (
                    <div key={f} className="p-2.5 hover:bg-purple-50 rounded-lg text-xs font-medium text-slate-600 cursor-pointer">{f}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm font-bold border border-transparent hover:border-gray-200"><ArrowUpDown size={16}/> Sort</button>
            {activeDropdown === 'sort' && (
              <div className="absolute right-0 top-10 w-64 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 p-4 animate-in slide-in-from-top-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-left">Sort by</p>
                <button onClick={() => handleSort('title')} className="w-full text-left p-2.5 hover:bg-purple-50 rounded-lg text-xs font-medium text-slate-600">Title</button>
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'cols' ? null : 'cols')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm font-bold border border-transparent hover:border-gray-200"><LayoutPanelLeft size={16}/> Elements</button>
            {activeDropdown === 'cols' && (
              <div className="absolute right-0 top-10 w-72 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-left">Display Elements</p>
                {Object.keys(visibleElements).map(el => (
                  <div key={el} className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors" onClick={() => setVisibleElements({...visibleElements, [el]: !visibleElements[el]})}>
                    <div className="flex items-center gap-3">
                      <MoreHorizontal size={14} className="text-slate-300 rotate-90" />
                      <span className="text-xs font-bold text-slate-600 capitalize text-left">{el}</span>
                    </div>
                    {visibleElements[el] && <Check size={14} className="text-purple-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button className="p-2 hover:bg-gray-100 rounded text-gray-500 transition-colors"><MoreHorizontal size={20}/></button>
        </div>
      </div>

      {/* 3. Main Notes Content */}
      <div className={`px-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-12 transition-opacity duration-300 ${isRefreshing ? 'opacity-30' : 'opacity-100'}`}>
        {filteredNotes.map((note) => (
          <div 
            key={note.id} 
            onClick={() => handleNoteClick(note)} 
            className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between h-64 cursor-pointer"
          >
            <div>
               <div className="flex justify-between items-start mb-4 text-left">
                 {visibleElements.title && <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-purple-700 transition-colors">{note.title}</h3>}
                 <div className="relative">
                    <button className="text-slate-200 hover:text-slate-400 p-1" onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === `note-${note.id}` ? null : `note-${note.id}`); }}>
                      <MoreHorizontal size={18}/>
                    </button>
                    {activeDropdown === `note-${note.id}` && (
                      <div className="absolute right-0 top-8 w-32 bg-white border border-slate-100 shadow-xl rounded-xl py-1 z-50">
                         <button onClick={(e) => handleDeleteTask(note.id, e)} className="w-full text-left px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2"><Trash2 size={14}/> Delete</button>
                      </div>
                    )}
                 </div>
               </div>
               {visibleElements.content && <p className="text-slate-400 text-sm font-medium leading-relaxed line-clamp-4 text-left">{note.content}</p>}
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
               <div className="w-8 h-8 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-xs font-black uppercase shadow-sm">{note.author.charAt(0)}</div>
               <div className="flex flex-col text-left">
                 <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">{note.author}</span>
                 <span className="text-[10px] text-slate-400 font-bold italic">{note.time}</span>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. EDIT NOTE MODAL (Functional as per Screenshot 105) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 text-left animate-in zoom-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-white sticky top-0">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Edit Note</h3>
              <X size={20} className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setIsEditModalOpen(false)} />
            </div>
            <form onSubmit={handleUpdateNote} className="p-8 space-y-6">
              <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Title *</label>
              <input type="text" required className="w-full border border-slate-200 p-3 rounded-xl bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100" value={formData.title} onChange={e=>setFormData({...formData, title:e.target.value})} /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Content</label>
              <textarea className="w-full border border-slate-200 p-4 rounded-2xl bg-gray-50/50 text-sm outline-none min-h-[160px]" value={formData.content} onChange={e=>setFormData({...formData, content:e.target.value})}></textarea></div>
              <div className="flex justify-end pt-4"><button type="submit" className="bg-black text-white px-10 py-3 rounded-xl font-bold text-sm shadow-xl active:scale-95 transition-all">Update</button></div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CREATE NOTE MODAL (Original Image Style) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-left animate-in zoom-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-white">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Create Note</h3>
              <X size={20} className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setIsCreateModalOpen(false)} />
            </div>
            <form onSubmit={handleSaveNote} className="p-8 space-y-6">
              <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Title *</label>
              <input type="text" required className="w-full border border-slate-200 p-3 rounded-xl bg-gray-50/50 text-sm outline-none" value={formData.title} onChange={e=>setFormData({...formData, title:e.target.value})} /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Content</label>
              <textarea className="w-full border border-slate-200 p-4 rounded-2xl bg-gray-50/50 text-sm outline-none min-h-[160px]" value={formData.content} onChange={e=>setFormData({...formData, content:e.target.value})}></textarea></div>
              <div className="flex justify-end pt-4"><button type="submit" className="bg-black text-white px-10 py-3 rounded-xl font-bold text-sm shadow-xl">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;