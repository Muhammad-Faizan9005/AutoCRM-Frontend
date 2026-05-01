import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, Download, RotateCcw, List, KanbanSquare, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../api/client';

const STAGE_LABELS = {
  prospecting: 'Prospecting',
  qualification: 'Qualification',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed: 'Closed',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

const normalizeStage = (stage) => {
  const normalized = (stage || '').toString().trim().toLowerCase().replace(/\s+/g, '_');
  return normalized || 'prospecting';
};

const formatStage = (stage) => STAGE_LABELS[normalizeStage(stage)] || stage || 'Unknown';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const inferCurrency = (value) => {
  const text = String(value || '').toUpperCase();
  if (text.includes('PKR') || text.includes('RS')) return 'PKR';
  if (text.includes('EUR') || text.includes('€')) return 'EUR';
  if (text.includes('GBP') || text.includes('£')) return 'GBP';
  if (text.includes('USD') || text.includes('$')) return 'USD';
  return 'USD';
};

const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const normalized = String(value).replace(/[^0-9.-]+/g, '');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const formatMoney = (value, currency) => {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch (error) {
    return `${currency || 'USD'} ${numeric.toFixed(2)}`;
  }
};

const mapDealToRow = (deal, organizationIndex) => {
  const orgName = organizationIndex.get(deal.organization_id) || deal.organization_id || '-';
  return {
    id: deal.id,
    org: orgName,
    revenue: formatMoney(deal.value, deal.currency),
    status: normalizeStage(deal.stage),
    email: '-',
    mobile: '-',
    modified: formatDate(deal.updated_at),
  };
};

const Deals = ({ user }) => {
  const [viewMode, setViewMode] = useState('Table');
  const [dealRecords, setDealRecords] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({ org: true, revenue: true, status: true, email: true, mobile: true, modified: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const latestRequestId = useRef(0);

  const [formData, setFormData] = useState({
    orgName: '',
    website: '',
    revenue: '',
    industry: 'Industry',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    status: 'Qualification'
  });

  const organizationIndex = useMemo(() => {
    const entries = organizations.map((org) => [org.id, org.name || '-']);
    return new Map(entries);
  }, [organizations]);

  const deals = useMemo(
    () => dealRecords.map((deal) => mapDealToRow(deal, organizationIndex)),
    [dealRecords, organizationIndex]
  );

  const canDelete = user?.role === 'admin';

  const resetForm = () => {
    setFormData({
      orgName: '',
      website: '',
      revenue: '',
      industry: 'Industry',
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      status: 'Qualification'
    });
  };

  const fetchDeals = useCallback(async () => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    setLoading(true);
    setError('');

    try {
      const data = await apiFetch('/api/deals/');
      if (requestId !== latestRequestId.current) return;
      setDealRecords(data);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err?.message || 'Unable to load deals.');
    } finally {
      if (requestId === latestRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  const fetchOrganizations = useCallback(async () => {
    try {
      const data = await apiFetch('/api/organizations/');
      setOrganizations(data);
    } catch (err) {
      setError(err?.message || 'Unable to load organizations.');
    }
  }, []);

  useEffect(() => {
    fetchDeals();
    fetchOrganizations();
  }, [fetchDeals, fetchOrganizations]);

  const ensureOrganizationId = async () => {
    const name = formData.orgName.trim();
    if (!name) return null;

    const existing = organizations.find(
      (org) => org.name && org.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing.id;

    const payload = {
      name,
      website: formData.website.trim() || undefined,
      industry: formData.industry !== 'Industry' ? formData.industry : undefined,
      revenue: parseAmount(formData.revenue),
    };

    const created = await apiFetch('/api/organizations/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setOrganizations((prev) => [created, ...prev]);
    return created.id;
  };

  const ensureLeadId = async () => {
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const name = [firstName, lastName].filter(Boolean).join(' ').trim();
    const email = formData.email.trim();
    const phone = formData.mobile.trim();

    if (!name && !email && !phone) return null;

    const payload = {
      name: name || 'New Lead',
      email: email || undefined,
      phone: phone || undefined,
      company: formData.orgName.trim() || undefined,
      status: 'new',
    };

    const created = await apiFetch('/api/leads/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return created.id;
  };

  const filteredDeals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return deals;

    return deals.filter((deal) => String(deal.org).toLowerCase().includes(term));
  }, [deals, searchTerm]);

  const handleSort = (key) => {
    const sorted = [...dealRecords].sort((a, b) => {
      const mappedA = mapDealToRow(a, organizationIndex);
      const mappedB = mapDealToRow(b, organizationIndex);
      return String(mappedA[key]).localeCompare(String(mappedB[key]));
    });
    setDealRecords(sorted);
    setActiveDropdown(null);
  };

  const handleSaveDeal = async (e) => {
    e.preventDefault();
    setError('');

    setIsSaving(true);
    try {
      const organizationId = await ensureOrganizationId();
      const leadId = await ensureLeadId();
      const amount = parseAmount(formData.revenue);

      const payload = {
        organization_id: organizationId || undefined,
        lead_id: leadId || undefined,
        stage: normalizeStage(formData.status),
        value: amount,
        currency: inferCurrency(formData.revenue),
      };

      const created = await apiFetch('/api/deals/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setDealRecords((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err?.message || 'Unable to create deal.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDeal = async (id) => {
    if (!canDelete) return;
    const confirmed = window.confirm('Delete this deal?');
    if (!confirmed) return;

    setError('');
    try {
      await apiFetch(`/api/deals/${id}`, { method: 'DELETE' });
      setDealRecords((prev) => prev.filter((deal) => deal.id !== id));
    } catch (err) {
      setError(err?.message || 'Unable to delete deal.');
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(deals);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Deals");
    XLSX.writeFile(wb, "CRM_Deals.xlsx");
    setIsExportOpen(false);
  };

  const groupedDeals = useMemo(() => {
    const groups = {
      qualification: deals.filter((deal) => normalizeStage(deal.status) === 'qualification'),
      proposal: deals.filter((deal) => normalizeStage(deal.status) === 'proposal'),
      closed: deals.filter((deal) => normalizeStage(deal.status) === 'closed'),
    };

    const other = deals.filter((deal) => !['qualification', 'proposal', 'closed'].includes(normalizeStage(deal.status)));
    if (other.length) {
      groups.other = other;
    }

    return groups;
  }, [deals]);

  return (
    <div className="min-h-screen p-4 space-y-3 bg-gray-50 font-sans text-sm">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-black tracking-tight">Deals</h1>

          {/* TABLE / KANBAN SWITCH */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown==='view'?null:'view')}
              className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-md bg-white text-xs">
              {viewMode === 'Table' ? <List size={14}/> : <KanbanSquare size={14}/>} {viewMode}
            </button>
            {activeDropdown==='view' && (
              <div className="absolute top-full mt-1 left-0 bg-white border rounded shadow w-28 z-10 text-xs">
                <div onClick={()=>{setViewMode('Table');setActiveDropdown(null)}} className="p-2 hover:bg-gray-100 cursor-pointer">Table</div>
                <div onClick={()=>{setViewMode('Kanban');setActiveDropdown(null)}} className="p-2 hover:bg-gray-100 cursor-pointer">Kanban</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchDeals} className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">
            <RotateCcw size={18} />
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-900 font-semibold">
            <Plus size={16} /> Create
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-xs text-gray-500">Loading deals...</div>
      )}

      {/* SEARCH + ACTIONS */}
<div className="flex justify-between items-center">
  {/* SEARCH */}
  <div className="relative w-64">
    <Search className="absolute left-2 top-2 text-gray-400" size={16}/>
    <input
      type="text"
      placeholder="Search deals..."
      className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 w-full text-xs"
      onChange={e => setSearchTerm(e.target.value)}
    />
  </div>

  {/* ACTION BUTTONS */}
  <div className="flex gap-2">

    {/* FILTER */}
    <div className="relative">
      <button
        onClick={() => setActiveDropdown(activeDropdown === 'filter' ? null : 'filter')}
        className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs flex gap-1 items-center"
      >
        <Filter size={14}/> Filter
      </button>
      {activeDropdown === 'filter' && (
        <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow w-40 z-50 text-xs">
          {['Status', 'Revenue', 'Organization'].map(f => (
            <div key={f} className="p-2 hover:bg-gray-100 cursor-pointer">{f}</div>
          ))}
        </div>
      )}
    </div>

    {/* SORT */}
    <div className="relative">
      <button
        onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
        className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs flex gap-1 items-center"
      >
        <ArrowUpDown size={14}/> Sort
      </button>
      {activeDropdown === 'sort' && (
        <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow w-36 z-50 text-xs">
          {['org', 'status', 'modified'].map(s => (
            <div
              key={s}
              onClick={() => handleSort(s)}
              className="p-2 hover:bg-gray-100 cursor-pointer capitalize"
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* COLUMNS */}
    <div className="relative">
      <button
        onClick={() => setActiveDropdown(activeDropdown === 'cols' ? null : 'cols')}
        className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs flex gap-1 items-center"
      >
        <LayoutPanelLeft size={14}/> Columns
      </button>
      {activeDropdown === 'cols' && (
        <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow w-36 z-50 text-xs">
          {Object.keys(visibleColumns).map(col => (
            <div
              key={col}
              onClick={() => setVisibleColumns({ ...visibleColumns, [col]: !visibleColumns[col] })}
              className="flex justify-between p-2 hover:bg-gray-100 cursor-pointer capitalize"
            >
              {col} {visibleColumns[col] && '✓'}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* EXPORT */}
    <button
      onClick={() => setIsExportOpen(true)}
      className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-md bg-white text-xs"
    >
      <Download size={14}/> Export
    </button>

  </div>
</div>


      {/* TABLE VIEW */}
      {viewMode === 'Table' && !loading && (
        <div className="mt-2 flex flex-col gap-1">
          <div className="grid grid-cols-[30px_1fr_1fr_1fr_1fr_1fr_1fr_80px] bg-black text-white text-[10px] uppercase font-bold px-2 py-1 rounded-t-md">
            <div><input type="checkbox"/></div>
            {visibleColumns.org && <div>Organization</div>}
            {visibleColumns.revenue && <div>Revenue</div>}
            {visibleColumns.status && <div>Status</div>}
            {visibleColumns.email && <div>Email</div>}
            {visibleColumns.mobile && <div>Mobile</div>}
            {visibleColumns.modified && <div>Modified</div>}
            <div>Action</div>
          </div>

          {filteredDeals.map(d => (
            <div key={d.id} className="grid grid-cols-[30px_1fr_1fr_1fr_1fr_1fr_1fr_80px] bg-white border-b border-gray-300 px-2 py-1 items-center text-xs">
              <div><input type="checkbox"/></div>
              {visibleColumns.org && <div className="font-bold">{d.org}</div>}
              {visibleColumns.revenue && <div>{d.revenue}</div>}
              {visibleColumns.status && <div>{formatStage(d.status)}</div>}
              {visibleColumns.email && <div>{d.email}</div>}
              {visibleColumns.mobile && <div>{d.mobile}</div>}
              {visibleColumns.modified && <div className="text-gray-400 italic">{d.modified}</div>}
              <div className="flex flex-col justify-end text-right h-full pr-10">
                {canDelete && (
                  <button
                    onClick={() => handleDeleteDeal(d.id)}
                    className="text-red-500 text-xs"
                  >
                    Delete
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'Kanban' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {Object.entries(groupedDeals).map(([status, items]) => (
            <div key={status} className="bg-gray-100 rounded-lg p-3">
              <h3 className="text-xs font-bold mb-2">{STAGE_LABELS[status] || 'Other'}</h3>
              <div className="space-y-2">
                {items.map(d => (
                  <div key={d.id} className="bg-white p-2 rounded shadow text-xs border">
                    <div className="font-bold">{d.org}</div>
                    <div className="text-gray-500">{d.revenue}</div>
                    {canDelete && (
                      <button onClick={() => handleDeleteDeal(d.id)} className="text-red-500 text-[10px] mt-1">Delete</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredDeals.length === 0 && (
        <div className="text-xs text-gray-500">No deals found.</div>
      )}

      {/* EXPORT POPUP */}
      {isExportOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-80 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm">Export Deals</h3>
              <X size={16} onClick={()=>setIsExportOpen(false)} className="cursor-pointer"/>
            </div>
            <button onClick={exportToExcel} className="w-full bg-black text-white py-2 rounded text-xs font-bold">Download Excel</button>
          </div>
        </div>
      )}
{/* --- CREATE DEAL MODAL (Minimal Black/White/Grey, Compact) --- */}
{isCreateModalOpen && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm font-sans p-3">
    <div className="bg-white w-full max-w-2xl rounded-lg shadow-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">

      {/* Header */}
      <div className="flex justify-between items-center px-5 py-2 border-b border-gray-200 sticky top-0 bg-white z-20">
        <h3 className="text-md font-semibold text-gray-900">Create Deal</h3>
        <RotateCcw
          size={18}
          className="cursor-pointer text-gray-400 hover:text-gray-700 p-1 rounded-full transition"
          onClick={() => setIsCreateModalOpen(false)}
        />
      </div>

      {/* Scrollable Form */}
      <div className="overflow-y-auto max-h-[65vh] p-5">
        <form id="create-deal-form" onSubmit={handleSaveDeal} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="col-span-1 md:col-span-2">
            <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Organization Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
              value={formData.orgName}
              onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Website</label>
            <input
              type="text"
              className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Industry</label>
            <select
              className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            >
              <option>Industry</option>
              <option>Software</option>
              <option>Finance</option>
              <option>Manufacturing</option>
              <option>Retail</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Revenue</label>
            <input
              type="text"
              className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
              value={formData.revenue}
              onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Stage</label>
            <select
              className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option>Prospecting</option>
              <option>Qualification</option>
              <option>Proposal</option>
              <option>Closed</option>
            </select>
          </div>

          <div className="col-span-1 md:col-span-2 bg-gray-50 p-3 rounded-md border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Primary Contact (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">First Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Last Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Email</label>
                <input
                  type="email"
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Mobile</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                />
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 px-5 py-2 border-t bg-white sticky bottom-0 z-20">
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(false)}
          className="px-4 py-1.5 text-gray-600 font-medium text-sm hover:bg-gray-100 rounded-md transition"
        >
          Discard
        </button>
        <button
          type="submit"
          form="create-deal-form"
          disabled={isSaving}
          className="px-5 py-1.5 bg-gray-900 text-white font-medium text-sm rounded-md shadow hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-60"
        >
          {isSaving ? 'Creating...' : 'Create'}
        </button>
      </div>

    </div>
  </div>
)}

    </div>
  );
};

export default Deals;
