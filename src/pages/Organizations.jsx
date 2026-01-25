import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, Download, X, MoreHorizontal, Check, List as ListIcon, LayoutGrid, ChevronDown, RotateCcw, Settings, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const Organizations = () => {
  // --- STATES ---
  const [viewMode, setViewMode] = useState('Table'); 
  const [orgs, setOrgs] = useState([
    { id: 1, name: 'Aslam industries', website: 'aslam-industries.com', industry: 'Software', revenue: 'PKR 1,000,000.00', modified: '2 weeks ago' },
    { id: 2, name: 'umer industries', website: 'umer-industries.com', industry: 'Sports', revenue: 'PKR 100,000.00', modified: '1 week ago' },
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  
  // Functional Column Visibility
  const [visibleColumns, setVisibleColumns] = useState({ 
    name: true, website: true, industry: true, revenue: true, modified: true 
  });

  const [formData, setFormData] = useState({
    orgName: '', website: '', revenue: 'PKR 0.00', territory: 'Territory', employees: '1-10', industry: 'Industry', address: 'Address'
  });

  // --- LOGIC ---
  const filteredOrgs = useMemo(() => {
    return orgs.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [orgs, searchTerm]);

  // Functional Sort Logic
  const handleSort = (key) => {
    const sorted = [...orgs].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
    setOrgs(sorted);
    setActiveDropdown(null);
  };

  const handleSaveOrg = (e) => {
    e.preventDefault();
    const newEntry = {
      id: Date.now(),
      name: formData.orgName || 'Unnamed Org',
      website: formData.website || '-',
      industry: formData.industry !== 'Industry' ? formData.industry : 'General',
      revenue: formData.revenue,
      modified: 'Just now'
    };
    setOrgs([newEntry, ...orgs]);
    setIsCreateModalOpen(false);
    setFormData({ orgName: '', website: '', revenue: 'PKR 0.00', territory: 'Territory', employees: '1-10', industry: 'Industry', address: 'Address' });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(orgs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Organizations");
    XLSX.writeFile(wb, "CRM_Organizations.xlsx");
    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-6 text-left relative min-h-screen">
      {/* 1. Header */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
           <h2 className="text-xl font-bold text-gray-800">Organizations /</h2>
           <div className="relative">
              <button onClick={() => setActiveDropdown(activeDropdown === 'view' ? null : 'view')} className="flex items-center gap-1 text-gray-400 font-medium hover:text-purple-700 transition-colors">
                {viewMode === 'Table' ? <ListIcon size={18}/> : <LayoutGrid size={18}/>}
                {viewMode} View <ChevronDown size={14}/>
              </button>
              {activeDropdown === 'view' && (
                <div className="absolute top-8 left-0 w-40 bg-white border shadow-lg rounded-md z-[60] py-1">
                  <button onClick={() => {setViewMode('Table'); setActiveDropdown(null)}} className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 flex items-center gap-2 font-bold text-gray-600"><ListIcon size={14}/> Table</button>
                  <button onClick={() => {setViewMode('Kanban'); setActiveDropdown(null)}} className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 flex items-center gap-2 font-bold text-gray-600"><LayoutGrid size={14}/> Kanban</button>
                </div>
              )}
           </div>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="bg-black text-white px-4 py-1.5 rounded-md flex items-center gap-2 hover:bg-gray-800 text-sm font-medium transition-all shadow-sm active:scale-95">
          <Plus size={16} /> Create
        </button>
      </div>

      {/* 2. Action Bar with Functional Popups */}
      <div className="flex justify-between items-center bg-white px-4 py-2 border-b border-gray-100 sticky top-0 z-40">
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Search organizations..." 
              className="pl-10 pr-4 py-1.5 bg-gray-50 rounded-md text-sm w-64 outline-none focus:ring-1 focus:ring-purple-200"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><RotateCcw size={18}/></button>
        </div>

        <div className="flex items-center gap-1">
          {/* Filter Popup */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'filter' ? null : 'filter')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm"><Filter size={16}/> Filter</button>
            {activeDropdown === 'filter' && (
              <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 p-6 animate-in slide-in-from-top-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Empty - Choose a field to filter by</p>
                <button className="flex items-center gap-2 text-purple-600 text-xs font-bold mb-4 hover:underline"><Plus size={14}/> Add Filter</button>
                <div className="space-y-1">
                  {['Industry', 'Territory', 'Annual Revenue'].map(f => (
                    <div key={f} className="p-2.5 hover:bg-purple-50 rounded-lg text-xs font-medium text-slate-600 cursor-pointer">{f}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sort Popup */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm"><ArrowUpDown size={16}/> Sort</button>
            {activeDropdown === 'sort' && (
              <div className="absolute right-0 top-10 w-64 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 p-4 animate-in slide-in-from-top-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sort by</p>
                <div className="space-y-1">
                   <button onClick={() => handleSort('name')} className="w-full text-left p-2.5 hover:bg-purple-50 rounded-lg text-xs font-medium text-gray-600">Organization Name</button>
                   <button onClick={() => handleSort('industry')} className="w-full text-left p-2.5 hover:bg-purple-50 rounded-lg text-xs font-medium text-gray-600">Industry</button>
                </div>
              </div>
            )}
          </div>

          {/* Columns Popup */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'cols' ? null : 'cols')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm"><LayoutPanelLeft size={16}/> Columns</button>
            {activeDropdown === 'cols' && (
              <div className="absolute right-0 top-10 w-72 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 p-4 animate-in slide-in-from-top-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Column Display</p>
                <div className="space-y-2">
                  {Object.keys(visibleColumns).map(col => (
                    <div key={col} className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors" onClick={() => setVisibleColumns({...visibleColumns, [col]: !visibleColumns[col]})}>
                      <div className="flex items-center gap-3">
                        <MoreHorizontal size={14} className="text-slate-300 rotate-90" />
                        <span className="text-xs font-bold text-slate-600 capitalize">{col}</span>
                      </div>
                      {visibleColumns[col] && <Check size={14} className="text-purple-600" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'more' ? null : 'more')} className="p-2 hover:bg-gray-100 rounded text-gray-500 transition-colors"><MoreHorizontal size={18}/></button>
            {activeDropdown === 'more' && (
              <div className="absolute right-0 top-10 w-40 bg-white border shadow-xl rounded-md z-50 py-1 overflow-hidden animate-in zoom-in duration-150">
                <button onClick={() => setIsExportModalOpen(true)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-2 font-bold"><Download size={14}/> Export</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Table Area */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mx-2 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b tracking-wider uppercase text-[10px]">
            <tr>
              <th className="px-6 py-3 w-10"><input type="checkbox" className="rounded border-gray-300"/></th>
              {visibleColumns.name && <th className="px-6 py-3">Organization</th>}
              {visibleColumns.website && <th className="px-6 py-3">Website</th>}
              {visibleColumns.industry && <th className="px-6 py-3">Industry</th>}
              {visibleColumns.revenue && <th className="px-6 py-3">Annual Revenue</th>}
              {visibleColumns.modified && <th className="px-6 py-3">Last Modified</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOrgs.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4"><input type="checkbox" className="rounded border-gray-300"/></td>
                {visibleColumns.name && <td className="px-6 py-4 font-semibold text-purple-700 cursor-pointer">{org.name}</td>}
                {visibleColumns.website && <td className="px-6 py-4 text-gray-600">{org.website}</td>}
                {visibleColumns.industry && <td className="px-6 py-4 text-gray-600">{org.industry}</td>}
                {visibleColumns.revenue && <td className="px-6 py-4 text-gray-600">{org.revenue}</td>}
                {visibleColumns.modified && <td className="px-6 py-4 text-gray-400 text-[11px] italic">{org.modified}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. NEW ORGANIZATION MODAL (Aapka original layoutgrid same hi rakha hai) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-left font-sans">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">New Organization</h3>
              <div className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" onClick={() => setIsCreateModalOpen(false)}>
                <X size={20} className="text-gray-400 hover:text-red-500" />
              </div>
            </div>
            
            <form onSubmit={handleSaveOrg} className="p-8 space-y-5 bg-white overflow-y-auto max-h-[75vh]">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Organization Name</label>
                <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-1 focus:ring-purple-200" placeholder="Organization Name" value={formData.orgName} onChange={e=>setFormData({...formData, orgName:e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Website</label>
                <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-1 focus:ring-purple-200" placeholder="Website" value={formData.website} onChange={e=>setFormData({...formData, website:e.target.value})} /></div>
                <div><label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Annual Revenue</label>
                <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-1 focus:ring-purple-200" placeholder="PKR 0.00" value={formData.revenue} onChange={e=>setFormData({...formData, revenue:e.target.value})} /></div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Territory</label>
                <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.territory} onChange={e=>setFormData({...formData, territory:e.target.value})}>
                  <option>Territory</option><option>Asia</option><option>Europe</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">No. of Employees</label>
                <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.employees} onChange={e=>setFormData({...formData, employees:e.target.value})}><option>1-10</option><option>11-50</option></select></div>
                <div><label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Industry</label>
                <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.industry} onChange={e=>setFormData({...formData, industry:e.target.value})}><option>Industry</option><option>Software</option><option>Sports</option></select></div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Address</label>
                <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.address} onChange={e=>setFormData({...formData, address:e.target.value})}>
                  <option>Address</option><option>Pakistan</option><option>USA</option>
                </select>
              </div>

              <div className="pt-8 flex justify-center">
                <button type="submit" className="bg-black text-white px-20 py-2.5 rounded-lg font-bold text-sm shadow-xl hover:bg-gray-800 transition-all tracking-tight uppercase">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EXPORT MODAL --- */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 text-center">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <X size={18} className="absolute right-4 top-4 cursor-pointer text-gray-400" onClick={()=>setIsExportModalOpen(false)}/>
            <h3 className="text-lg font-bold text-gray-800 text-left mb-4 border-b pb-2">Export Organizations</h3>
            <button onClick={exportToExcel} className="w-full mt-6 py-2.5 bg-[#2d3a60] text-white rounded-lg font-bold hover:bg-[#1e2a4a] transition-all shadow-lg active:scale-95">Download</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;