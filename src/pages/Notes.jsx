import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, RotateCcw, Trash2, X, StickyNote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { apiFetch } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';

const NOTE_BORDERS = ['note-border-accent', 'note-border-success', 'note-border-warning'];

const formatDate = (value) => {
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

const buildTitle = (content) => {
  const first = String(content || '').split('\n')[0];
  if (!first) return 'Untitled';
  return first.length > 60 ? `${first.slice(0, 60)}...` : first;
};

const splitContent = (content) => {
  const [first, ...rest] = String(content || '').split('\n');
  return { title: first || '', body: rest.join('\n').trim() };
};

const mapNote = (note, uid, leadDirectory) => ({
  id: note.id,
  title: buildTitle(note.content),
  content: note.content,
  leadId: String(note.entity_id),
  leadName: leadDirectory[String(note.entity_id)] || `Lead ${String(note.entity_id).slice(0, 8)}`,
  author: !note.author_id ? 'Unknown' : (uid && String(note.author_id) === String(uid)) ? 'You' : String(note.author_id).slice(0, 8),
  time: formatDate(note.updated_at || note.created_at),
});

const Notes = ({ user }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [modalType, setModalType] = useState(null); // create | edit | null
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [leadOptions, setLeadOptions] = useState([]);
  const [leadDirectory, setLeadDirectory] = useState({});
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const latestRequestId = useRef(0);
  const leadDirectoryRef = useRef({});
  const [gridRef] = useAutoAnimate();
  const uid = user?.id;

  const fetchNotes = useCallback(async (skip = 0, append = false, directory) => {
    const rid = ++latestRequestId.current;
    if (!append) setLoading(true);
    else setIsLoadingMore(true);
    setError('');
    try {
      const activeDirectory = directory || leadDirectoryRef.current;
      const limit = append ? 10 : 20;
      const data = await apiFetch(`/api/notes/?entity_type=lead&skip=${skip}&limit=${limit}`);
      if (rid !== latestRequestId.current) return;
      const mapped = data.map((note) => mapNote(note, uid, activeDirectory));
      if (append) setNotes((prev) => [...prev, ...mapped]);
      else setNotes(mapped);
      setTotalLoaded((prev) => prev + mapped.length);
      setHasMore(mapped.length === limit);
    } catch (err) {
      if (rid === latestRequestId.current) setError(err?.message || 'Unable to load notes.');
    } finally {
      if (rid === latestRequestId.current) {
        if (!append) setLoading(false);
        else setIsLoadingMore(false);
      }
    }
  }, [uid]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const leads = await apiFetch('/api/leads/?skip=0&limit=500');
        const options = (Array.isArray(leads) ? leads : []).map((lead) => ({
          id: String(lead.id),
          name: lead.name || 'Untitled lead',
        }));
        const directory = {};
        options.forEach((lead) => { directory[lead.id] = lead.name; });
        if (!mounted) return;
        setLeadOptions(options);
        setLeadDirectory(directory);
        leadDirectoryRef.current = directory;
        if (options.length) setSelectedLeadId(options[0].id);
        await fetchNotes(0, false, directory);
      } catch (err) {
        if (mounted) setError(err?.message || 'Unable to load lead notes.');
      }
    })();
    return () => { mounted = false; };
  }, [fetchNotes]);

  const filtered = useMemo(
    () => notes.filter((n) => n.title.toLowerCase().includes(searchTerm.toLowerCase())),
    [notes, searchTerm]
  );

  const openEdit = (note) => {
    const { title, body } = splitContent(note.content);
    setSelectedNote(note);
    setSelectedLeadId(note.leadId);
    setFormData({ title, content: body });
    setModalType('edit');
  };

  const openCreate = () => {
    setFormData({ title: '', content: '' });
    if (leadOptions.length) setSelectedLeadId(leadOptions[0].id);
    setModalType('create');
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedNote(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await apiFetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err?.message || 'Delete failed.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    const combined = [formData.title.trim(), formData.content.trim()].filter(Boolean).join('\n');
    if (!combined) { setError('Content required.'); return; }
    if (!selectedLeadId) { setError('Please select a lead.'); return; }
    setIsSaving(true);
    try {
      const created = await apiFetch('/api/notes/', {
        method: 'POST',
        body: JSON.stringify({ entity_type: 'lead', entity_id: selectedLeadId, content: combined }),
      });
      setNotes((prev) => [mapNote(created, uid, leadDirectoryRef.current), ...prev]);
      closeModal();
    } catch (err) {
      setError(err?.message || 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedNote?.id) return;
    setError('');
    const combined = [formData.title.trim(), formData.content.trim()].filter(Boolean).join('\n');
    if (!combined) { setError('Content required.'); return; }
    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/notes/${selectedNote.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: combined }),
      });
      setNotes((prev) => prev.map((n) => (n.id === selectedNote.id ? mapNote(updated, uid, leadDirectoryRef.current) : n)));
      closeModal();
    } catch (err) {
      setError(err?.message || 'Update failed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="page-title">Notes</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fetchNotes(0, false, leadDirectoryRef.current)} className="btn btn-ghost btn-icon" aria-label="Refresh"><RotateCcw size={16} /></button>
            <button onClick={openCreate} className="btn btn-primary"><Plus size={15} /> New Note</button>
          </div>
        </div>

        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input type="text" placeholder="Search notes..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {error && <div style={{ padding: 12, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>{error}</div>}

        {loading ? (
          <div className="masonry-grid">{[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState type="notes" />
        ) : (
          <div ref={gridRef} className="masonry-grid">
            {filtered.map((note, idx) => (
              <motion.div key={note.id} className={`card ${NOTE_BORDERS[idx % 3]}`} style={{ padding: 16, cursor: 'pointer' }} onClick={() => openEdit(note)} whileHover={{ scale: 1.01 }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-md)' }}>{note.title}</h3>
                  <StickyNote size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{note.content}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{note.leadName} - {note.author} - {note.time}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }} className="btn btn-ghost btn-icon" style={{ width: 24, height: 24, padding: 2 }} aria-label="Delete"><Trash2 size={12} style={{ color: 'var(--color-danger)' }} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => fetchNotes(totalLoaded, true)} disabled={isLoadingMore} className="btn btn-secondary">{isLoadingMore ? 'Loading...' : 'Load More'}</button>
          </div>
        )}

        <AnimatePresence>
          {modalType && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal}>
              <motion.div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.97, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                  <h3 className="section-title">{modalType === 'create' ? 'Create Note' : 'Edit Note'}</h3>
                  <button onClick={closeModal} className="btn btn-ghost btn-icon" aria-label="Close"><X size={18} /></button>
                </div>
                <form onSubmit={modalType === 'create' ? handleSave : handleUpdate} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {modalType === 'create' && (
                    <div>
                      <label className="label">Linked Lead</label>
                      <select className="input" value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)} required>
                        <option value="">Select lead</option>
                        {leadOptions.map((lead) => (
                          <option key={lead.id} value={lead.id}>{lead.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div><label className="label">Title</label><input type="text" className="input" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></div>
                  <div><label className="label">Content</label><textarea className="input" style={{ minHeight: 120 }} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} /></div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" disabled={isSaving} className="btn btn-primary">{isSaving ? 'Saving...' : modalType === 'create' ? 'Create' : 'Update'}</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button className="btn btn-primary" onClick={openCreate} whileHover={{ scale: 1.05 }} aria-label="Create note" style={{ position: 'fixed', bottom: 32, right: 32, width: 48, height: 48, borderRadius: '50%', padding: 0, boxShadow: 'var(--shadow-lg)', zIndex: 40 }}>
          <Plus size={20} />
        </motion.button>
      </div>
    </PageTransition>
  );
};

export default Notes;
