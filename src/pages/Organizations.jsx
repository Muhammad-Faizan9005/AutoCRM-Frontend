import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, Download, X, List as ListIcon, LayoutGrid, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../api/client';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const normalized = String(value).replace(/[^0-9.-]+/g, '');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const formatRevenue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return numeric.toLocaleString();
};

const mapOrganizationToRow = (org) => ({
  id: org.id,
  org: org.name || '-',
  website: org.website || '-',
  industry: org.industry || '-',
  revenue: formatRevenue(org.revenue),
  modified: formatDate(org.updated_at),
});

const Organizations = ({ user }) => {
  // --- STATES ---
  const [viewMode, setViewMode] = useState('Table');
  const [orgs, setOrgs] = useState([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({ org: true, website: true, industry: true, revenue: true, modified: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const latestRequestId = useRef(0);

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: 'Industry',
    revenue: '',
    address: 'Address',
    territory: 'Territory',
    employees: '1-10'
  });

  const canDelete = user?.role === 'admin';

  const resetForm = () => {
    setFormData({
      name: '',
      website: '',
      industry: 'Industry',
      revenue: '',
      address: 'Address',
      territory: 'Territory',
      employees: '1-10'
    });
  };

  const fetchOrganizations = useCallback(async (skip = 0, append = false) => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    
    if (!append) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError('');

    try {
      const limit = append ? 10 : 20;
      const data = await apiFetch(`/api/organizations/?skip=${skip}&limit=${limit}`);
      if (requestId !== latestRequestId.current) return;
      
      const mappedData = data.map(mapOrganizationToRow);
      
      if (append) {
        setOrgs((prev) => [...prev, ...mappedData]);
      } else {
        setOrgs(mappedData);
      }
      
      setTotalLoaded((prev) => prev + mappedData.length);
      setHasMore(mappedData.length === limit);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err?.message || 'Unable to load organizations.');
    } finally {
      if (requestId === latestRequestId.current) {
        if (!append) {
          setLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    fetchOrganizations(0, false);
  }, [fetchOrganizations]);

  const handleLoadMore = async () => {
    await fetchOrganizations(totalLoaded, true);
  };
  const filteredOrgs = useMemo(() => {
    return orgs.filter(o => o.org.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [orgs, searchTerm]);

  const handleSort = (key) => {
    const sorted = [...orgs].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
    setOrgs(sorted);
    setActiveDropdown(null);
  };

  const handleSaveOrg = async (e) => {
    e.preventDefault();
    setError('');

    const name = formData.name.trim();
    if (!name) {
      setError('Organization name is required.');
      return;
    }

    const payload = {
      name,
      website: formData.website.trim() || undefined,
      industry: formData.industry !== 'Industry' ? formData.industry : undefined,
      revenue: parseAmount(formData.revenue),
      address: formData.address !== 'Address' ? formData.address : undefined,
    };

    setIsSaving(true);
    try {
      const created = await apiFetch('/api/organizations/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setOrgs((prev) => [mapOrganizationToRow(created), ...prev]);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err?.message || 'Unable to create organization.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrg = async (id) => {
    if (!canDelete) return;
    const confirmed = window.confirm('Delete this organization?');
    if (!confirmed) return;

    setError('');
    try {
      await apiFetch(`/api/organizations/${id}`, { method: 'DELETE' });
      setOrgs((prev) => prev.filter((org) => org.id !== id));
    } catch (err) {
      setError(err?.message || 'Unable to delete organization.');
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(orgs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Organizations");
    XLSX.writeFile(wb, "CRM_Organizations.xlsx");
    setIsExportOpen(false);
  };

  return (
    <div className="min-h-screen p-4 space-y-3 bg-gray-50 font-sans text-sm">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-black tracking-tight">Organizations</h1>

          {/* TABLE / KANBAN SWITCH */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'view' ? null : 'view')} className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-md bg-white text-xs">
              {viewMode === 'Table' ? <ListIcon size={14}/> : <LayoutGrid size={14}/>} {viewMode}
            </button>
            {activeDropdown==='view' && (
              <div className="absolute top-full mt-1 left-0 bg-white border rounded shadow w-28 z-10 text-xs">
                <div onClick={()=>{setViewMode('Table'); setActiveDropdown(null)}} className="p-2 hover:bg-gray-100 cursor-pointer">Table</div>
                <div onClick={()=>{setViewMode('Kanban'); setActiveDropdown(null)}} className="p-2 hover:bg-gray-100 cursor-pointer">Kanban</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => { setTotalLoaded(0); fetchOrganizations(0, false); }} className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">
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
        <div className="text-xs text-gray-500">Loading organizations...</div>
      )}

      {/* SEARCH + ACTIONS */}
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2 text-gray-400" size={16}/>
          <input type="text" placeholder="Search organizations..." className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 w-full text-xs" onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div className="flex gap-2">
          {/* FILTER */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'filter' ? null : 'filter')} className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs flex gap-1 items-center">
              <Filter size={14}/> Filter
            </button>
            {activeDropdown === 'filter' && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow w-40 z-50 text-xs">
                {['Industry','Website'].map(f=>(<div key={f} className="p-2 hover:bg-gray-100 cursor-pointer">{f}</div>))}
              </div>
            )}
          </div>

          {/* SORT */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')} className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs flex gap-1 items-center">
              <ArrowUpDown size={14}/> Sort
            </button>
            {activeDropdown==='sort' && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow w-36 z-50 text-xs">
                {['org','industry','modified'].map(s=>(<div key={s} onClick={()=>handleSort(s)} className="p-2 hover:bg-gray-100 cursor-pointer capitalize">{s}</div>))}
              </div>
            )}
          </div>

          {/* COLUMNS */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'cols' ? null : 'cols')} className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs flex gap-1 items-center">
              <LayoutPanelLeft size={14}/> Columns
            </button>
            {activeDropdown==='cols' && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow w-36 z-50 text-xs">
                {Object.keys(visibleColumns).map(col=>(
                  <div key={col} onClick={()=>setVisibleColumns({...visibleColumns,[col]:!visibleColumns[col]})} className="flex justify-between p-2 hover:bg-gray-100 cursor-pointer capitalize">{col} {visibleColumns[col] && '✓'}</div>
                ))}
              </div>
            )}
          </div>

          {/* EXPORT */}
          <button onClick={()=>setIsExportOpen(true)} className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-md bg-white text-xs">
            <Download size={14}/> Export
          </button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode==='Table' && !loading && (
        <div className="mt-2 flex flex-col gap-1">
          <div className="grid grid-cols-[30px_1fr_1fr_1fr_1fr_1fr_80px] bg-black text-white text-[10px] uppercase font-bold px-2 py-1 rounded-t-md">
            <div><input type="checkbox"/></div>
            {visibleColumns.org && <div>Organization</div>}
            {visibleColumns.website && <div>Website</div>}
            {visibleColumns.industry && <div>Industry</div>}
            {visibleColumns.revenue && <div>Revenue</div>}
            {visibleColumns.modified && <div>Modified</div>}
            <div>Action</div>
          </div>

          {filteredOrgs.map(o=>(
            <div key={o.id} className="grid grid-cols-[30px_1fr_1fr_1fr_1fr_1fr_80px] bg-white border-b border-gray-300 px-2 py-1 items-center text-xs">
              <div><input type="checkbox"/></div>
              {visibleColumns.org && <div className="font-bold">{o.org}</div>}
              {visibleColumns.website && <div>{o.website}</div>}
              {visibleColumns.industry && <div>{o.industry}</div>}
              {visibleColumns.revenue && <div>{o.revenue}</div>}
              {visibleColumns.modified && <div className="text-gray-400 italic text-[10px]">{o.modified}</div>}
              <div className="text-right pr-10">
                {canDelete && (
                  <button
                    onClick={() => handleDeleteOrg(o.id)}
                    className="text-red-500 text-xs "
                  >
                    Delete
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* LOAD MORE BUTTON */}
      {!loading && hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
          >
            {isLoadingMore ? 'Loading more...' : 'Load More'}
          </button>
        </div>
      )}

      {!loading && filteredOrgs.length === 0 && (
        <div className="text-xs text-gray-500">No organizations found.</div>
      )}

     {/* 4. NEW ORGANIZATION MODAL */}
{isCreateModalOpen && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
      
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">New Organization</h3>
        <div 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <X size={20} className="text-gray-500 hover:text-red-500" />
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSaveOrg} className="p-6 space-y-4 overflow-y-auto max-h-[70vh] bg-gray-50">
        
        {/* Organization Name */}
        <div>
          <label className="text-[11px] font-semibold text-gray-700 uppercase mb-1 block">Organization Name</label>
          <input 
            type="text"
            className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-sm outline-none focus:ring-1 focus:ring-black"
            placeholder="Organization Name"
            value={formData.name}
            onChange={e=>setFormData({...formData, name:e.target.value})}
          />
        </div>

        {/* Website + Revenue */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase mb-1 block">Website</label>
            <input 
              type="text"
              className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-sm outline-none focus:ring-1 focus:ring-black"
              placeholder="Website"
              value={formData.website}
              onChange={e=>setFormData({...formData, website:e.target.value})}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase mb-1 block">Annual Revenue</label>
            <input 
              type="text"
              className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-sm outline-none focus:ring-1 focus:ring-black"
              placeholder="PKR 0.00"
              value={formData.revenue}
              onChange={e=>setFormData({...formData, revenue:e.target.value})}
            />
          </div>
        </div>

        {/* Territory */}
        <div>
          <label className="text-[11px] font-semibold text-gray-700 uppercase mb-1 block">Territory</label>
          <select 
            className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-sm outline-none focus:ring-1 focus:ring-black"
            value={formData.territory}
            onChange={e=>setFormData({...formData, territory:e.target.value})}
          >
            <option>Territory</option>
            <option>Asia</option>
            <option>Europe</option>
          </select>
        </div>

        {/* Employees + Industry */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase mb-1 block">No. of Employees</label>
            <select 
              className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-sm outline-none focus:ring-1 focus:ring-black"
              value={formData.employees}
              onChange={e=>setFormData({...formData, employees:e.target.value})}
            >
              <option>1-10</option>
              <option>11-50</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase mb-1 block">Industry</label>
            <select 
              className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-sm outline-none focus:ring-1 focus:ring-black"
              value={formData.industry}
              onChange={e=>setFormData({...formData, industry:e.target.value})}
            >
              <option>Industry</option>
              <option>Software</option>
              <option>Sports</option>
            </select>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="text-[11px] font-semibold text-gray-700 uppercase mb-1 block">Address</label>
          <select 
            className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-sm outline-none focus:ring-1 focus:ring-black"
            value={formData.address}
            onChange={e=>setFormData({...formData, address:e.target.value})}
          >
            <option>Address</option>
            <option>Pakistan</option>
            <option>USA</option>
          </select>
        </div>

        {/* Submit Button */}
        <div className="pt-6 flex justify-center">
          <button 
            type="submit" 
            disabled={isSaving}
            className="bg-black text-white px-20 py-2.5 rounded-lg font-bold text-sm shadow hover:bg-gray-900 transition-all tracking-tight uppercase disabled:opacity-60"
          >
            {isSaving ? 'Creating...' : 'Create'}
          </button>
        </div>

      </form>
    </div>
  </div>
)}


      {/* EXPORT MODAL */}
      {isExportOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-80 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm">Export Organizations</h3>
              <X size={16} className="cursor-pointer text-gray-400 hover:text-black" onClick={()=>setIsExportOpen(false)}/>
            </div>
            <button onClick={exportToExcel} className="w-full bg-black text-white py-2 rounded text-xs font-bold hover:bg-gray-800 transition">Download Excel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;
