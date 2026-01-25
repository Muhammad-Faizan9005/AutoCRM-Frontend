import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, Download, X, MoreHorizontal, Check, List as ListIcon, LayoutGrid, ChevronDown, RotateCcw, Settings } from 'lucide-react';
import * as XLSX from 'xlsx';

const Deals = () => {
  // --- STATES (Deals Data) ---
  const [viewMode, setViewMode] = useState('Table'); 
  const [deals, setDeals] = useState([
    { id: 1, org: 'Aslam industries', revenue: 'PKR 1,000,000.00', status: 'Qualification', email: 'aslam.ali@gmail.com', mobile: '03004567890', modified: '1 week ago' },
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  
  // Column Visibility (Same logic as Leads)
  const [visibleColumns, setVisibleColumns] = useState({ 
    org: true, revenue: true, status: true, email: true, mobile: true, modified: true 
  });

  // Form State matching Screenshot (92)
  const [formData, setFormData] = useState({
    orgName: '', website: '', employees: '1-10', territory: 'Territory', revenue: 'PKR 0.00', industry: 'Industry',
    salutation: 'Salutation', firstName: '', lastName: '', email: '', mobile: '', gender: 'Gender', status: 'Qualification'
  });

  // --- LOGIC ---
  const filteredDeals = useMemo(() => {
    return deals.filter(d => d.org.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [deals, searchTerm]);

  const handleSort = (key) => {
    const sorted = [...deals].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
    setDeals(sorted);
    setActiveDropdown(null);
  };

  const handleSaveDeal = (e) => {
    e.preventDefault();
    const newEntry = {
      id: Date.now(),
      org: formData.orgName || 'Unnamed Org',
      revenue: formData.revenue,
      status: formData.status,
      email: formData.email || '-',
      mobile: formData.mobile || '-',
      modified: 'Just now'
    };
    setDeals([newEntry, ...deals]);
    setIsCreateModalOpen(false);
    setFormData({ ...formData, orgName: '', revenue: 'PKR 0.00', email: '', mobile: '' });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(deals);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Deals");
    XLSX.writeFile(wb, "CRM_Deals.xlsx");
    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-6 text-left relative min-h-screen">
      {/* 1. Header (Exact same as Leads) */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
           <h2 className="text-xl font-bold text-gray-800">Deals /</h2>
           <div className="relative">
              <button onClick={() => setActiveDropdown(activeDropdown === 'view' ? null : 'view')} className="flex items-center gap-1 text-gray-500 hover:text-purple-700 font-medium transition-colors">
                {viewMode === 'Table' ? <ListIcon size={18}/> : <LayoutGrid size={18}/>}
                {viewMode} View <ChevronDown size={14}/>
              </button>
              {activeDropdown === 'view' && (
                <div className="absolute top-8 left-0 w-40 bg-white border shadow-lg rounded-md z-[60] py-1">
                  <button onClick={() => {setViewMode('Table'); setActiveDropdown(null)}} className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 flex items-center gap-2"><ListIcon size={14}/> Table</button>
                  <button onClick={() => {setViewMode('Kanban'); setActiveDropdown(null)}} className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 flex items-center gap-2"><LayoutGrid size={14}/> Kanban</button>
                </div>
              )}
           </div>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="bg-black text-white px-4 py-1.5 rounded-md flex items-center gap-2 hover:bg-gray-800 text-sm font-medium transition-all shadow-sm active:scale-95">
          <Plus size={16} /> Create
        </button>
      </div>

      {/* 2. Action Bar (Exact same as Leads) */}
      <div className="flex justify-between items-center bg-white px-4 py-2 border-b border-gray-100 sticky top-0 z-40">
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Search deals..." 
              className="pl-10 pr-4 py-1.5 bg-gray-50 rounded-md text-sm w-64 outline-none focus:ring-1 focus:ring-purple-200"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><RotateCcw size={18}/></button>
        </div>

        <div className="flex items-center gap-1">
          {/* Functional Popups matching Screenshots 93-95 style */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'filter' ? null : 'filter')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm"><Filter size={16}/> Filter</button>
            {activeDropdown === 'filter' && (
              <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Empty - Choose a field to filter by</p>
                <button className="flex items-center gap-2 text-purple-600 text-xs font-bold mb-4 hover:underline"><Plus size={14}/> Add Filter</button>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {['Status', 'Annual Revenue', 'Organization'].map(f => (
                    <div key={f} className="p-2.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600 cursor-pointer">{f}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm"><ArrowUpDown size={16}/> Sort</button>
            {activeDropdown === 'sort' && (
              <div className="absolute right-0 top-10 w-64 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 p-4">
                <div className="space-y-1">
                  {['Organization', 'Status', 'Modified'].map(s => (
                    <button key={s} onClick={() => handleSort(s.toLowerCase())} className="w-full text-left p-2.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600">Sort by {s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'cols' ? null : 'cols')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm"><LayoutPanelLeft size={16}/> Columns</button>
            {activeDropdown === 'cols' && (
              <div className="absolute right-0 top-10 w-72 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 p-4">
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
            <button onClick={() => setActiveDropdown(activeDropdown === 'more' ? null : 'more')} className="p-2 hover:bg-gray-100 rounded text-gray-500"><MoreHorizontal size={18}/></button>
            {activeDropdown === 'more' && (
              <div className="absolute right-0 top-10 w-40 bg-white border shadow-xl rounded-md z-50 py-1 overflow-hidden">
                <button onClick={() => setIsExportModalOpen(true)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-2"><Download size={14}/> Export</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Table Area (Same as Leads) */}
      {viewMode === 'Table' ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mx-2 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b tracking-wider uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4 w-10"><input type="checkbox" className="rounded border-gray-300"/></th>
                {visibleColumns.org && <th className="px-6 py-4">Organization</th>}
                {visibleColumns.revenue && <th className="px-6 py-4">Annual Revenue</th>}
                {visibleColumns.status && <th className="px-6 py-4">Status</th>}
                {visibleColumns.email && <th className="px-6 py-4">Email</th>}
                {visibleColumns.mobile && <th className="px-6 py-4">Mobile</th>}
                {visibleColumns.modified && <th className="px-6 py-4">Modified</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDeals.map((deal) => (
                <tr key={deal.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4"><input type="checkbox" className="rounded border-gray-300"/></td>
                  {visibleColumns.org && <td className="px-6 py-4 font-bold text-gray-800">{deal.org}</td>}
                  {visibleColumns.revenue && <td className="px-6 py-4 text-gray-600 font-medium">{deal.revenue}</td>}
                  {visibleColumns.status && (
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 text-[11px] font-black text-slate-800 uppercase tracking-tight">
                        <div className="w-1.5 h-1.5 rounded-full bg-black"></div> {deal.status}
                      </span>
                    </td>
                  )}
                  {visibleColumns.email && <td className="px-6 py-4 text-gray-500 font-medium">{deal.email}</td>}
                  {visibleColumns.mobile && <td className="px-6 py-4 text-gray-500 font-medium">{deal.mobile}</td>}
                  {visibleColumns.modified && <td className="px-6 py-4 text-gray-400 text-[10px] font-bold italic">{deal.modified}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
          {['Qualification', 'Proposal', 'Won'].map(stage => (
            <div key={stage} className="bg-gray-100/50 p-4 rounded-[24px] border border-dashed border-gray-200">
              <h3 className="font-bold text-gray-400 text-[10px] uppercase mb-5 tracking-[0.2em] px-2">{stage}</h3>
              <div className="space-y-4">
                {filteredDeals.filter(d => d.status === stage).map(deal => (
                  <div key={deal.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-grab active:cursor-grabbing">
                    <p className="font-bold text-sm text-gray-800 tracking-tight">{deal.org}</p>
                    <p className="text-[11px] text-purple-600 mt-1 font-bold">{deal.revenue}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Create Deal Modal (3-Column Grid matching Screenshot 92) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-left font-sans">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">Create Deal</h3>
              <div className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" onClick={() => setIsCreateModalOpen(false)}>
                <X size={20} className="text-gray-400 hover:text-red-500" />
              </div>
            </div>
            <form onSubmit={handleSaveDeal} className="p-8 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 bg-white overflow-y-auto max-h-[75vh]">
              {/* Org details */}
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Organization Name</label>
              <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all" value={formData.orgName} onChange={e=>setFormData({...formData, orgName:e.target.value})} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Website</label>
              <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all" value={formData.website} onChange={e=>setFormData({...formData, website:e.target.value})} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">No. of Employees</label>
              <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.employees} onChange={e=>setFormData({...formData, employees:e.target.value})}><option>1-10</option><option>11-50</option></select></div>

              {/* Market Info */}
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Territory</label>
              <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.territory} onChange={e=>setFormData({...formData, territory:e.target.value})}><option>Territory</option><option>Pakistan</option></select></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Annual Revenue</label>
              <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.revenue} onChange={e=>setFormData({...formData, revenue:e.target.value})} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Industry</label>
              <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.industry} onChange={e=>setFormData({...formData, industry:e.target.value})}><option>Industry</option><option>Software</option></select></div>

              {/* Contact Info */}
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Salutation</label>
              <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.salutation} onChange={e=>setFormData({...formData, salutation:e.target.value})}><option>Mr.</option><option>Ms.</option></select></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">First Name</label>
              <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.firstName} onChange={e=>setFormData({...formData, firstName:e.target.value})} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Last Name</label>
              <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.lastName} onChange={e=>setFormData({...formData, lastName:e.target.value})} /></div>

              {/* Sticky Footer */}
              <div className="col-span-1 md:col-span-3 flex justify-end gap-3 pt-8 mt-4 border-t sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-50 rounded-lg transition-colors">Discard</button>
                <button type="submit" className="bg-black text-white px-10 py-2.5 rounded-lg font-bold text-sm shadow-xl hover:bg-gray-800 transform active:scale-95 transition-all tracking-tight">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 text-center animate-in zoom-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <X size={18} className="absolute right-4 top-4 cursor-pointer text-gray-400 hover:text-black" onClick={()=>setIsExportModalOpen(false)}/>
            <h3 className="text-lg font-bold text-gray-800 text-left mb-4 border-b pb-2 tracking-tight">Export Deals</h3>
            <div className="text-left space-y-4">
               <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Export Type</label><p className="text-sm font-bold text-gray-700">Excel</p></div>
               <div className="flex items-center gap-3 py-2">
                 <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"/><label className="text-sm text-gray-600 font-bold">Export All Records</label>
               </div>
            </div>
            <button onClick={exportToExcel} className="w-full mt-6 py-3 bg-[#2d3a60] text-white rounded-lg font-bold hover:bg-[#1e2a4a] transition-all shadow-xl active:scale-[0.98]">Download</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deals;