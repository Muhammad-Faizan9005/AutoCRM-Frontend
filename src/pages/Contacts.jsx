import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, RotateCcw, Eye, Pencil, Trash2, MoreHorizontal, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../api/client';
import { PageTransition, staggerContainer, staggerItem } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';

const STATUS_BADGE = { active: 'badge-success', inactive: 'badge-muted', lead: 'badge-accent', churned: 'badge-danger' };
const STATUS_LABEL = { active: 'Active', inactive: 'Inactive', lead: 'Lead', churned: 'Churned' };

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const mapCustomerToContact = (customer) => ({
  id: customer.id,
  email: customer.email,
  phone: customer.phone || '-',
  org: customer.company || '-',
  status: customer.status || 'active',
  modified: formatDate(customer.updated_at),
  fullName: customer.full_name || customer.email,
});

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(/[\s@]+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
};

const Contacts = ({ user }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMenu, setActionMenu] = useState(null);
  const latestRequestId = useRef(0);
  const [tbodyRef] = useAutoAnimate();
  const canDelete = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || (user?.role || '').toLowerCase().includes('manager');

  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', mobile: '', company: '' });
  const resetForm = () => setFormData({ firstName: '', lastName: '', email: '', mobile: '', company: '' });

  const fetchContacts = useCallback(async (skip = 0, append = false) => {
    const requestId = ++latestRequestId.current;
    if (!append) setLoading(true); else setIsLoadingMore(true);
    setError('');
    try {
      const limit = append ? 10 : 20;
      const data = await apiFetch(`/api/customers/?skip=${skip}&limit=${limit}`);
      if (requestId !== latestRequestId.current) return;
      const mapped = data.map(mapCustomerToContact);
      if (append) setContacts((prev) => [...prev, ...mapped]); else setContacts(mapped);
      setTotalLoaded((prev) => prev + mapped.length);
      setHasMore(mapped.length === limit);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err?.message || 'Unable to load contacts.');
    } finally {
      if (requestId === latestRequestId.current) { if (!append) setLoading(false); else setIsLoadingMore(false); }
    }
  }, []);

  useEffect(() => { fetchContacts(0, false); }, [fetchContacts]);

  const filteredContacts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((c) => [c.email, c.org, c.phone, c.fullName].some((v) => String(v).toLowerCase().includes(term)));
  }, [contacts, searchTerm]);

  const handleSaveContact = async (e) => {
    e.preventDefault();
    setError('');
    const firstName = formData.firstName.trim();
    const email = formData.email.trim();
    if (!firstName || !email) { setError('First name and email are required.'); return; }
    const fullName = [firstName, formData.lastName.trim()].filter(Boolean).join(' ');
    const payload = { email, full_name: fullName, phone: formData.mobile.trim() || undefined, company: formData.company.trim() || undefined, status: 'active' };
    setIsSaving(true);
    try {
      const created = await apiFetch('/api/customers/', { method: 'POST', body: JSON.stringify(payload) });
      setContacts((prev) => [mapCustomerToContact(created), ...prev]);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) { setError(err?.message || 'Unable to create contact.'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteContact = async (id) => {
    if (!canDelete || !window.confirm('Delete this contact?')) return;
    setError('');
    try { await apiFetch(`/api/customers/${id}`, { method: 'DELETE' }); setContacts((prev) => prev.filter((c) => c.id !== id)); }
    catch (err) { setError(err?.message || 'Unable to delete contact.'); }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(contacts);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "CRM_Contacts.xlsx");
  };

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="page-title">Contacts</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => { setTotalLoaded(0); fetchContacts(0, false); }} className="btn btn-ghost btn-icon" aria-label="Refresh"><RotateCcw size={16} /></button>
            <button onClick={exportToExcel} className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
            <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary"><Plus size={15} /> Add Contact</button>
          </div>
        </div>

        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input type="text" placeholder="Search contacts..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {error && (
          <div style={{ padding: 12, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>{error}</div>
        )}

        {loading ? <SkeletonTable rows={8} cols={6} /> : (
          filteredContacts.length === 0 ? <EmptyState type="contacts" /> : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead><tr>
                  <th style={{ width: 36 }}><input type="checkbox" className="checkbox-input" /></th>
                  <th>Contact</th>
                  <th>Organization</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Modified</th>
                  <th style={{ width: 60, textAlign: 'right' }}>Actions</th>
                </tr></thead>
                <motion.tbody ref={tbodyRef} variants={staggerContainer} initial="initial" animate="animate">
                  {filteredContacts.map((c) => (
                    <motion.tr key={c.id} variants={staggerItem}>
                      <td><input type="checkbox" className="checkbox-input" /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar avatar-sm avatar-accent">{getInitials(c.fullName)}</div>
                          <span style={{ fontWeight: 'var(--weight-medium)' }}>{c.fullName}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{c.org}</td>
                      <td><span className={`badge ${STATUS_BADGE[c.status] || 'badge-muted'}`}>{STATUS_LABEL[c.status] || c.status}</span></td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{c.email}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{c.phone}</td>
                      <td style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>{c.modified}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button className="btn btn-ghost btn-icon" onClick={() => setActionMenu(actionMenu === c.id ? null : c.id)} aria-label="Row actions"><MoreHorizontal size={14} /></button>
                          {actionMenu === c.id && (
                            <div className="dropdown-menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)' }}>
                              <button className="dropdown-item" onClick={() => setActionMenu(null)}><Eye size={14} /> View</button>
                              {canEdit && <button className="dropdown-item" onClick={() => setActionMenu(null)}><Pencil size={14} /> Edit</button>}
                              {canDelete && <button className="dropdown-item dropdown-item-danger" onClick={() => { handleDeleteContact(c.id); setActionMenu(null); }}><Trash2 size={14} /> Delete</button>}
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

        {!loading && hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => fetchContacts(totalLoaded, true)} disabled={isLoadingMore} className="btn btn-secondary">{isLoadingMore ? 'Loading...' : 'Load More'}</button>
          </div>
        )}

        <AnimatePresence>
          {isCreateModalOpen && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateModalOpen(false)}>
              <motion.div className="modal-content" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.97, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                  <h3 className="section-title">Create Contact</h3>
                  <button onClick={() => setIsCreateModalOpen(false)} className="btn btn-ghost btn-icon" aria-label="Close"><X size={18} /></button>
                </div>
                <form id="contact-form" onSubmit={handleSaveContact} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label className="label">First Name *</label><input type="text" required className="input" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} /></div>
                    <div><label className="label">Last Name</label><input type="text" className="input" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} /></div>
                  </div>
                  <div><label className="label">Email *</label><input type="email" required className="input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label className="label">Phone</label><input type="text" className="input" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} /></div>
                    <div><label className="label">Company</label><input type="text" className="input" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} /></div>
                  </div>
                </form>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-ghost">Discard</button>
                  <button type="submit" form="contact-form" disabled={isSaving} className="btn btn-primary">{isSaving ? 'Creating...' : 'Create Contact'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default Contacts;
