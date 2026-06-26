import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, LayoutList, Columns2, RotateCcw, Eye, Pencil, Trash2, MoreHorizontal, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import * as XLSX from 'xlsx';
import { apiFetch, peekCache } from '../api/client';
import { PageTransition, staggerContainer, staggerItem } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toast } from '../utils/toast';

const STATUS_LABELS = { new: 'New', contacted: 'Contacted', nurture: 'Nurture', qualified: 'Qualified', unqualified: 'Unqualified', junk: 'Junk' };
const STATUS_BADGE = { new: 'badge-muted', contacted: 'badge-accent', nurture: 'badge-success', qualified: 'badge-danger', unqualified: 'badge-purple', junk: 'badge-orange' };
const STATUS_ORDER = ['new', 'contacted', 'nurture', 'qualified', 'unqualified', 'junk'];
const MANUAL_LEAD_SOURCE = 'manual';
const normalizeStatus = (status) => (status || '').toString().trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
const mapLeadStatus = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'converted' || normalized === 'won') return 'qualified';
  if (normalized === 'lost') return 'unqualified';
  if (STATUS_ORDER.includes(normalized)) return normalized;
  return 'new';
};
const formatLeadStatus = (status) => STATUS_LABELS[normalizeStatus(status)] || status || 'Unknown';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const mapLeadToRow = (lead) => ({
  id: lead.id,
  name: lead.name,
  org: lead.company || '-',
  status: mapLeadStatus(lead.status),
  email: lead.email || '-',
  mobile: lead.phone || '-',
  modified: formatDate(lead.updated_at),
  ownerId: lead.owner_id || null,
});

const LEADS_INITIAL_PATH = '/api/leads/?skip=0&limit=20';

const Leads = ({ user }) => {
  const cachedLeads = peekCache(LEADS_INITIAL_PATH);
  const initialLeads = cachedLeads.hit ? cachedLeads.value.map(mapLeadToRow) : [];
  const [viewMode, setViewMode] = useState('table');
  const [leads, setLeads] = useState(initialLeads);
  const [loading, setLoading] = useState(!cachedLeads.hit);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const latestRequestId = useRef(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMenu, setActionMenu] = useState(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState(() => new Set());
  const [teamReps, setTeamReps] = useState([]);
  const [assigningMap, setAssigningMap] = useState({});
  const leadAssignStateRef = useRef(new Map());
  const lastConfirmedOwnerRef = useRef(new Map());
  const [draggingLeadId, setDraggingLeadId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [tbodyRef] = useAutoAnimate();

  const [formData, setFormData] = useState({
    salutation: '', firstName: '', lastName: '', email: '', mobile: '', organization: '', status: 'new'
  });

  const canDelete = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || (user?.role || '').toLowerCase().includes('manager');
  const canAssignLead = ['admin', 'sales_manager', 'manager'].includes((user?.role || '').toLowerCase());

  const resetForm = () => setFormData({ salutation: '', firstName: '', lastName: '', email: '', mobile: '', organization: '', status: 'new' });


  const openCreateModal = () => {
    setEditingLead(null);
    resetForm();
    setIsCreateModalOpen(true);
  };

  const closeLeadModal = () => {
    if (isSaving) return;
    setIsCreateModalOpen(false);
    setEditingLead(null);
    resetForm();
  };

  const openEditModal = (lead) => {
    const parts = String(lead.name || '').trim().split(/\s+/).filter(Boolean);
    setEditingLead(lead);
    setFormData({
      salutation: '',
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' '),
      email: lead.email === '-' ? '' : lead.email || '',
      mobile: lead.mobile === '-' ? '' : lead.mobile || '',
      organization: lead.org === '-' ? '' : lead.org || '',
      status: lead.status || 'new',
    });
    setIsCreateModalOpen(true);
  };

  const hasDataRef = useRef(initialLeads.length > 0);
  const fetchLeads = useCallback(async (skip = 0, append = false) => {
    const requestId = ++latestRequestId.current;
    if (append) setIsLoadingMore(true);
    else if (!hasDataRef.current) setLoading(true);
    setError('');
    try {
      const limit = append ? 10 : 20;
      const data = await apiFetch(`/api/leads/?skip=${skip}&limit=${limit}`);
      if (requestId !== latestRequestId.current) return;
      const mappedData = data.map(mapLeadToRow);
      if (append) setLeads((prev) => [...prev, ...mappedData]); else { setLeads(mappedData); hasDataRef.current = true; }
      mappedData.forEach((lead) => {
        lastConfirmedOwnerRef.current.set(String(lead.id), lead.ownerId || null);
      });
      setTotalLoaded((prev) => prev + mappedData.length);
      setHasMore(mappedData.length === limit);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err?.message || 'Unable to load leads.');
    } finally {
      if (requestId === latestRequestId.current) {
        if (!append) setLoading(false); else setIsLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => { fetchLeads(0, false); }, [fetchLeads]);
  useEffect(() => {
    const className = 'crm-kanban-active';
    if (viewMode === 'kanban') {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }
    return () => document.body.classList.remove(className);
  }, [viewMode]);
  useEffect(() => {
    let active = true;
    const fetchReps = async () => {
      if (!canAssignLead) return;
      try {
        const data = await apiFetch('/api/leads/assignment-reps');
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        const role = String(user?.role || '').toLowerCase();
        const assignableRoles = role === 'admin' ? ['manager', 'sales_manager'] : ['agent', 'sales_rep'];
        const reps = items.filter((u) => assignableRoles.includes((u.role || '').toLowerCase()));
        if (active) setTeamReps(reps);
      } catch {
        if (active) setTeamReps([]);
      }
    };
    fetchReps();
    return () => { active = false; };
  }, [canAssignLead]);

  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead) => [lead.name, lead.org, lead.email].some((v) => String(v).toLowerCase().includes(term)));
  }, [leads, searchTerm]);

  const handleSaveLead = async (e) => {
    e?.preventDefault();
    setError('');
    const name = [formData.firstName.trim(), formData.lastName.trim()].filter(Boolean).join(' ').trim();
    if (!name) { setError('First name is required.'); return; }
    const normalizedStatus = normalizeStatus(formData.status) || 'new';
    const payload = {
      name, email: formData.email.trim() || undefined, phone: formData.mobile.trim() || undefined,
      company: formData.organization.trim() || undefined, status: normalizedStatus, source: MANUAL_LEAD_SOURCE,
    };
    setIsSaving(true);
    try {
      if (editingLead?.id) {
        const updated = await apiFetch(`/api/leads/${editingLead.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        const mapped = mapLeadToRow(updated);
        setLeads((prev) => prev.map((lead) => (lead.id === editingLead.id ? { ...lead, ...mapped } : lead)));
        toast.success('Lead updated successfully.');
      } else {
        const created = await apiFetch('/api/leads/', { method: 'POST', body: JSON.stringify(payload) });
        setLeads((prev) => [mapLeadToRow(created), ...prev]);
        toast.success('Lead created successfully.');
      }
      setIsCreateModalOpen(false);
      setEditingLead(null);
      resetForm();
    } catch (err) {
      const message = err?.message || 'Unable to create lead.';
      setError(message);
      toast.error(message);
    }
    finally { setIsSaving(false); }
  };

  const requestDeleteLead = (lead) => {
    if (!canDelete) return;
    setDeleteTarget(lead);
  };

  const handleDeleteLead = async () => {
    if (!canDelete || !deleteTarget?.id) return;
    setError('');
    setIsDeleting(true);
    try {
      await apiFetch(`/api/leads/${deleteTarget.id}`, { method: 'DELETE' });
      setLeads((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      setSelectedLeadIds((prev) => {
        const next = new Set(prev);
        next.delete(String(deleteTarget.id));
        return next;
      });
      toast.success('Lead deleted.');
      setDeleteTarget(null);
    } catch (err) {
      const message = err?.message || 'Unable to delete lead.';
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const setLeadAssigning = (leadId, isAssigning) => {
    setAssigningMap((prev) => ({ ...prev, [leadId]: isAssigning }));
  };

  const sendLeadAssignment = async (leadId, repId, version) => {
    try {
      const updated = await apiFetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ owner_id: repId }),
      });

      const state = leadAssignStateRef.current.get(leadId);
      if (!state || state.version !== version) {
        return;
      }

      const mapped = mapLeadToRow(updated);
      lastConfirmedOwnerRef.current.set(leadId, mapped.ownerId || null);
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, ...mapped } : lead)));
      toast.success(`Lead assigned to ${getAssignedRepLabel(repId)}.`);
    } catch (err) {
      const state = leadAssignStateRef.current.get(leadId);
      if (!state || state.version !== version) {
        return;
      }
      const lastOwnerId = lastConfirmedOwnerRef.current.get(leadId) || null;
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, ownerId: lastOwnerId } : lead)));
      const message = err?.message || 'Unable to assign lead.';
      setError(message);
      toast.error(message);
    }
    const state = leadAssignStateRef.current.get(leadId);
    if (!state) return;
    if (state.queuedOwnerId && state.version > version) {
      const nextOwnerId = state.queuedOwnerId;
      const nextVersion = state.version;
      state.queuedOwnerId = null;
      state.inFlight = true;
      leadAssignStateRef.current.set(leadId, state);
      await sendLeadAssignment(leadId, nextOwnerId, nextVersion);
      return;
    }
    state.inFlight = false;
    state.queuedOwnerId = null;
    leadAssignStateRef.current.set(leadId, state);
    setLeadAssigning(leadId, false);
  };

  const handleAssignLead = async (leadId, repId) => {
    if (!repId) return;
    setError('');

    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, ownerId: repId } : lead)));
    setLeadAssigning(leadId, true);

    const existing = leadAssignStateRef.current.get(leadId) || {
      inFlight: false,
      queuedOwnerId: null,
      version: 0,
    };
    const nextVersion = existing.version + 1;
    existing.version = nextVersion;

    if (existing.inFlight) {
      existing.queuedOwnerId = repId;
      leadAssignStateRef.current.set(leadId, existing);
      return;
    }

    existing.inFlight = true;
    leadAssignStateRef.current.set(leadId, existing);
    await sendLeadAssignment(leadId, repId, nextVersion);
  };

  const getAssignedRepLabel = (ownerId) => {
    if (!ownerId) return 'Unassigned';
    const assignedRep = teamReps.find((rep) => rep.id === ownerId);
    if (assignedRep) return assignedRep.full_name || assignedRep.email || 'Assigned';
    if (String(user?.id || '') === String(ownerId)) {
      return user?.full_name || user?.email || 'Assigned';
    }
    return 'Assigned';
  };

  const handleLeadStatusChange = async (leadId, nextStatus) => {
    const normalized = normalizeStatus(nextStatus) || 'new';
    const current = leads.find((lead) => String(lead.id) === String(leadId));
    if (!current || current.status === normalized) return;
    const previousStatus = current.status;

    setLeads((prev) => prev.map((lead) => (
      lead.id === current.id ? { ...lead, status: normalized } : lead
    )));

    try {
      await apiFetch(`/api/leads/${current.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: normalized }),
      });
      toast.success(`Lead moved to ${formatLeadStatus(normalized)}.`);
    } catch (err) {
      setLeads((prev) => prev.map((lead) => (
        lead.id === current.id ? { ...lead, status: previousStatus } : lead
      )));
      const message = err?.message || 'Unable to update lead status.';
      setError(message);
      toast.error(message);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(leads);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "CRM_Leads.xlsx");
  };


  const visibleLeadIds = useMemo(() => filteredLeads.map((lead) => String(lead.id)), [filteredLeads]);
  const selectedVisibleCount = visibleLeadIds.filter((id) => selectedLeadIds.has(id)).length;
  const allVisibleSelected = visibleLeadIds.length > 0 && selectedVisibleCount === visibleLeadIds.length;

  const toggleSelectAllVisible = (checked) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      visibleLeadIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const toggleLeadSelection = (id, checked) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(String(id));
      else next.delete(String(id));
      return next;
    });
  };

  const groupedLeads = useMemo(() => {
    const groups = STATUS_ORDER.reduce((acc, status) => {
      acc[status] = leads.filter((lead) => lead.status === status);
      return acc;
    }, {});
    return groups;
  }, [leads]);

  return (
    <PageTransition>
      <div className={viewMode === 'kanban' ? 'crm-page crm-page-kanban' : 'crm-page'}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 className="page-title">Leads</h1>
            <div style={{ display: 'flex', gap: 2, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius)', padding: 2, border: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'}
                aria-label="Table view"
              >
                <LayoutList size={14} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={viewMode === 'kanban' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'}
                aria-label="Kanban view"
              >
                <Columns2 size={14} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => { setTotalLoaded(0); fetchLeads(0, false); }} className="btn btn-ghost btn-icon" aria-label="Refresh leads">
              <RotateCcw size={16} />
            </button>
            <button onClick={exportToExcel} className="btn btn-secondary btn-sm" aria-label="Export leads">
              <Download size={14} /> Export
            </button>
            <button onClick={openCreateModal} className="btn btn-primary">
              <Plus size={15} /> Add Lead
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input type="text" placeholder="Search leads..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>


        {error && <div className="alert alert-danger">{error}</div>}

        {selectedLeadIds.size > 0 && (
          <div className="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{selectedLeadIds.size} lead{selectedLeadIds.size === 1 ? '' : 's'} selected</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedLeadIds(new Set())}>Clear selection</button>
          </div>
        )}

        {loading ? <SkeletonTable rows={8} cols={7} /> : (
          <>
            {/* TABLE VIEW */}
            {viewMode === 'table' && (
              filteredLeads.length === 0 ? <EmptyState type="leads" /> : (
                <div className="card">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}><input type="checkbox" className="checkbox-input" checked={allVisibleSelected} onChange={(e) => toggleSelectAllVisible(e.target.checked)} aria-label="Select all visible leads" /></th>
                        <th>Name</th>
                        <th>Organization</th>
                        <th>Status</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Assigned To</th>
                        <th>Modified</th>
                        <th style={{ width: 60, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <motion.tbody ref={tbodyRef} variants={staggerContainer} initial="initial" animate="animate">
                      {filteredLeads.map((l) => (
                        <motion.tr key={l.id} variants={staggerItem} className={selectedLeadIds.has(String(l.id)) ? 'row-selected' : undefined}>
                          <td><input type="checkbox" className="checkbox-input" checked={selectedLeadIds.has(String(l.id))} onChange={(e) => toggleLeadSelection(l.id, e.target.checked)} aria-label={`Select ${l.name}`} /></td>
                          <td style={{ fontWeight: 'var(--weight-medium)' }}>
                            <Link
                              to={`/leads/${l.id}`}
                              style={{ color: 'inherit', textDecoration: 'none' }}
                            >
                              {l.name}
                            </Link>
                          </td>
                          <td style={{ color: 'var(--color-text-secondary)' }}>{l.org}</td>
                          <td><span className={`badge ${STATUS_BADGE[l.status] || 'badge-muted'}`}>{formatLeadStatus(l.status)}</span></td>
                          <td style={{ color: 'var(--color-text-secondary)' }}>{l.email}</td>
                          <td style={{ color: 'var(--color-text-secondary)' }}>{l.mobile}</td>
                          <td>
                            {canAssignLead ? (
                              <div>
                                <select
                                  className="input"
                                  value={l.ownerId || ''}
                                  onChange={(e) => handleAssignLead(l.id, e.target.value)}
                                  style={{ minWidth: 170, height: 34, padding: '0 10px' }}
                                >
                                  <option value="">Unassigned</option>
                                  {teamReps.map((rep) => (
                                    <option key={rep.id} value={rep.id}>
                                      {rep.full_name || rep.email}
                                    </option>
                                  ))}
                                </select>
                                {assigningMap[l.id] && (
                                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                                    Saving...
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--color-text-secondary)' }}>
                                {getAssignedRepLabel(l.ownerId)}
                              </span>
                            )}
                          </td>
                          <td style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>{l.modified}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <button
                                className="btn btn-ghost btn-icon"
                                onClick={() => setActionMenu(actionMenu === l.id ? null : l.id)}
                                aria-label="Row actions"
                              >
                                <MoreHorizontal size={14} />
                              </button>
                              {actionMenu === l.id && (
                                <div className="dropdown-menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)' }}>
                                  <button className="dropdown-item" onClick={() => { navigate(`/leads/${l.id}`); setActionMenu(null); }}>
                                    <Eye size={14} /> View
                                  </button>
                                  {canEdit && (
                                    <button className="dropdown-item" onClick={() => { openEditModal(l); setActionMenu(null); }}>
                                      <Pencil size={14} /> Edit
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button className="dropdown-item dropdown-item-danger" onClick={() => { requestDeleteLead(l); setActionMenu(null); }}>
                                      <Trash2 size={14} /> Delete
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>
              )
            )}

            {/* KANBAN VIEW */}
            {viewMode === 'kanban' && (
              <div className="kanban-board">
                {Object.entries(groupedLeads).map(([status, items]) => (
                  <div
                    key={status}
                    className={`kanban-column${dragOverStatus === status ? ' drag-over' : ''}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      setDragOverStatus(status);
                    }}
                    onDragLeave={() => setDragOverStatus(null)}
                    onDrop={(event) => {
                      event.preventDefault();
                      const leadId = event.dataTransfer.getData('text/plain');
                      if (leadId) {
                        handleLeadStatusChange(leadId, status);
                      }
                      setDraggingLeadId(null);
                      setDragOverStatus(null);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span className={`badge ${STATUS_BADGE[status] || 'badge-muted'}`}>{STATUS_LABELS[status] || 'Other'}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{items.length}</span>
                    </div>
                    <div className="kanban-column-body">
                      {items.map((l) => (
                        <div
                          key={l.id}
                          className={`kanban-card${draggingLeadId === l.id ? ' dragging' : ''}`}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/plain', String(l.id));
                            event.dataTransfer.effectAllowed = 'move';
                            setDraggingLeadId(l.id);
                          }}
                          onDragEnd={() => setDraggingLeadId(null)}
                        >
                          <div style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-base)', marginBottom: 4 }}>{l.name}</div>
                          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{l.org}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 6 }}>{l.email}</div>
                          {canDelete && (
                            <button onClick={() => requestDeleteLead(l)} className="btn btn-danger btn-sm" style={{ marginTop: 8 }}>
                              <Trash2 size={12} /> Delete
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* LOAD MORE */}
            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <button onClick={() => fetchLeads(totalLoaded, true)} disabled={isLoadingMore} className="btn btn-secondary">
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}


        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete lead?"
          message={deleteTarget ? `This will permanently delete "${deleteTarget.name}". This action cannot be undone.` : 'This action cannot be undone.'}
          confirmLabel="Delete lead"
          isLoading={isDeleting}
          onCancel={() => { if (!isDeleting) setDeleteTarget(null); }}
          onConfirm={handleDeleteLead}
        />

        {/* CREATE MODAL */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeLeadModal}
            >
              <motion.div
                className="modal-content dialog-content-enter"
                style={{ maxWidth: 560 }}
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.97, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                  <h3 className="section-title">{editingLead ? 'Edit Lead' : 'Create Lead'}</h3>
                  <button onClick={closeLeadModal} className="btn btn-ghost btn-icon" aria-label="Close">
                    <X size={18} />
                  </button>
                </div>

                <form id="create-lead-form" onSubmit={handleSaveLead} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '60vh', overflowY: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="label">First Name *</label>
                      <input type="text" required placeholder="First name" className="input" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Last Name</label>
                      <input type="text" placeholder="Last name" className="input" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="label">Email</label>
                      <input type="email" placeholder="email@company.com" className="input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input type="text" placeholder="Phone number" className="input" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="label">Organization</label>
                      <input type="text" placeholder="Company name" className="input" value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select
                        className="input"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        {STATUS_ORDER.map((status) => (
                          <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </form>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
                  <button type="button" onClick={closeLeadModal} className="btn btn-ghost">Discard</button>
                  <button type="submit" form="create-lead-form" disabled={isSaving} className="btn btn-primary">
                    {isSaving ? (editingLead ? 'Saving...' : 'Creating...') : (editingLead ? 'Save Changes' : 'Create Lead')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default Leads;
