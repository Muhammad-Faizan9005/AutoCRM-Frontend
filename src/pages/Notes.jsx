import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, RotateCcw, Trash2, X, StickyNote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { apiFetch, peekCache } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';
import { EntityCard } from '../components/EntityCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toast } from '../utils/toast';

const CARD_ACCENTS = ['note-border-accent', 'note-border-success', 'note-border-warning'];

const CARD_GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20, alignItems: 'stretch' };

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
  leadName: leadDirectory[String(note.entity_id)] || 'Loading lead...',
  author: !note.author_id ? 'Unknown' : (uid && String(note.author_id) === String(uid)) ? 'You' : 'Team member',
  time: formatDate(note.updated_at || note.created_at),
  source: note.source || 'manual',
  aiReason: note.ai_reason || '',
});

const NOTES_LEADS_PATH = '/api/leads/?skip=0&limit=500';
const NOTES_INITIAL_PATH = '/api/notes/?entity_type=lead&skip=0&limit=20';

const buildLeadDirectory = (leads) => {
  const options = (Array.isArray(leads) ? leads : []).map((lead) => ({
    id: String(lead.id),
    name: lead.name || 'Untitled lead',
  }));
  const directory = {};
  options.forEach((lead) => { directory[lead.id] = lead.name; });
  return { options, directory };
};

const Notes = ({ user }) => {
  const cachedLeads = peekCache(NOTES_LEADS_PATH);
  const cachedNotes = peekCache(NOTES_INITIAL_PATH);
  const initialDir = cachedLeads.hit ? buildLeadDirectory(cachedLeads.value) : { options: [], directory: {} };
  const initialNotes = (cachedNotes.hit ? cachedNotes.value : []).map((note) => mapNote(note, user?.id, initialDir.directory));
  const [notes, setNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(!(cachedLeads.hit && cachedNotes.hit));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [modalType, setModalType] = useState(null); // create | edit | null
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [leadOptions, setLeadOptions] = useState(initialDir.options);
  const [selectedLeadId, setSelectedLeadId] = useState(initialDir.options[0]?.id || '');
  const latestRequestId = useRef(0);
  const leadDirectoryRef = useRef(initialDir.directory);
  const hasDataRef = useRef(initialNotes.length > 0 || (cachedLeads.hit && cachedNotes.hit));
  const [gridRef] = useAutoAnimate();
  const uid = user?.id;

  const fetchNotes = useCallback(async (skip = 0, append = false, directory) => {
    const rid = ++latestRequestId.current;
    if (append) setIsLoadingMore(true);
    else if (!hasDataRef.current) setLoading(true);
    setError('');
    try {
      const activeDirectory = directory || leadDirectoryRef.current;
      const limit = append ? 10 : 20;
      const data = await apiFetch(`/api/notes/?entity_type=lead&skip=${skip}&limit=${limit}`);
      if (rid !== latestRequestId.current) return;
      const mapped = data.map((note) => mapNote(note, uid, activeDirectory));
      if (append) setNotes((prev) => [...prev, ...mapped]);
      else { setNotes(mapped); hasDataRef.current = true; }
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
        const leads = await apiFetch(NOTES_LEADS_PATH);
        const { options, directory } = buildLeadDirectory(leads);
        if (!mounted) return;
        setLeadOptions(options);
        leadDirectoryRef.current = directory;
        setNotes((prev) => prev.map((note) => ({ ...note, leadName: directory[String(note.leadId)] || note.leadName || 'Loading lead...' })));
        if (options.length) setSelectedLeadId((prev) => prev || options[0].id);
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

  const requestDelete = (note) => {
    setDeleteTarget(note);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/notes/${deleteTarget.id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      toast.success('Note deleted.');
      setDeleteTarget(null);
    } catch (err) {
      const message = err?.message || 'Delete failed.';
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
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
      const leadName = leadDirectoryRef.current[selectedLeadId] || 'lead';
      toast.success(`Note added for ${leadName}.`);
    } catch (err) {
      const message = err?.message || 'Save failed.';
      setError(message);
      toast.error(message);
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
      toast.success('Note updated successfully.');
    } catch (err) {
      const message = err?.message || 'Update failed.';
      setError(message);
      toast.error(message);
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

        {error && <div className="alert alert-danger">{error}</div>}


        {loading ? (
          <div style={CARD_GRID_STYLE}>{[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState type="notes" />
        ) : (
          <div ref={gridRef} style={CARD_GRID_STYLE}>
            {filtered.map((note, idx) => (
              <EntityCard
                key={note.id}
                title={note.title}
                description={note.source === 'ai' && note.aiReason ? `${note.content || ''}${note.content ? '\n\n' : ''}AI reason: ${note.aiReason}` : note.content}
                descriptionFallback="No note content added."
                accentClass={CARD_ACCENTS[idx % CARD_ACCENTS.length]}
                onClick={() => openEdit(note)}
                clampDescription
                iconSlot={<StickyNote size={14} style={{ color: 'var(--color-text-tertiary)' }} />}
                badges={[
                  { label: note.leadName },
                  { label: note.author },
                  { label: note.time },
                  note.source === 'ai' ? { label: 'AI Generated', className: 'badge-purple' } : null,
                ]}
                actions={(
                  <button
                    onClick={(e) => { e.stopPropagation(); requestDelete(note); }}
                    className="btn btn-ghost btn-icon"
                    style={{ width: 24, height: 24, padding: 2 }}
                    aria-label="Delete"
                  >
                    <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                  </button>
                )}
              />
            ))}
          </div>
        )}

        {!loading && hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => fetchNotes(totalLoaded, true)} disabled={isLoadingMore} className="btn btn-secondary">{isLoadingMore ? 'Loading...' : 'Load More'}</button>
          </div>
        )}


        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete note?"
          message={deleteTarget ? `This will permanently delete the note "${deleteTarget.title}". This action cannot be undone.` : 'This action cannot be undone.'}
          confirmLabel="Delete note"
          isLoading={isDeleting}
          onCancel={() => { if (!isDeleting) setDeleteTarget(null); }}
          onConfirm={handleDelete}
        />

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
