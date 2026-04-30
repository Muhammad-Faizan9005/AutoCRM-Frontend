import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, Download, X, List, KanbanSquare, RotateCcw 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../api/client';

const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
};

const normalizeStatus = (status) => (status || '').toString().trim().toLowerCase();

const formatLeadStatus = (status) => {
  const normalized = normalizeStatus(status);
  return STATUS_LABELS[normalized] || status || 'Unknown';
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
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
  const [viewMode, setViewMode] = useState('Table');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const latestRequestId = useRef(0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({ name: true, org: true, status: true, email: true, mobile: true, modified: true });

  const [formData, setFormData] = useState({
    salutation: 'Salutation',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    gender: 'Gender',
    organization: '',
    website: '',
    employees: '1-10',
    territory: 'Territory',
    revenue: 'PKR 0.00',
    industry: 'Industry',
    status: 'New'
  });

  const canDelete = user?.role === 'admin';

  const resetForm = () => {
    setFormData({
      salutation: 'Salutation',
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      gender: 'Gender',
      organization: '',
      website: '',
      employees: '1-10',
      territory: 'Territory',
      revenue: 'PKR 0.00',
      industry: 'Industry',
      status: 'New'
    });
  };

  const fetchLeads = useCallback(async () => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    setLoading(true);
    setError('');

    try {
      const data = await apiFetch('/api/leads/');
      if (requestId !== latestRequestId.current) return;
      setLeads(data.map(mapLeadToRow));
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err?.message || 'Unable to load leads.');
    } finally {
      if (requestId === latestRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return leads;

    return leads.filter((lead) => [lead.name, lead.org, lead.email]
      .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [leads, searchTerm]);

  const handleSort = (key) => {
    const sorted = [...leads].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
    setLeads(sorted);
    setActiveDropdown(null);
  };

  const handleSaveLead = async (e) => {
    e?.preventDefault();
    setError('');

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const name = [firstName, lastName].filter(Boolean).join(' ').trim();

    if (!name) {
      setError('First name is required to create a lead.');
      return;
    }

    const payload = {
      name,
      email: formData.email.trim() || undefined,
      phone: formData.mobile.trim() || undefined,
      company: formData.organization.trim() || undefined,
      status: normalizeStatus(formData.status) || 'new',
      source: formData.website.trim() || undefined,
    };

    setIsSaving(true);
    try {
      const created = await apiFetch('/api/leads/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setLeads((prev) => [mapLeadToRow(created), ...prev]);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err?.message || 'Unable to create lead.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLead = async (id) => {
    if (!canDelete) return;
    const confirmed = window.confirm('Delete this lead?');
    if (!confirmed) return;

    setError('');
    try {
      await apiFetch(`/api/leads/${id}`, { method: 'DELETE' });
      setLeads((prev) => prev.filter((lead) => lead.id !== id));
    } catch (err) {
      setError(err?.message || 'Unable to delete lead.');
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(leads);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "CRM_Leads.xlsx");
    setIsExportOpen(false);
  };

  const groupedLeads = useMemo(() => {
    const groups = {
      new: leads.filter((lead) => normalizeStatus(lead.status) === 'new'),
      contacted: leads.filter((lead) => normalizeStatus(lead.status) === 'contacted'),
      qualified: leads.filter((lead) => normalizeStatus(lead.status) === 'qualified'),
    };

    const other = leads.filter((lead) => !['new', 'contacted', 'qualified'].includes(normalizeStatus(lead.status)));
    if (other.length) {
      groups.other = other;
    }

    return groups;
  }, [leads]);

  return (
    <div className="min-h-screen p-4 space-y-3 bg-gray-50 font-sans text-sm">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-black tracking-tight">Leads</h1>

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
          <button onClick={fetchLeads} className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">
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
        <div className="text-xs text-gray-500">Loading leads...</div>
      )}

      {/* SEARCH + ACTIONS */}
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2 text-gray-400" size={16}/>
          <input type="text" placeholder="Search leads..." className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 w-full text-xs"
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

       {/* ACTION BUTTONS */} <div className="flex gap-2"> {/* FILTER */} <div className="relative"> <button onClick={() => setActiveDropdown(activeDropdown === 'filter' ? null : 'filter')} className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs flex gap-1 items-center" > <Filter size={14}/> Filter </button> {activeDropdown === 'filter' && ( <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow w-40 z-50 text-xs"> {['Status', 'Revenue', 'Organization'].map(f => ( <div key={f} className="p-2 hover:bg-gray-100 cursor-pointer">{f}</div> ))} </div> )} </div> {/* SORT */} <div className="relative"> <button onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')} className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs flex gap-1 items-center" > <ArrowUpDown size={14}/> Sort </button> {activeDropdown === 'sort' && ( <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow w-36 z-50 text-xs"> {['org', 'status', 'modified'].map(s => ( <div key={s} onClick={() => handleSort(s)} className="p-2 hover:bg-gray-100 cursor-pointer capitalize" > {s} </div> ))} </div> )} </div> {/* COLUMNS */} <div className="relative"> <button onClick={() => setActiveDropdown(activeDropdown === 'cols' ? null : 'cols')} className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs flex gap-1 items-center" > <LayoutPanelLeft size={14}/> Columns </button> {activeDropdown === 'cols' && ( <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow w-36 z-50 text-xs"> {Object.keys(visibleColumns).map(col => ( <div key={col} onClick={() => setVisibleColumns({ ...visibleColumns, [col]: !visibleColumns[col] })} className="flex justify-between p-2 hover:bg-gray-100 cursor-pointer capitalize" > {col} {visibleColumns[col] && '✓'} </div> ))} </div> )} </div>
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
            {visibleColumns.name && <div>Name</div>}
            {visibleColumns.org && <div>Organization</div>}
            {visibleColumns.status && <div>Status</div>}
            {visibleColumns.email && <div>Email</div>}
            {visibleColumns.mobile && <div>Mobile</div>}
            {visibleColumns.modified && <div>Modified</div>}
            <div>Action</div>
          </div>

          {filteredLeads.map(l => (
            <div key={l.id} className="grid grid-cols-[30px_1fr_1fr_1fr_1fr_1fr_1fr_80px] bg-white border-b border-gray-300 px-2 py-1 items-center text-xs">
              <div><input type="checkbox"/></div>
              {visibleColumns.name && <div className="font-bold">{l.name}</div>}
              {visibleColumns.org && <div>{l.org}</div>}
              {visibleColumns.status && <div>{formatLeadStatus(l.status)}</div>}
              {visibleColumns.email && <div>{l.email}</div>}
              {visibleColumns.mobile && <div>{l.mobile}</div>}
              {visibleColumns.modified && <div className="text-gray-400 italic">{l.modified}</div>}
              <div className="flex flex-col justify-end text-right h-full pr-10">
                {canDelete && (
                  <button
                    onClick={() => handleDeleteLead(l.id)}
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
          {Object.entries(groupedLeads).map(([status, items]) => (
            <div key={status} className="bg-gray-100 rounded-lg p-3">
              <h3 className="text-xs font-bold mb-2">{STATUS_LABELS[status] || 'Other'}</h3>
              <div className="space-y-2">
                {items.map(l => (
                  <div key={l.id} className="bg-white p-2 rounded shadow text-xs border">
                    <div className="font-bold">{l.name}</div>
                    <div className="text-gray-500">{l.org}</div>
                    {canDelete && (
                      <button onClick={() => handleDeleteLead(l.id)} className="text-red-500 text-[10px] mt-1">Delete</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredLeads.length === 0 && (
        <div className="text-xs text-gray-500">No leads found.</div>
      )}

      {/* EXPORT POPUP */}
      {isExportOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-80 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm">Export Leads</h3>
              <X size={16} onClick={()=>setIsExportOpen(false)} className="cursor-pointer"/>
            </div>
            <button onClick={exportToExcel} className="w-full bg-black text-white py-2 rounded text-xs font-bold">Download Excel</button>
          </div>
        </div>
      )}

{/* --- CREATE LEAD MODAL (Minimal Black/White/Grey, Compact) --- */}
{isCreateModalOpen && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm font-sans p-3">
    <div className="bg-white w-full max-w-2xl rounded-lg shadow-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">

      {/* Header */}
      <div className="flex justify-between items-center px-5 py-2 border-b border-gray-200 sticky top-0 bg-white z-20">
        <h3 className="text-md font-semibold text-gray-900">Create Lead</h3>
        <div
          className="p-1 hover:bg-gray-100 rounded-full cursor-pointer transition"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <X size={18} className="text-gray-400 hover:text-gray-700" />
        </div>
      </div>

      {/* Scrollable Form */}
      <div className="overflow-y-auto max-h-[65vh] p-5">
        <form id="create-lead-form" onSubmit={handleSaveLead} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">

          {/* Personal Info */}
          <div className="col-span-1 md:col-span-2 bg-gray-50 p-3 rounded-md border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Salutation</label>
                <select
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData.salutation}
                  onChange={e => setFormData({...formData, salutation: e.target.value})}
                >
                  <option>Salutation</option>
                  <option>Mr.</option>
                  <option>Ms.</option>
                  <option>Dr.</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="First Name"
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData.firstName}
                  onChange={e => setFormData({...formData, firstName: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Last Name</label>
                <input
                  type="text"
                  placeholder="Last Name"
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData.lastName}
                  onChange={e => setFormData({...formData, lastName: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="col-span-1 md:col-span-2 bg-gray-50 p-3 rounded-md border border-gray-200 mt-2">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Email</label>
                <input
                  type="email"
                  placeholder="example@mail.com"
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Mobile No.</label>
                <input
                  type="text"
                  placeholder="0300XXXXXXX"
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData.mobile}
                  onChange={e => setFormData({...formData, mobile: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Gender</label>
                <select
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData.gender}
                  onChange={e => setFormData({...formData, gender: e.target.value})}
                >
                  <option>Gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Organization Info */}
          <div className="col-span-1 md:col-span-2 bg-gray-50 p-3 rounded-md border border-gray-200 mt-2">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Organization Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Organization</label>
                <input
                  type="text"
                  placeholder="Organization Name"
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData.organization}
                  onChange={e => setFormData({...formData, organization: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Website</label>
                <input
                  type="text"
                  placeholder="www.website.com"
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData.website}
                  onChange={e => setFormData({...formData, website: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">Employees</label>
                <select
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData.employees}
                  onChange={e => setFormData({...formData, employees: e.target.value})}
                >
                  <option>1-10</option>
                  <option>11-50</option>
                  <option>51-200</option>
                  <option>201+</option>
                </select>
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
          form="create-lead-form"
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

export default Leads;
