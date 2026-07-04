import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Building2, Calendar, CheckSquare, ChevronDown, ChevronRight, DollarSign, Globe, Pencil, Phone, StickyNote, Target, Users, X } from 'lucide-react';
import { apiFetch } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { SkeletonOrganizationDetail } from '../components/Skeleton';
import { EntityCard } from '../components/EntityCard';
import { toast } from '../utils/toast';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatMoney = (value) => {
  const numeric = Number(value || 0);
  return '$' + numeric.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(String(value).replace(/[^0-9.-]+/g, ''));
  return Number.isNaN(parsed) ? undefined : parsed;
};

const leadStatusClass = (status = '') => {
  const normalized = status.toLowerCase();
  if (normalized.includes('qualified') || normalized.includes('won')) return 'badge-success';
  if (normalized.includes('contact')) return 'badge-accent';
  if (normalized.includes('unqualified') || normalized.includes('junk') || normalized.includes('lost')) return 'badge-danger';
  return 'badge-muted';
};

const taskStatusClass = (status = '') => {
  const normalized = status.toLowerCase();
  if (normalized === 'done') return 'badge-success';
  if (normalized === 'canceled') return 'badge-danger';
  if (normalized === 'in_progress') return 'badge-warning';
  if (normalized === 'todo') return 'badge-accent';
  return 'badge-muted';
};

const taskAccent = (status = '') => {
  const normalized = status.toLowerCase();
  if (normalized === 'done') return 'note-border-success';
  if (normalized === 'canceled') return 'note-border-danger';
  if (normalized === 'in_progress') return 'note-border-warning';
  if (normalized === 'todo') return 'note-border-accent';
  return 'note-border-muted';
};

const dealStatusClass = (status = '') => {
  const normalized = status.toLowerCase();
  if (normalized.includes('won')) return 'badge-success';
  if (normalized.includes('lost')) return 'badge-danger';
  if (normalized.includes('proposal') || normalized.includes('negotiation')) return 'badge-warning';
  return 'badge-accent';
};

const DEAL_TYPE_LABELS = { new_business: 'New Business', upsell: 'Upsell', renewal: 'Renewal', cross_sell: 'Cross-sell' };
const DEAL_TYPE_BADGE = { new_business: 'badge-accent', upsell: 'badge-success', renewal: 'badge-warning', cross_sell: 'badge-purple' };
const normalizeDealType = (value) => {
  const normalized = (value || 'new_business').toString().trim().toLowerCase().replace(/[/-]/g, '_').replace(/\s+/g, '_');
  if (normalized === 'new' || normalized === 'new_sale') return 'new_business';
  if (normalized === 'crosssell') return 'cross_sell';
  return DEAL_TYPE_LABELS[normalized] ? normalized : 'new_business';
};

const MetricCard = ({ label, value, icon: Icon, tone = 'accent' }) => {
  const color = tone === 'success' ? 'var(--color-success)' : tone === 'warning' ? 'var(--color-warning)' : 'var(--color-accent)';
  const bg = tone === 'success' ? 'var(--color-success-subtle)' : tone === 'warning' ? 'var(--color-warning-subtle)' : 'var(--color-accent-subtle)';
  return (
    <div className="card card-padding">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)' }}>{label}</div>
          <div style={{ marginTop: 8, fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>{value}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 'var(--radius)', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, count, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: open ? 14 : 0 }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: 0,
          border: 0,
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="section-title">{title}</span>
        </span>
        <span className="badge badge-muted">{count} total</span>
      </button>
      {open && children}
    </section>
  );
};

const OrganizationDetail = () => {
  const { organizationId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', website: '', industry: '', revenue: '', phone: '', address: '' });

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/organizations/${organizationId}/workspace`, {}, { timeoutMs: 30000, cache: false });
      setWorkspace(data);
    } catch (err) {
      setError(err?.message || 'Unable to load organization workspace.');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  const org = workspace?.organization || {};
  const summary = workspace?.summary || {};
  const leads = useMemo(() => workspace?.leads || [], [workspace]);
  const deals = useMemo(() => workspace?.deals || [], [workspace]);
  const tasks = useMemo(() => workspace?.tasks || [], [workspace]);
  const notes = useMemo(() => workspace?.notes || [], [workspace]);
  const calls = useMemo(() => workspace?.calls || [], [workspace]);

  const openEditOrganization = () => {
    setFormData({
      name: org.name || '',
      website: org.website || '',
      industry: org.industry || '',
      revenue: org.revenue === null || org.revenue === undefined ? '' : String(org.revenue),
      phone: org.phone || '',
      address: org.address || '',
    });
    setIsEditOpen(true);
  };

  const closeEditOrganization = () => {
    setIsEditOpen(false);
  };

  const handleUpdateOrganization = async (event) => {
    event.preventDefault();
    const name = formData.name.trim();
    if (!name) {
      setError('Organization name is required.');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      const payload = {
        name,
        website: formData.website.trim() || undefined,
        industry: formData.industry.trim() || undefined,
        revenue: parseAmount(formData.revenue),
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
      };
      const updated = await apiFetch(`/api/organizations/${organizationId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setWorkspace((current) => current ? { ...current, organization: updated } : current);
      setIsEditOpen(false);
      toast.success('Organization updated successfully.');
    } catch (err) {
      const message = err?.message || 'Unable to update organization.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const activity = useMemo(() => {
    const rows = [
      ...leads.map((item) => ({ type: 'Lead', text: item.name, date: item.created_at })),
      ...deals.map((item) => ({ type: 'Deal', text: item.name || item.title, date: item.created_at })),
      ...tasks.map((item) => ({ type: 'Task', text: item.title, date: item.updated_at || item.created_at })),
      ...notes.map((item) => ({ type: 'Note', text: item.title || item.content || 'Note added', date: item.created_at })),
      ...calls.map((item) => ({ type: 'Call', text: item.lead_name || item.outcome || 'Call recorded', date: item.created_at })),
    ];
    return rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 12);
  }, [leads, deals, tasks, notes, calls]);

  if (loading) {
    return (
      <PageTransition>
        <SkeletonOrganizationDetail />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <Link to="/orgs" className="btn btn-ghost" style={{ display: 'inline-flex', marginBottom: 12 }}>
            <ArrowLeft size={15} /> Back to organizations
          </Link>
          <div className="card" style={{ padding: '24px 28px', display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--color-warning-subtle)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>Organization Account</div>
                <h1 className="page-title" style={{ marginTop: 4 }}>{org.name || 'Organization'}</h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {org.industry && <span className="badge badge-muted">{org.industry}</span>}
                  {org.website && <span className="badge badge-accent"><Globe size={11} /> {org.website}</span>}
                  {org.phone && <span className="badge badge-muted"><Phone size={11} /> {org.phone}</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
              <button type="button" onClick={openEditOrganization} className="btn btn-secondary">
                <Pencil size={14} /> Edit Organization
              </button>
              <div style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                <div>Revenue</div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>{formatMoney(org.revenue)}</div>
                <div style={{ marginTop: 6, color: 'var(--color-text-tertiary)' }}>Updated {formatDate(org.updated_at)}</div>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <MetricCard label="People / Leads" value={summary.lead_count || 0} icon={Users} />
          <MetricCard label="Open Deals" value={summary.open_deal_count || 0} icon={Target} tone="warning" />
          <MetricCard label="Open Pipeline" value={formatMoney(summary.open_pipeline_value)} icon={DollarSign} tone="warning" />
          <MetricCard label="Won Revenue" value={formatMoney(summary.won_revenue)} icon={DollarSign} tone="success" />
          <MetricCard label="Renewals" value={summary.deal_type_counts?.renewal || 0} icon={Target} tone="success" />
          <MetricCard label="Upsells" value={summary.deal_type_counts?.upsell || 0} icon={Target} />
          <MetricCard label="Pending Tasks" value={summary.task_count || 0} icon={CheckSquare} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Section title="People / Leads" count={leads.length}>
              {leads.length === 0 ? <EmptyState title="No leads" desc="No leads are linked to this organization." /> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {leads.map((lead) => (
                    <Link key={lead.id} to={`/leads/${lead.id}`} className="card" style={{ padding: 12, textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 'var(--weight-semibold)' }}>{lead.name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{lead.email || lead.phone || 'No contact info'}</div>
                      </div>
                      <span className={`badge ${leadStatusClass(lead.status)}`}>{lead.status || 'new'}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Deals" count={deals.length}>
              {deals.length === 0 ? <EmptyState title="No deals" desc="No deals are linked to this organization." /> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {deals.map((deal) => (
                    <div key={deal.id} className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 'var(--weight-semibold)' }}>{deal.name || deal.title || deal.lead_name || 'Deal'}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Expected close: {formatDate(deal.expected_close_at)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'var(--weight-semibold)' }}>{formatMoney(deal.value)}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <span className={`badge ${DEAL_TYPE_BADGE[normalizeDealType(deal.deal_type)] || 'badge-muted'}`}>{DEAL_TYPE_LABELS[normalizeDealType(deal.deal_type)]}</span>
                          <span className={`badge ${dealStatusClass(deal.status || deal.stage)}`}>{deal.status || deal.stage || 'open'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Tasks" count={tasks.length}>
              {tasks.length === 0 ? <EmptyState title="No tasks" desc="No tasks are linked to this organization." /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                  {tasks.map((task) => (
                    <EntityCard
                      key={task.id}
                      title={task.title}
                      description={task.description}
                      accentClass={taskAccent(task.status)}
                      statusSlot={<span className={`badge ${taskStatusClass(task.status)}`}>{task.status || 'backlog'}</span>}
                      badges={[{ label: task.lead_name || task.entity_type }, { label: formatDate(task.due_at) }, { label: task.priority || 'medium' }]}
                    />
                  ))}
                </div>
              )}
            </Section>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Section title="Notes" count={notes.length}>
              {notes.length === 0 ? <EmptyState title="No notes" desc="No notes are linked to this organization." /> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {notes.slice(0, 8).map((note) => (
                    <EntityCard
                      key={note.id}
                      title={note.title || 'Note'}
                      description={note.content}
                      accentClass="note-border-accent"
                      iconSlot={<StickyNote size={14} style={{ color: 'var(--color-text-tertiary)' }} />}
                      badges={[{ label: note.lead_name || note.entity_type }, { label: formatDate(note.created_at) }]}
                      clampDescription
                    />
                  ))}
                </div>
              )}
            </Section>

            <Section title="Calls / Meetings" count={calls.length}>
              {calls.length === 0 ? <EmptyState title="No calls" desc="No calls are linked to this organization." /> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {calls.map((call) => (
                    <div key={call.id} className="card" style={{ padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontWeight: 'var(--weight-semibold)' }}>{call.lead_name || 'Call'}</div>
                        <span className="badge badge-muted">{call.processing_status || call.status}</span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}><Calendar size={11} /> {formatDate(call.created_at)}</div>
                      {call.transcript && <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Transcript available</div>}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Recent Activity" count={activity.length}>
              {activity.length === 0 ? <EmptyState title="No activity" desc="No recent activity for this organization." /> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {activity.map((item, index) => (
                    <div key={`${item.type}-${item.date}-${index}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span className="badge badge-muted" style={{ minWidth: 54, justifyContent: 'center' }}>{item.type}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-sm)' }}>{item.text || item.type}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{formatDate(item.date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>

        <AnimatePresence>
          {isEditOpen && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeEditOrganization}>
              <motion.div className="modal-content" style={{ maxWidth: 520 }} onClick={(event) => event.stopPropagation()} initial={{ opacity: 0, scale: 0.97, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                  <h3 className="section-title">Edit Organization</h3>
                  <button onClick={closeEditOrganization} className="btn btn-ghost btn-icon" aria-label="Close"><X size={18} /></button>
                </div>
                <form id="organization-edit-form" onSubmit={handleUpdateOrganization} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="label">Organization Name *</label>
                    <input type="text" required className="input" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="label">Website</label>
                      <input type="text" className="input" value={formData.website} onChange={(event) => setFormData({ ...formData, website: event.target.value })} />
                    </div>
                    <div>
                      <label className="label">Revenue</label>
                      <input type="text" className="input" placeholder="0.00" value={formData.revenue} onChange={(event) => setFormData({ ...formData, revenue: event.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="label">Industry</label>
                      <select className="input" value={formData.industry} onChange={(event) => setFormData({ ...formData, industry: event.target.value })}>
                        <option value="">Select</option>
                        <option>Software</option>
                        <option>Finance</option>
                        <option>Healthcare</option>
                        <option>Retail</option>
                        <option>Sports</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input type="text" className="input" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Address</label>
                    <textarea className="input" rows={3} value={formData.address} onChange={(event) => setFormData({ ...formData, address: event.target.value })} />
                  </div>
                </form>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
                  <button type="button" onClick={closeEditOrganization} className="btn btn-ghost">Discard</button>
                  <button type="submit" form="organization-edit-form" disabled={isSaving} className="btn btn-primary">{isSaving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default OrganizationDetail;
