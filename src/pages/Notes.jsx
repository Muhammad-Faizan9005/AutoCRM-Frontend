import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, X, Check, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react';

const Notes = () => {
  // --- STATES ---
  const [notes, setNotes] = useState([
    { id: 1, title: 'Aslam Industries called', content: 'They asked about products', author: 'Admin', time: '1 week ago' },
    { id: 2, title: 'Follow up with Binance', content: 'Discussed the Q1 roadmap', author: 'Admin', time: '2 days ago' },
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [visibleElements, setVisibleElements] = useState({ title: true, content: true, author: true, time: true });
  const [formData, setFormData] = useState({ title: '', content: '' });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- FILTER / SORT ---
  const filteredNotes = useMemo(() => notes.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase())), [notes, searchTerm]);
  const handleSort = (key) => setNotes([...notes].sort((a,b) => String(a[key]).localeCompare(String(b[key]))));

  // --- CRUD FUNCTIONS ---
  const handleNoteClick = (note) => { setSelectedNote(note); setFormData({ title: note.title, content: note.content }); setIsEditModalOpen(true); };
  const handleDeleteNote = (id) => { if(window.confirm('Delete this note?')) setNotes(notes.filter(n => n.id !== id)); setActiveDropdown(null); };
  const handleSaveNote = (e) => { e.preventDefault(); setNotes([{ id: Date.now(), ...formData, author:'Admin', time:'Just now'}, ...notes]); setIsCreateModalOpen(false); setFormData({title:'',content:''}); };
  const handleUpdateNote = (e) => { e.preventDefault(); setNotes(notes.map(n => n.id===selectedNote.id ? {...n,...formData} : n)); setIsEditModalOpen(false); };

  const handleRefresh = () => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false),1000); };

  return (
    <div className="min-h-screen p-4 bg-gray-50 font-sans space-y-4 text-sm">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-black">Notes</h1>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className={`p-2 bg-white border rounded hover:bg-gray-100 ${isRefreshing?'animate-spin text-purple-600':''}`}><RotateCcw size={18}/></button>
          <button onClick={()=>setIsCreateModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-900 font-semibold"><Plus size={16}/> Create</button>
        </div>
      </div>

      {/* SEARCH + ACTIONS */}
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2 text-gray-400" size={16}/>
          <input type="text" placeholder="Search notes..." className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 w-full text-xs" onChange={e=>setSearchTerm(e.target.value)} />
        </div>

        <div className="flex gap-2">
          {/* FILTER */}
          <div className="relative">
            <button onClick={()=>setActiveDropdown(activeDropdown==='filter'?null:'filter')} className="px-2 py-1 border rounded bg-white text-xs flex gap-1 items-center"><Filter size={14}/> Filter</button>
            {activeDropdown==='filter' && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border rounded shadow z-50 text-xs">
                {['By Author','By Time'].map(f=><div key={f} className="p-2 hover:bg-gray-100 cursor-pointer">{f}</div>)}
              </div>
            )}
          </div>

          {/* SORT */}
          <div className="relative">
            <button onClick={()=>setActiveDropdown(activeDropdown==='sort'?null:'sort')} className="px-2 py-1 border rounded bg-white text-xs flex gap-1 items-center"><ArrowUpDown size={14}/> Sort</button>
            {activeDropdown==='sort' && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border rounded shadow z-50 text-xs">
                {['title','author','time'].map(s=><div key={s} onClick={()=>handleSort(s)} className="p-2 hover:bg-gray-100 cursor-pointer capitalize">{s}</div>)}
              </div>
            )}
          </div>

          {/* ELEMENTS */}
          <div className="relative">
            <button onClick={()=>setActiveDropdown(activeDropdown==='cols'?null:'cols')} className="px-2 py-1 border rounded bg-white text-xs flex gap-1 items-center"><LayoutPanelLeft size={14}/> Elements</button>
            {activeDropdown==='cols' && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border rounded shadow z-50 text-xs p-2">
                {Object.keys(visibleElements).map(el=>(
                  <div key={el} className="flex justify-between p-1 hover:bg-gray-100 cursor-pointer capitalize" onClick={()=>setVisibleElements({...visibleElements,[el]:!visibleElements[el]})}>
                    {el} {visibleElements[el] && <Check size={14} className="text-purple-600"/>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NOTES CARD VIEW */}
      <div className={`grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-12 transition-opacity duration-300 ${isRefreshing ? 'opacity-30' : 'opacity-100'}`}>
        {filteredNotes.map(note=>(
          <div key={note.id} className="bg-white p-6 rounded-2xl border border-gray-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer" onClick={()=>handleNoteClick(note)}>
            <div>
              {visibleElements.title && <h3 className="font-bold text-gray-800 text-lg mb-2">{note.title}</h3>}
              {visibleElements.content && <p className="text-gray-400 text-sm line-clamp-4 mb-4">{note.content}</p>}
            </div>
            <div className="flex justify-between items-center text-gray-400 text-[10px]">
              {visibleElements.author && <span>{note.author}</span>}
              {visibleElements.time && <span>{note.time}</span>}
              <button onClick={(e)=>{e.stopPropagation(); handleDeleteNote(note.id)}} className="text-red-500"><Trash2 size={14}/></button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE NOTE MODAL (SMALLER) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Create Note</h3>
              <X size={20} className="cursor-pointer" onClick={()=>setIsCreateModalOpen(false)}/>
            </div>
            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase mb-1 block">Title *</label>
                <input type="text" required className="w-full border p-2.5 rounded-lg text-sm outline-none" value={formData.title} onChange={e=>setFormData({...formData,title:e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase mb-1 block">Content</label>
                <textarea className="w-full border p-3 rounded-lg text-sm outline-none min-h-[120px]" value={formData.content} onChange={e=>setFormData({...formData,content:e.target.value})}></textarea>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-black text-white px-8 py-2 rounded-lg font-bold text-sm">Create</button></div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT NOTE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Note</h3>
              <X size={20} className="cursor-pointer" onClick={()=>setIsEditModalOpen(false)}/>
            </div>
            <form onSubmit={handleUpdateNote} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase mb-1 block">Title *</label>
                <input type="text" required className="w-full border p-2.5 rounded-lg text-sm outline-none" value={formData.title} onChange={e=>setFormData({...formData,title:e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase mb-1 block">Content</label>
                <textarea className="w-full border p-3 rounded-lg text-sm outline-none min-h-[120px]" value={formData.content} onChange={e=>setFormData({...formData,content:e.target.value})}></textarea>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-black text-white px-8 py-2 rounded-lg font-bold text-sm">Update</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Notes;
