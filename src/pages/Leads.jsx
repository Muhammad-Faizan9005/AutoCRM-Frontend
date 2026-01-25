import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, Download, X, MoreHorizontal, Check, List as ListIcon, LayoutGrid, ChevronDown, RotateCcw, Settings } from 'lucide-react';
import * as XLSX from 'xlsx';

const Leads = () => {
  // --- STATES ---
  const [viewMode, setViewMode] = useState('Table'); 
  const [leads, setLeads] = useState([
    { id: 1, name: 'LinkedIn', org: 'Tech Solutions', status: 'New', email: 'messages@linkedin.com', mobile: '03001234567', modified: '2 hours ago' },
    { id: 2, name: 'Bitget', org: 'Finance Corp', status: 'Contacted', email: 'support@bitget.com', mobile: '03219876543', modified: '5 hours ago' },
    { id: 3, name: 'Binance', org: 'Crypto Inc', status: 'Qualified', email: 'noreply@binance.com', mobile: '03115556667', modified: '1 day ago' },
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  
  // Functional Column Visibility
  const [visibleColumns, setVisibleColumns] = useState({ 
    name: true, org: true, status: true, email: true, modified: true 
  });

  const [formData, setFormData] = useState({
    salutation: 'Salutation', firstName: '', lastName: '', email: '', mobile: '', gender: 'Gender', organization: '', website: '', employees: '1-10', territory: 'Territory', revenue: 'PKR 0.00', industry: 'Industry', status: 'New'
  });

  // --- LOGIC ---
  const filteredLeads = useMemo(() => {
    return leads.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.org.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  const handleSort = (key) => {
    const sorted = [...leads].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
    setLeads(sorted);
    setActiveDropdown(null);
  };

  const handleSaveLead = (e) => {
    e.preventDefault();
    const newEntry = {
      id: Date.now(),
      name: `${formData.firstName} ${formData.lastName}` || "New Lead",
      org: formData.organization || '-',
      status: 'New',
      email: formData.email || '-',
      modified: 'Just now'
    };
    setLeads([newEntry, ...leads]);
    setIsCreateModalOpen(false);
    setFormData({ salutation: 'Salutation', firstName: '', lastName: '', email: '', mobile: '', gender: 'Gender', organization: '', website: '', employees: '1-10', territory: 'Territory', revenue: 'PKR 0.00', industry: 'Industry', status: 'New' });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(leads);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "CRM_Leads.xlsx");
    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-6 text-left relative min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
           <h2 className="text-xl font-bold text-gray-800">Leads /</h2>
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

      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white px-4 py-2 border-b border-gray-100 sticky top-0 z-40">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input 
            type="text" placeholder="Search..." 
            className="pl-10 pr-4 py-1.5 bg-gray-50 rounded-md text-sm w-64 outline-none focus:ring-1 focus:ring-purple-200"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1">
          {/* Functional Filter Popup */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'filter' ? null : 'filter')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm"><Filter size={16}/> Filter</button>
            {activeDropdown === 'filter' && (
              <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-left">Empty - Choose a field to filter by</p>
                <button className="flex items-center gap-2 text-purple-600 text-xs font-bold mb-4 hover:underline"><Plus size={14}/> Add Filter</button>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {['Status', 'Organization', 'Email', 'Last Modified'].map(f => (
                    <div key={f} className="p-2.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600 cursor-pointer text-left">{f}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Functional Sort Popup */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm"><ArrowUpDown size={16}/> Sort</button>
            {activeDropdown === 'sort' && (
              <div className="absolute right-0 top-10 w-64 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 p-4">
                <div className="space-y-1">
                  {['Name', 'Organization', 'Status'].map(s => (
                    <button key={s} onClick={() => handleSort(s.toLowerCase())} className="w-full text-left p-2.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600">Sort by {s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Functional Column Visibility Popup */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'cols' ? null : 'cols')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm"><LayoutPanelLeft size={16}/> Columns</button>
            {activeDropdown === 'cols' && (
              <div className="absolute right-0 top-10 w-72 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-left">Column Display</p>
                <div className="space-y-2">
                  {Object.keys(visibleColumns).map(col => (
                    <div key={col} className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors" onClick={() => setVisibleColumns({...visibleColumns, [col]: !visibleColumns[col]})}>
                      <div className="flex items-center gap-3">
                        <MoreHorizontal size={14} className="text-slate-300 rotate-90" />
                        <span className="text-xs font-bold text-slate-600 capitalize text-left">{col}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <Settings size={14} className="text-slate-400" />
                         {visibleColumns[col] && <Check size={14} className="text-purple-600" />}
                      </div>
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

      {/* Main Content Area */}
      {viewMode === 'Table' ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mx-2 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b tracking-wider uppercase text-[10px]">
              <tr>
                <th className="px-6 py-3 w-10"><input type="checkbox" className="rounded"/></th>
                {visibleColumns.name && <th className="px-6 py-3">Name</th>}
                {visibleColumns.org && <th className="px-6 py-3">Organization</th>}
                {visibleColumns.status && <th className="px-6 py-3">Status</th>}
                {visibleColumns.email && <th className="px-6 py-3">Email</th>}
                {visibleColumns.modified && <th className="px-6 py-3">Modified</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4"><input type="checkbox" className="rounded"/></td>
                  {visibleColumns.name && <td className="px-6 py-4 font-semibold text-purple-700 cursor-pointer">{lead.name}</td>}
                  {visibleColumns.org && <td className="px-6 py-4 text-gray-600">{lead.org}</td>}
                  {visibleColumns.status && <td className="px-6 py-4"><span className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-tighter"><span className="w-2 h-2 rounded-full bg-slate-900 ring-4 ring-slate-100"></span> {lead.status}</span></td>}
                  {visibleColumns.email && <td className="px-6 py-4 text-gray-500">{lead.email}</td>}
                  {visibleColumns.modified && <td className="px-6 py-4 text-gray-400 text-[11px] italic">{lead.modified}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 px-2">
          {['New', 'Contacted', 'Qualified'].map(status => (
            <div key={status} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-gray-600 text-xs uppercase mb-4 tracking-widest flex justify-between">
                {status} <span className="bg-gray-200 px-2 rounded-full text-[10px]">{leads.filter(l => l.status === status).length}</span>
              </h3>
              <div className="space-y-3 text-left">
                {leads.filter(l => l.status === status).map(lead => (
                  <div key={lead.id} className="bg-white p-3 rounded-lg border shadow-sm hover:ring-2 hover:ring-purple-200 cursor-grab active:cursor-grabbing transition-all">
                    <p className="font-bold text-sm text-gray-800">{lead.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{lead.org}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- CREATE LEAD MODAL (Aapka original design bilkul same hai) --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-left font-sans">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">Create Lead</h3>
              <div className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" onClick={() => setIsCreateModalOpen(false)}>
                <X size={20} className="text-gray-400 hover:text-red-500" />
              </div>
            </div>
            <form onSubmit={handleSaveLead} className="p-8 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 bg-white overflow-y-auto max-h-[75vh]">
              {/* Salutation */}
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Salutation</label>
              <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all" value={formData.salutation} onChange={e=>setFormData({...formData, salutation:e.target.value})}><option>Salutation</option><option>Mr.</option><option>Ms.</option><option>Dr.</option></select></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">First Name *</label>
              <input type="text" required className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all" placeholder="First Name" value={formData.firstName} onChange={e=>setFormData({...formData, firstName:e.target.value})} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Last Name</label>
              <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all" placeholder="Last Name" value={formData.lastName} onChange={e=>setFormData({...formData, lastName:e.target.value})} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Email Address</label>
              <input type="email" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all" placeholder="example@mail.com" value={formData.email} onChange={e=>setFormData({...formData, email:e.target.value})} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Mobile No.</label>
              <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all" placeholder="Mobile No" value={formData.mobile} onChange={e=>setFormData({...formData, mobile:e.target.value})} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Gender</label>
              <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all" value={formData.gender} onChange={e=>setFormData({...formData, gender:e.target.value})}><option>Gender</option><option>Male</option><option>Female</option><option>Other</option></select></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Organization</label>
              <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all" placeholder="Organization Name" value={formData.organization} onChange={e=>setFormData({...formData, organization:e.target.value})} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">Website</label>
              <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all" placeholder="www.website.com" value={formData.website} onChange={e=>setFormData({...formData, website:e.target.value})} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">No. of Employees</label>
              <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all" value={formData.employees} onChange={e=>setFormData({...formData, employees:e.target.value})}><option>1-10</option><option>11-50</option><option>51-200</option><option>201+</option></select></div>

              <div className="col-span-1 md:col-span-3 flex justify-end gap-3 pt-8 mt-4 border-t sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-50 rounded-lg">Discard</button>
                <button type="submit" className="bg-black text-white px-10 py-2.5 rounded-lg font-bold text-sm shadow-xl hover:bg-gray-800 transition-all tracking-tight">Create</button>
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
            <h3 className="text-lg font-bold text-gray-800 text-left mb-4 border-b pb-2 text-left">Export</h3>
            <div className="text-left space-y-4">
               <div><label className="text-xs text-gray-400 block mb-1">Export Type</label><p className="text-sm font-bold text-gray-700">Excel</p></div>
               <div className="flex items-center gap-2 py-2">
                 <input type="checkbox" defaultChecked className="rounded text-purple-600"/><label className="text-sm text-gray-600 font-medium text-left">Export All {leads.length} Record(s)</label>
               </div>
            </div>
            <button onClick={exportToExcel} className="w-full mt-6 py-2.5 bg-[#2d3a60] text-white rounded-lg font-bold hover:bg-[#1e2a4a] transition-all shadow-lg active:scale-95">Download</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;