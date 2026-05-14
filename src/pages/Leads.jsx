import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, LayoutList, Columns2, RotateCcw, Eye, Pencil, Trash2, MoreHorizontal, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../api/client';
import { PageTransition, staggerContainer, staggerItem } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';

const STATUS_LABELS = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', converted: 'Converted' };
const STATUS_BADGE = { new: 'badge-accent', contacted: 'badge-warning', qualified: 'badge-success', converted: 'badge-muted' };
const normalizeStatus = (status) => (status || '').toString().trim().toLowerCase();
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
  status: normalizeStatus(lead.status) || 'new',
  email: lead.email || '-',
  mobile: lead.phone || '-',
  modified: formatDate(lead.updated_at),
});

const Leads = ({ user }) => {
  const [viewMode, setViewMode] = useState('table');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const latestRequestId = useRef(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMenu, setActionMenu] = useState(null);
  const [tbodyRef] = useAutoAnimate();

  const [formData, setFormData] = useState({
    salutation: '', firstName: '', lastName: '', email: '', mobile: '', organization: '', status: 'New'
  });

  const canDelete = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || (user?.role || '').toLowerCase().includes('manager');

  const resetForm = () => setFormData({ salutation: '', firstName: '', lastName: '', email: '', mobile: '', organization: '', status: 'New' });

  const fetchLeads = useCallback(async (skip = 0, append = false) => {
    const requestId = ++latestRequestId.current;
    if (!append) setLoading(true); else setIsLoadingMore(true);
    setError('');
    try {
      const limit = append ? 10 : 20;
      const data = await apiFetch(`/api/leads/?skip=${skip}&limit=${limit}`);
      if (requestId !== latestRequestId.current) return;
      const mappedData = data.map(mapLeadToRow);
      if (append) setLeads((prev) => [...prev, ...mappedData]); else setLeads(mappedData);
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
    const payload = {
      name, email: formData.email.trim() || undefined, phone: formData.mobile.trim() || undefined,
      company: formData.organization.trim() || undefined, status: normalizeStatus(formData.status) || 'new',
    };
    setIsSaving(true);
    try {
      const created = await apiFetch('/api/leads/', { method: 'POST', body: JSON.stringify(payload) });
      setLeads((prev) => [mapLeadToRow(created), ...prev]);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) { setError(err?.message || 'Unable to create lead.'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteLead = async (id) => {
    if (!canDelete) return;
    if (!window.confirm('Delete this lead?')) return;
    setError('');
    try { await apiFetch(`/api/leads/${id}`, { method: 'DELETE' }); setLeads((prev) => prev.filter((l) => l.id !== id)); }
    catch (err) { setError(err?.message || 'Unable to delete lead.'); }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(leads);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "CRM_Leads.xlsx");
  };

  const groupedLeads = useMemo(() => {
    const groups = {
      new: leads.filter((l) => l.status === 'new'),
      contacted: leads.filter((l) => l.status === 'contacted'),
      qualified: leads.filter((l) => l.status === 'qualified'),
    };
    const other = leads.filter((l) => !['new', 'contacted', 'qualified'].includes(l.status));
    if (other.length) groups.other = other;
    return groups;
  }, [leads]);

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

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
            <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary">
              <Plus size={15} /> Add Lead
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input type="text" placeholder="Search leads..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {error && (
          <div style={{ padding: 12, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
            {error}
          </div>
        )}

        {loading ? <SkeletonTable rows={8} cols={6} /> : (
          <>
            {/* TABLE VIEW */}
            {viewMode === 'table' && (
              filteredLeads.length === 0 ? <EmptyState type="leads" /> : (
                <div className="card" style={{ overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}><input type="checkbox" className="checkbox-input" /></th>
                        <th>Name</th>
                        <th>Organization</th>
                        <th>Status</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Modified</th>
                        <th style={{ width: 60, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <motion.tbody ref={tbodyRef} variants={staggerContainer} initial="initial" animate="animate">
                      {filteredLeads.map((l) => (
                        <motion.tr key={l.id} variants={staggerItem}>
                          <td><input type="checkbox" className="checkbox-input" /></td>
                          <td style={{ fontWeight: 'var(--weight-medium)' }}>{l.name}</td>
                          <td style={{ color: 'var(--color-text-secondary)' }}>{l.org}</td>
                          <td><span className={`badge ${STATUS_BADGE[l.status] || 'badge-muted'}`}>{formatLeadStatus(l.status)}</span></td>
                          <td style={{ color: 'var(--color-text-secondary)' }}>{l.email}</td>
                          <td style={{ color: 'var(--color-text-secondary)' }}>{l.mobile}</td>
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
                                  <button className="dropdown-item" onClick={() => setActionMenu(null)}>
                                    <Eye size={14} /> View
                                  </button>
                                  {canEdit && (
                                    <button className="dropdown-item" onClick={() => setActionMenu(null)}>
                                      <Pencil size={14} /> Edit
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button className="dropdown-item dropdown-item-danger" onClick={() => { handleDeleteLead(l.id); setActionMenu(null); }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {Object.entries(groupedLeads).map(([status, items]) => (
                  <div key={status} className="kanban-column">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span className={`badge ${STATUS_BADGE[status] || 'badge-muted'}`}>{STATUS_LABELS[status] || 'Other'}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{items.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {items.map((l) => (
                        <div key={l.id} className="kanban-card">
                          <div style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-base)', marginBottom: 4 }}>{l.name}</div>
                          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{l.org}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 6 }}>{l.email}</div>
                          {canDelete && (
                            <button onClick={() => handleDeleteLead(l.id)} className="btn btn-danger btn-sm" style={{ marginTop: 8 }}>
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

        {/* CREATE MODAL */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
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
                  <h3 className="section-title">Create Lead</h3>
                  <button onClick={() => setIsCreateModalOpen(false)} className="btn btn-ghost btn-icon" aria-label="Close">
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
                      <select className="input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                        <option>New</option>
                        <option>Contacted</option>
                        <option>Qualified</option>
                        <option>Converted</option>
                      </select>
                    </div>
                  </div>
                </form>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-ghost">Discard</button>
                  <button type="submit" form="create-lead-form" disabled={isSaving} className="btn btn-primary">
                    {isSaving ? 'Creating...' : 'Create Lead'}
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
