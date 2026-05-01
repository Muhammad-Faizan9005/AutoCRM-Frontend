import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, X, Check, RotateCcw, Trash2 } from 'lucide-react';
import { apiFetch } from '../api/client';

const DEFAULT_ENTITY_TYPE = 'general';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const formatAuthor = (authorId, currentUserId) => {
  if (!authorId) return 'Unknown';
  if (currentUserId && String(authorId) === String(currentUserId)) return 'You';
  return String(authorId).slice(0, 8);
};

const buildTitle = (content) => {
  const firstLine = String(content || '').split('\n')[0];
  if (!firstLine) return 'Untitled note';
  return firstLine.length > 60 ? `${firstLine.slice(0, 60)}...` : firstLine;
};

const splitContent = (content) => {
  const [firstLine, ...rest] = String(content || '').split('\n');
  return {
    title: firstLine || '',
    body: rest.join('\n').trim(),
  };
};

const mapNoteToCard = (note, currentUserId) => ({
  id: note.id,
  title: buildTitle(note.content),
  content: note.content,
  author: formatAuthor(note.author_id, currentUserId),
  time: formatDate(note.updated_at || note.created_at),
});

const Notes = ({ user }) => {
  // --- STATES ---
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const latestRequestId = useRef(0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [visibleElements, setVisibleElements] = useState({ title: true, content: true, author: true, time: true });
  const [formData, setFormData] = useState({ title: '', content: '' });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentUserId = user?.id;

  const resetForm = () => setFormData({ title: '', content: '' });

  const fetchNotes = useCallback(async (skip = 0, append = false) => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    
    if (!append) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError('');

    try {
      const limit = append ? 10 : 20;
      const data = await apiFetch(`/api/notes/?skip=${skip}&limit=${limit}`);
      if (requestId !== latestRequestId.current) return;
      
      const mappedData = data.map((note) => mapNoteToCard(note, currentUserId));
      
      if (append) {
        setNotes((prev) => [...prev, ...mappedData]);
      } else {
        setNotes(mappedData);
      }
      
      setTotalLoaded((prev) => prev + mappedData.length);
      setHasMore(mappedData.length === limit);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err?.message || 'Unable to load notes.');
    } finally {
      if (requestId === latestRequestId.current) {
        if (!append) {
          setLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchNotes(0, false);
  }, [fetchNotes]);

  // --- FILTER / SORT ---
  const filteredNotes = useMemo(() => notes.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase())), [notes, searchTerm]);
  const handleSort = (key) => setNotes([...notes].sort((a,b) => String(a[key]).localeCompare(String(b[key]))));

  const handleLoadMore = async () => {
    await fetchNotes(totalLoaded, true);
  };
  const handleNoteClick = (note) => {
    const { title, body } = splitContent(note.content);
    setSelectedNote(note);
    setFormData({ title, content: body });
    setIsEditModalOpen(true);
  };

  const handleDeleteNote = async (id) => {
    const confirmed = window.confirm('Delete this note?');
    if (!confirmed) return;

    setError('');
    try {
      await apiFetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((note) => note.id !== id));
      setActiveDropdown(null);
    } catch (err) {
      setError(err?.message || 'Unable to delete note.');
    }
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    setError('');

    const title = formData.title.trim();
    const body = formData.content.trim();
    const combinedContent = title ? [title, body].filter(Boolean).join('\n') : body;

    if (!combinedContent) {
      setError('Note content is required.');
      return;
    }
    if (!currentUserId) {
      setError('Unable to identify current user for notes.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        entity_type: DEFAULT_ENTITY_TYPE,
        entity_id: currentUserId,
        content: combinedContent,
      };

      const created = await apiFetch('/api/notes/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setNotes((prev) => [mapNoteToCard(created, currentUserId), ...prev]);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err?.message || 'Unable to create note.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNote = async (e) => {
    e.preventDefault();
    if (!selectedNote?.id) return;
    setError('');

    const title = formData.title.trim();
    const body = formData.content.trim();
    const combinedContent = title ? [title, body].filter(Boolean).join('\n') : body;

    if (!combinedContent) {
      setError('Note content is required.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/notes/${selectedNote.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: combinedContent }),
      });

      setNotes((prev) => prev.map((note) => (
        note.id === selectedNote.id ? mapNoteToCard(updated, currentUserId) : note
      )));
      setIsEditModalOpen(false);
    } catch (err) {
      setError(err?.message || 'Unable to update note.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotes();
    setIsRefreshing(false);
  };

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

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-xs text-gray-500">Loading notes...</div>
      )}

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

      {/* LOAD MORE BUTTON */}
      {!loading && hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
          >
            {isLoadingMore ? 'Loading more...' : 'Load More'}
          </button>
        </div>
      )}

      {!loading && filteredNotes.length === 0 && (
        <div className="text-xs text-gray-500">No notes found.</div>
      )}

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
              <div className="flex justify-end"><button type="submit" disabled={isSaving} className="bg-black text-white px-8 py-2 rounded-lg font-bold text-sm disabled:opacity-60">{isSaving ? 'Creating...' : 'Create'}</button></div>
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
              <div className="flex justify-end"><button type="submit" disabled={isSaving} className="bg-black text-white px-8 py-2 rounded-lg font-bold text-sm disabled:opacity-60">{isSaving ? 'Updating...' : 'Update'}</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Notes;
