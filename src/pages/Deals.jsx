import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, RotateCcw, LayoutList, Columns2, Download, MoreHorizontal, Eye, Pencil, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../api/client';
import { PageTransition, staggerContainer, staggerItem } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';

const STAGE_LABELS = { prospecting:'Prospecting', qualification:'Qualification', proposal:'Proposal', negotiation:'Negotiation', closed:'Closed', closed_won:'Closed Won', closed_lost:'Closed Lost' };
const STAGE_BADGE = { prospecting:'badge-muted', qualification:'badge-accent', proposal:'badge-warning', negotiation:'badge-warning', closed:'badge-success', closed_won:'badge-success', closed_lost:'badge-danger' };
const STATUS_LABELS = { qualified: 'Qualified', won: 'Won', lost: 'Lost', open: 'Open' };
const STATUS_BADGE = { qualified: 'badge-accent', won: 'badge-success', lost: 'badge-danger', open: 'badge-muted' };
const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'open', label: 'Open' },
];
const normalizeStage = (s) => (s||'').toString().trim().toLowerCase().replace(/\s+/g,'_') || 'prospecting';
const formatStage = (s) => STAGE_LABELS[normalizeStage(s)] || s || 'Unknown';
const formatDate = (v) => { if (!v) return '-'; const d=new Date(v); return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); };
const inferCurrency = (v) => { const t=String(v||'').toUpperCase(); if(t.includes('PKR')||t.includes('RS'))return'PKR'; if(t.includes('EUR'))return'EUR'; return'USD'; };
const parseAmount = (v) => { if(v===null||v===undefined||v==='')return undefined; const p=Number(String(v).replace(/[^0-9.-]+/g,'')); return Number.isNaN(p)?undefined:p; };
const formatMoney = (v,c) => { if(v===null||v===undefined||v==='')return'-'; const n=Number(v); if(Number.isNaN(n))return String(v); try{return new Intl.NumberFormat('en-US',{style:'currency',currency:c||'USD',maximumFractionDigits:2}).format(n);}catch{return`${c||'USD'} ${n.toFixed(2)}`;}};

const mapDeal = (deal,orgIdx) => ({
  id: deal.id,
  org: orgIdx.get(deal.organization_id) || deal.organization_id || '-',
  revenue: formatMoney(deal.value, deal.currency),
  stage: normalizeStage(deal.stage),
  status: (deal.status || '').toString().trim().toLowerCase() || 'qualified',
  modified: formatDate(deal.updated_at),
});

const Deals = ({ user }) => {
  const [viewMode, setViewMode] = useState('table');
  const [dealRecords, setDealRecords] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionMenu, setActionMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const latestReq = useRef(0);
  const [tbodyRef] = useAutoAnimate();
  const canDelete = user?.role === 'admin';

  const [formData, setFormData] = useState({ orgName:'', website:'', revenue:'', industry:'', firstName:'', lastName:'', email:'', mobile:'', status:'Qualification' });
  const resetForm = () => setFormData({ orgName:'', website:'', revenue:'', industry:'', firstName:'', lastName:'', email:'', mobile:'', status:'Qualification' });

  const orgIdx = useMemo(() => new Map(organizations.map(o=>[o.id,o.name||'-'])), [organizations]);
  const deals = useMemo(() => dealRecords.map(d=>mapDeal(d,orgIdx)), [dealRecords,orgIdx]);

  const fetchDeals = useCallback(async (skip=0,append=false) => {
    const rid = ++latestReq.current;
    if(!append)setLoading(true);else setIsLoadingMore(true);
    setError('');
    try {
      const lim = append?10:20;
      const data = await apiFetch(`/api/deals/?skip=${skip}&limit=${lim}`);
      if(rid!==latestReq.current)return;
      if(append)setDealRecords(p=>[...p,...data]);else setDealRecords(data);
      setTotalLoaded(p=>p+data.length); setHasMore(data.length===lim);
    } catch(e){if(rid===latestReq.current)setError(e?.message||'Unable to load deals.');}
    finally{if(rid===latestReq.current){if(!append)setLoading(false);else setIsLoadingMore(false);}}
  },[]);

  const fetchOrgs = useCallback(async()=>{try{setOrganizations(await apiFetch('/api/organizations/'));}catch{}},[]);
  useEffect(()=>{fetchDeals(0,false);fetchOrgs();},[fetchDeals,fetchOrgs]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return deals.filter((deal) => {
      if (statusFilter !== 'all' && deal.status !== statusFilter) return false;
      if (!term) return true;
      return String(deal.org).toLowerCase().includes(term);
    });
  }, [deals, searchTerm, statusFilter]);

  const ensureOrgId = async()=>{const n=formData.orgName.trim();if(!n)return null;const ex=organizations.find(o=>o.name?.toLowerCase()===n.toLowerCase());if(ex)return ex.id;const c=await apiFetch('/api/organizations/',{method:'POST',body:JSON.stringify({name:n,website:formData.website.trim()||undefined,industry:formData.industry||undefined,revenue:parseAmount(formData.revenue)})});setOrganizations(p=>[c,...p]);return c.id;};
  const ensureLeadId = async()=>{const nm=[formData.firstName.trim(),formData.lastName.trim()].filter(Boolean).join(' ');const em=formData.email.trim();if(!nm&&!em)return null;const c=await apiFetch('/api/leads/',{method:'POST',body:JSON.stringify({name:nm||'New Lead',email:em||undefined,phone:formData.mobile.trim()||undefined,company:formData.orgName.trim()||undefined,status:'new'})});return c.id;};

  const handleSave = async(e)=>{e.preventDefault();setError('');setIsSaving(true);try{const oid=await ensureOrgId();const lid=await ensureLeadId();const created=await apiFetch('/api/deals/',{method:'POST',body:JSON.stringify({organization_id:oid||undefined,lead_id:lid||undefined,stage:normalizeStage(formData.status),value:parseAmount(formData.revenue),currency:inferCurrency(formData.revenue)})});setDealRecords(p=>[created,...p]);setIsCreateOpen(false);resetForm();}catch(e){setError(e?.message||'Unable to create deal.');}finally{setIsSaving(false);}};

  const handleDelete = async(id)=>{if(!canDelete||!window.confirm('Delete this deal?'))return;try{await apiFetch(`/api/deals/${id}`,{method:'DELETE'});setDealRecords(p=>p.filter(d=>d.id!==id));}catch(e){setError(e?.message||'Delete failed.');}};

  const exportXl = ()=>{const ws=XLSX.utils.json_to_sheet(deals);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Deals");XLSX.writeFile(wb,"CRM_Deals.xlsx");};

  const grouped = useMemo(()=>{const g={};deals.forEach(d=>{const s=d.status;if(!g[s])g[s]=[];g[s].push(d);});return g;},[deals]);

  return (
    <PageTransition>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <h1 className="page-title">Deals</h1>
            <div style={{ display:'flex', gap:2, background:'var(--color-bg-elevated)', borderRadius:'var(--radius)', padding:2, border:'1px solid var(--color-border)' }}>
              <button onClick={()=>setViewMode('table')} className={viewMode==='table'?'btn btn-sm btn-primary':'btn btn-sm btn-ghost'} aria-label="Table"><LayoutList size={14}/></button>
              <button onClick={()=>setViewMode('kanban')} className={viewMode==='kanban'?'btn btn-sm btn-primary':'btn btn-sm btn-ghost'} aria-label="Kanban"><Columns2 size={14}/></button>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>{setTotalLoaded(0);fetchDeals(0,false);}} className="btn btn-ghost btn-icon" aria-label="Refresh"><RotateCcw size={16}/></button>
            <button onClick={exportXl} className="btn btn-secondary btn-sm"><Download size={14}/> Export</button>
            <button onClick={()=>setIsCreateOpen(true)} className="btn btn-primary"><Plus size={15}/> Add Deal</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div style={{ position:'relative', maxWidth:320, flex: '1 1 240px' }}>
            <Search size={16} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-tertiary)' }}/>
            <input type="text" placeholder="Search deals..." className="search-input" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
          </div>
          <div className="filter-group">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                className={`btn btn-sm ${statusFilter === filter.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setStatusFilter(filter.id)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
          {statusFilter !== 'all' && (
            <div className="filter-pill">
              <span>Filter: {STATUS_LABELS[statusFilter] || statusFilter}</span>
              <button type="button" onClick={() => setStatusFilter('all')} aria-label="Clear filter">
                X
              </button>
            </div>
          )}
        </div>

        {error && <div style={{ padding:12, background:'var(--color-danger-subtle)', border:'1px solid var(--color-danger)', borderRadius:'var(--radius)', fontSize:'var(--text-sm)', color:'var(--color-danger)' }}>{error}</div>}

        {loading ? <SkeletonTable rows={8} cols={5}/> : (
          <>
            {viewMode==='table' && (
              filtered.length===0 ? <EmptyState type="leads" title="No deals yet" desc="Create your first deal"/> : (
                <div className="card">
                  <table className="data-table">
                    <thead><tr>
                      <th style={{ width:36 }}><input type="checkbox" className="checkbox-input"/></th>
                      <th>Organization</th><th>Revenue</th><th>Stage</th><th>Status</th><th>Modified</th><th style={{ width:60, textAlign:'right' }}>Actions</th>
                    </tr></thead>
                    <motion.tbody ref={tbodyRef} variants={staggerContainer} initial="initial" animate="animate">
                      {filtered.map(d=>(
                        <motion.tr
                          key={d.id}
                          variants={staggerItem}
                          className={d.status === 'lost' ? 'deal-row deal-row-lost' : 'deal-row'}
                        >
                          <td><input type="checkbox" className="checkbox-input"/></td>
                          <td style={{ fontWeight:'var(--weight-medium)' }}>{d.org}</td>
                          <td style={{ color:'var(--color-text-secondary)' }}>{d.revenue}</td>
                          <td><span className={`badge ${STAGE_BADGE[d.stage]||'badge-muted'}`}>{formatStage(d.stage)}</span></td>
                          <td><span className={`badge ${STATUS_BADGE[d.status]||'badge-muted'}`}>{STATUS_LABELS[d.status] || d.status || 'Unknown'}</span></td>
                          <td style={{ color:'var(--color-text-tertiary)', fontSize:'var(--text-sm)' }}>{d.modified}</td>
                          <td style={{ textAlign:'right' }}>
                            <div style={{ position:'relative', display:'inline-block' }}>
                              <button className="btn btn-ghost btn-icon" onClick={()=>setActionMenu(actionMenu===d.id?null:d.id)} aria-label="Actions"><MoreHorizontal size={14}/></button>
                              {actionMenu===d.id && (
                                <div className="dropdown-menu" style={{ position:'absolute', right:0, top:'calc(100% + 4px)' }}>
                                  <button className="dropdown-item" onClick={()=>setActionMenu(null)}><Eye size={14}/> View</button>
                                  {canDelete && <button className="dropdown-item dropdown-item-danger" onClick={()=>{handleDelete(d.id);setActionMenu(null);}}><Trash2 size={14}/> Delete</button>}
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

            {viewMode==='kanban' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
                {Object.entries(grouped).map(([status,items])=>(
                  <div key={status} className="kanban-column">
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                      <span className={`badge ${STAGE_BADGE[status]||'badge-muted'}`}>{STAGE_LABELS[status]||'Other'}</span>
                      <span style={{ fontSize:'var(--text-xs)', color:'var(--color-text-tertiary)' }}>{items.length}</span>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {items.map(d=>(
                        <div key={d.id} className="kanban-card">
                          <div style={{ fontWeight:'var(--weight-medium)', marginBottom:4 }}>{d.org}</div>
                          <div style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)' }}>{d.revenue}</div>
                          {canDelete && <button onClick={()=>handleDelete(d.id)} className="btn btn-danger btn-sm" style={{ marginTop:8 }}><Trash2 size={12}/> Delete</button>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasMore && <div style={{ display:'flex', justifyContent:'center' }}><button onClick={()=>fetchDeals(totalLoaded,true)} disabled={isLoadingMore} className="btn btn-secondary">{isLoadingMore?'Loading...':'Load More'}</button></div>}
          </>
        )}

        <AnimatePresence>
          {isCreateOpen && (
            <motion.div className="modal-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={()=>setIsCreateOpen(false)}>
              <motion.div className="modal-content" style={{ maxWidth:600 }} onClick={e=>e.stopPropagation()} initial={{ opacity:0,scale:0.97,y:4 }} animate={{ opacity:1,scale:1,y:0 }} exit={{ opacity:0,scale:0.97 }}>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--color-border)' }}>
                  <h3 className="section-title">Create Deal</h3>
                  <button onClick={()=>setIsCreateOpen(false)} className="btn btn-ghost btn-icon" aria-label="Close"><X size={18}/></button>
                </div>
                <form id="deal-form" onSubmit={handleSave} style={{ padding:20, display:'flex', flexDirection:'column', gap:14, maxHeight:'60vh', overflowY:'auto' }}>
                  <div><label className="label">Organization Name</label><input type="text" className="input" value={formData.orgName} onChange={e=>setFormData({...formData,orgName:e.target.value})}/></div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div><label className="label">Website</label><input type="text" className="input" value={formData.website} onChange={e=>setFormData({...formData,website:e.target.value})}/></div>
                    <div><label className="label">Industry</label><select className="input" value={formData.industry} onChange={e=>setFormData({...formData,industry:e.target.value})}><option value="">Select</option><option>Software</option><option>Finance</option><option>Manufacturing</option><option>Retail</option></select></div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div><label className="label">Revenue</label><input type="text" className="input" value={formData.revenue} onChange={e=>setFormData({...formData,revenue:e.target.value})}/></div>
                    <div><label className="label">Stage</label><select className="input" value={formData.status} onChange={e=>setFormData({...formData,status:e.target.value})}><option>Prospecting</option><option>Qualification</option><option>Proposal</option><option>Closed</option></select></div>
                  </div>
                  <div style={{ padding:14, background:'var(--color-bg-hover)', borderRadius:'var(--radius)', border:'1px solid var(--color-border)' }}>
                    <div style={{ fontSize:'var(--text-sm)', fontWeight:'var(--weight-semibold)', marginBottom:10, color:'var(--color-text-secondary)' }}>Primary Contact (Optional)</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      <div><label className="label">First Name</label><input type="text" className="input" value={formData.firstName} onChange={e=>setFormData({...formData,firstName:e.target.value})}/></div>
                      <div><label className="label">Last Name</label><input type="text" className="input" value={formData.lastName} onChange={e=>setFormData({...formData,lastName:e.target.value})}/></div>
                      <div><label className="label">Email</label><input type="email" className="input" value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})}/></div>
                      <div><label className="label">Mobile</label><input type="text" className="input" value={formData.mobile} onChange={e=>setFormData({...formData,mobile:e.target.value})}/></div>
                    </div>
                  </div>
                </form>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'12px 20px', borderTop:'1px solid var(--color-border)' }}>
                  <button type="button" onClick={()=>setIsCreateOpen(false)} className="btn btn-ghost">Discard</button>
                  <button type="submit" form="deal-form" disabled={isSaving} className="btn btn-primary">{isSaving?'Creating...':'Create Deal'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default Deals;
