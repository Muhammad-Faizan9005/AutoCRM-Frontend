import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, RotateCcw, Building2, Trash2, X, Globe, DollarSign, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import * as XLSX from 'xlsx';
import { apiFetch, peekCache } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';
import { toast } from '../utils/toast';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatRevenue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return '$' + numeric.toLocaleString();
};

const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(String(value).replace(/[^0-9.-]+/g, ''));
  return Number.isNaN(parsed) ? undefined : parsed;
};

const mapOrg = (org) => ({
  id: org.id,
  name: org.name || '-',
  website: org.website || '',
  industry: org.industry || '-',
  revenue: formatRevenue(org.revenue),
  revenueValue: org.revenue ?? '',
  phone: org.phone || '',
  address: org.address || '',
  modified: formatDate(org.updated_at),
});

const ORGS_INITIAL_PATH = '/api/organizations/?skip=0&limit=20';

const Organizations = ({ user }) => {
  const cachedOrgs = peekCache(ORGS_INITIAL_PATH);
  const initialOrgs = cachedOrgs.hit ? cachedOrgs.value.map(mapOrg) : [];
  const [orgs, setOrgs] = useState(initialOrgs);
  const [loading, setLoading] = useState(!cachedOrgs.hit);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const latestRequestId = useRef(0);
  const navigate = useNavigate();
  const [gridRef] = useAutoAnimate();
  const canDelete = user?.role === 'admin';

  const [formData, setFormData] = useState({ name: '', website: '', industry: '', revenue: '', phone: '', address: '' });
  const resetForm = () => setFormData({ name: '', website: '', industry: '', revenue: '', phone: '', address: '' });

  const closeOrgModal = () => {
    setIsCreateModalOpen(false);
    setEditingOrg(null);
    resetForm();
  };

  const openCreateOrg = () => {
    setEditingOrg(null);
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditOrg = (org) => {
    setEditingOrg(org);
    setFormData({
      name: org.name === '-' ? '' : org.name,
      website: org.website || '',
      industry: org.industry === '-' ? '' : org.industry,
      revenue: org.revenueValue === null || org.revenueValue === undefined ? '' : String(org.revenueValue),
      phone: org.phone || '',
      address: org.address || '',
    });
    setIsCreateModalOpen(true);
  };

  const hasDataRef = useRef(initialOrgs.length > 0);
  const fetchOrganizations = useCallback(async (skip = 0, append = false) => {
    const requestId = ++latestRequestId.current;
    if (append) setIsLoadingMore(true);
    else if (!hasDataRef.current) setLoading(true);
    setError('');
    try {
      const limit = append ? 10 : 20;
      const data = await apiFetch(`/api/organizations/?skip=${skip}&limit=${limit}`);
      if (requestId !== latestRequestId.current) return;
      const mapped = data.map(mapOrg);
      if (append) setOrgs((prev) => [...prev, ...mapped]); else { setOrgs(mapped); hasDataRef.current = true; }
      setTotalLoaded((prev) => prev + mapped.length);
      setHasMore(mapped.length === limit);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err?.message || 'Unable to load organizations.');
    } finally {
      if (requestId === latestRequestId.current) { if (!append) setLoading(false); else setIsLoadingMore(false); }
    }
  }, []);

  useEffect(() => { fetchOrganizations(0, false); }, [fetchOrganizations]);

  const filteredOrgs = useMemo(() => orgs.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())), [orgs, searchTerm]);

  const handleSaveOrg = async (e) => {
    e.preventDefault();
    setError('');
    const name = formData.name.trim();
    if (!name) { setError('Organization name is required.'); return; }
    const payload = {
      name,
      website: formData.website.trim() || undefined,
      industry: formData.industry.trim() || undefined,
      revenue: parseAmount(formData.revenue),
      phone: formData.phone.trim() || undefined,
      address: formData.address.trim() || undefined,
    };
    setIsSaving(true);
    try {
      if (editingOrg) {
        const updated = await apiFetch(`/api/organizations/${editingOrg.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setOrgs((prev) => prev.map((org) => (org.id === editingOrg.id ? mapOrg(updated) : org)));
        toast.success('Organization updated successfully.');
      } else {
        const created = await apiFetch('/api/organizations/', { method: 'POST', body: JSON.stringify(payload) });
        setOrgs((prev) => [mapOrg(created), ...prev]);
        toast.success('Organization created successfully.');
      }
      closeOrgModal();
    } catch (err) {
      const message = err?.message || `Unable to ${editingOrg ? 'update' : 'create'} organization.`;
      setError(message);
      toast.error(message);
    }
    finally { setIsSaving(false); }
  };

  const handleDeleteOrg = async (id) => {
    if (!canDelete || !window.confirm('Delete this organization?')) return;
    setError('');
    try {
      await apiFetch(`/api/organizations/${id}`, { method: 'DELETE' });
      setOrgs((prev) => prev.filter((o) => o.id !== id));
      toast.success('Organization deleted.');
    }
    catch (err) {
      const message = err?.message || 'Unable to delete organization.';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="page-title">Organizations</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => { setTotalLoaded(0); fetchOrganizations(0, false); }} className="btn btn-ghost btn-icon" aria-label="Refresh"><RotateCcw size={16} /></button>
            <button onClick={openCreateOrg} className="btn btn-primary"><Plus size={15} /> Add Organization</button>
          </div>
        </div>

        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input type="text" placeholder="Search organizations..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>


        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          filteredOrgs.length === 0 ? <EmptyState type="organizations" /> : (
            <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {filteredOrgs.map((o) => (
                <motion.div
                  key={o.id}
                  className="card card-padding"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}
                  onClick={() => navigate(`/orgs/${o.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius)', background: 'var(--color-warning-subtle)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)', flexShrink: 0,
                      }}>
                        <Building2 size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-md)' }}>{o.name}</div>
                        <span className="badge badge-muted" style={{ marginTop: 2 }}>{o.industry}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 16, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    {o.website && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Globe size={12} /> {o.website}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <DollarSign size={12} /> {o.revenue}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Updated {o.modified}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={(event) => { event.stopPropagation(); openEditOrg(o); }} className="btn btn-secondary btn-sm"><Pencil size={12} /> Edit</button>
                      {canDelete && (
                        <button onClick={(event) => { event.stopPropagation(); handleDeleteOrg(o.id); }} className="btn btn-danger btn-sm"><Trash2 size={12} /> Delete</button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}

        {!loading && hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => fetchOrganizations(totalLoaded, true)} disabled={isLoadingMore} className="btn btn-secondary">{isLoadingMore ? 'Loading...' : 'Load More'}</button>
          </div>
        )}

        <AnimatePresence>
          {isCreateModalOpen && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeOrgModal}>
              <motion.div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.97, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                  <h3 className="section-title">{editingOrg ? 'Edit Organization' : 'New Organization'}</h3>
                  <button onClick={closeOrgModal} className="btn btn-ghost btn-icon" aria-label="Close"><X size={18} /></button>
                </div>
                <form id="org-form" onSubmit={handleSaveOrg} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div><label className="label">Organization Name *</label><input type="text" required className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label className="label">Website</label><input type="text" className="input" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} /></div>
                    <div><label className="label">Revenue</label><input type="text" className="input" placeholder="0.00" value={formData.revenue} onChange={(e) => setFormData({ ...formData, revenue: e.target.value })} /></div>
                  </div>
                  <div><label className="label">Phone</label><input type="text" className="input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                  <div><label className="label">Industry</label><select className="input" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })}><option value="">Select</option><option>Software</option><option>Finance</option><option>Healthcare</option><option>Retail</option><option>Sports</option></select></div>
                  <div><label className="label">Address</label><textarea className="input" rows={3} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
                </form>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
                  <button type="button" onClick={closeOrgModal} className="btn btn-ghost">Discard</button>
                  <button type="submit" form="org-form" disabled={isSaving} className="btn btn-primary">{isSaving ? 'Saving...' : editingOrg ? 'Save Changes' : 'Create'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default Organizations;
