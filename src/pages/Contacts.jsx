import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, Download, X, MoreHorizontal, Check, List as ListIcon, LayoutGrid, ChevronDown, RotateCcw, Settings, Phone } from 'lucide-react';
import * as XLSX from 'xlsx';

const Contacts = () => {
  // --- STATES ---
  const [viewMode, setViewMode] = useState('Table'); 
  const [contacts, setContacts] = useState([
    { id: 1, email: 'reply+32j4k3@mail.com', phone: '03001234567', org: 'Tech Solutions', status: 'Passive', modified: '1 hour ago' },
    { id: 2, email: 'crm@basedapp.com', phone: '03219876543', org: 'Finance Corp', status: 'Open', modified: '4 hours ago' },
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  
  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({ 
    email: true, phone: true, org: true, status: true, modified: true 
  });

  // Modal Form State
  const [formData, setFormData] = useState({
    salutation: 'Salutation', firstName: '', lastName: '', email: '', mobile: '', gender: 'Gender', company: '', designation: '', address: 'Address'
  });

  // --- LOGIC ---
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => c.email.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [contacts, searchTerm]);

  const handleSort = (key) => {
    const sorted = [...contacts].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
    setContacts(sorted);
    setActiveDropdown(null);
  };

  const handleStatusChange = (id, newStatus) => {
    const updated = contacts.map(c => c.id === id ? { ...c, status: newStatus } : c);
    setContacts(updated);
    setActiveDropdown(null);
  };

  const handleSaveContact = (e) => {
    e.preventDefault();
    const newEntry = {
      id: Date.now(),
      email: formData.email || 'No Email',
      phone: formData.mobile || '-',
      org: formData.company || '-',
      status: 'Open',
      modified: 'Just now'
    };
    setContacts([newEntry, ...contacts]);
    setIsCreateModalOpen(false);
    setFormData({ salutation: 'Salutation', firstName: '', lastName: '', email: '', mobile: '', gender: 'Gender', company: '', designation: '', address: 'Address' });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(contacts);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "CRM_Contacts.xlsx");
    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-6 text-left relative min-h-screen">
      {/* 1. Header (Same as Leads) */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
           <h2 className="text-xl font-bold text-gray-800">Contacts /</h2>
           <div className="relative">
              <button onClick={() => setActiveDropdown(activeDropdown === 'view' ? null : 'view')} className="flex items-center gap-1 text-gray-500 hover:text-purple-700 font-medium transition-colors">
                <ListIcon size={18}/> {viewMode} View <ChevronDown size={14}/>
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

      {/* 2. Action Bar (Same as Leads) */}
      <div className="flex justify-between items-center bg-white px-4 py-2 border-b border-gray-100 sticky top-0 z-40">
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Search contacts..." 
              className="pl-10 pr-4 py-1.5 bg-gray-50 rounded-md text-sm w-64 outline-none focus:ring-1 focus:ring-purple-200"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><RotateCcw size={18}/></button>
        </div>

        <div className="flex items-center gap-1">
          {/* Functional Popups matching Leads style */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'filter' ? null : 'filter')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm"><Filter size={16}/> Filter</button>
            {activeDropdown === 'filter' && (
              <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filters</p>
                <button className="flex items-center gap-2 text-purple-600 text-xs font-bold mb-4 hover:underline"><Plus size={14}/> Add Filter</button>
                <div className="space-y-1">
                  {['Passive', 'Open', 'Replied'].map(f => (
                    <div key={f} className="p-2.5 hover:bg-purple-50 rounded-lg text-xs font-medium text-slate-600 cursor-pointer">{f}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm"><ArrowUpDown size={16}/> Sort</button>
          <button onClick={() => setActiveDropdown(activeDropdown === 'cols' ? null : 'cols')} className="p-2 hover:bg-gray-100 rounded text-gray-500 flex items-center gap-1 text-sm"><LayoutPanelLeft size={16}/> Columns</button>
          
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'more' ? null : 'more')} className="p-2 hover:bg-gray-100 rounded text-gray-500 transition-colors"><MoreHorizontal size={20}/></button>
            {activeDropdown === 'more' && (
              <div className="absolute right-0 top-10 w-44 bg-white border shadow-xl rounded-md z-50 py-1 overflow-hidden">
                <button onClick={() => setIsExportModalOpen(true)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-2 font-bold"><Download size={14}/> Export</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Table Area (Leads Colors & Screenshot 97 columns) */}
      {viewMode === 'Table' ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mx-2 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b tracking-wider uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4 w-10"><input type="checkbox" className="rounded border-gray-300"/></th>
                {visibleColumns.email && <th className="px-6 py-4">Email</th>}
                {visibleColumns.phone && <th className="px-6 py-4">Phone</th>}
                {visibleColumns.org && <th className="px-6 py-4">Organization</th>}
                {visibleColumns.status && <th className="px-6 py-4">Status</th>}
                {visibleColumns.modified && <th className="px-6 py-4">Modified</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4"><input type="checkbox" className="rounded border-gray-300"/></td>
                  {visibleColumns.email && <td className="px-6 py-4 font-semibold text-purple-700 cursor-pointer">{contact.email}</td>}
                  {visibleColumns.phone && <td className="px-6 py-4 text-gray-600 flex items-center gap-2"><Phone size={14} className="text-gray-400"/> {contact.phone}</td>}
                  {visibleColumns.org && <td className="px-6 py-4 text-gray-600">{contact.org}</td>}
                  
                  {/* Functional Status Dropdown */}
                  {visibleColumns.status && (
                    <td className="px-6 py-4 relative">
                      <button 
                        onClick={() => setActiveDropdown(activeDropdown === `status-${contact.id}` ? null : `status-${contact.id}`)}
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-tighter hover:bg-gray-100 p-1 rounded transition-all"
                      >
                        <span className={`w-2 h-2 rounded-full ${contact.status === 'Passive' ? 'bg-gray-400' : contact.status === 'Open' ? 'bg-black' : 'bg-green-500'}`}></span>
                        {contact.status}
                      </button>
                      {activeDropdown === `status-${contact.id}` && (
                        <div className="absolute top-10 left-6 w-32 bg-white border shadow-xl rounded-md z-50 py-1">
                          {['Passive', 'Open', 'Replied'].map(s => (
                            <button key={s} onClick={() => handleStatusChange(contact.id, s)} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-purple-50 text-gray-600">{s}</button>
                          ))}
                        </div>
                      )}
                    </td>
                  )}
                  {visibleColumns.modified && <td className="px-6 py-4 text-gray-400 text-[11px] italic">{contact.modified}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Kanban style for contacts */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
          {['Passive', 'Open', 'Replied'].map(s => (
            <div key={s} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
               <h3 className="font-bold text-gray-500 text-xs uppercase mb-4 tracking-widest">{s}</h3>
               {filteredContacts.filter(c => c.status === s).map(c => (
                 <div key={c.id} className="bg-white p-3 rounded-lg border shadow-sm mb-3">
                    <p className="font-bold text-sm text-gray-800">{c.email}</p>
                    <p className="text-xs text-gray-400 mt-1">{c.org}</p>
                 </div>
               ))}
            </div>
          ))}
        </div>
      )}

      {/* --- NEW CONTACT MODAL (Screenshot 99 Layout) --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-left font-sans">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">New Contact</h3>
              <div className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" onClick={() => setIsCreateModalOpen(false)}>
                <X size={20} className="text-gray-400 hover:text-red-500" />
              </div>
            </div>
            <form onSubmit={handleSaveContact} className="p-8 space-y-4 bg-white overflow-y-auto max-h-[75vh]">
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Salutation</label>
              <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.salutation} onChange={e=>setFormData({...formData, salutation:e.target.value})}><option>Salutation</option><option>Mr.</option><option>Ms.</option></select></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">First Name</label>
                <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.firstName} onChange={e=>setFormData({...formData, firstName:e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Last Name</label>
                <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.lastName} onChange={e=>setFormData({...formData, lastName:e.target.value})} /></div>
              </div>

              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Email Address</label>
              <input type="email" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.email} onChange={e=>setFormData({...formData, email:e.target.value})} /></div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Mobile No</label>
                <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.mobile} onChange={e=>setFormData({...formData, mobile:e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Gender</label>
                <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.gender} onChange={e=>setFormData({...formData, gender:e.target.value})}><option>Gender</option><option>Male</option><option>Female</option></select></div>
              </div>

              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Company Name</label>
              <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.company} onChange={e=>setFormData({...formData, company:e.target.value})} /></div>

              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Designation</label>
              <input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50/50 text-sm outline-none" value={formData.designation} onChange={e=>setFormData({...formData, designation:e.target.value})} /></div>

              <div className="pt-8 border-t flex justify-center">
                <button type="submit" className="bg-black text-white px-20 py-2.5 rounded-lg font-bold text-sm shadow-xl hover:bg-gray-800 transition-all tracking-tight uppercase">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EXPORT MODAL --- */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-center">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <X size={18} className="absolute right-4 top-4 cursor-pointer text-gray-400 hover:text-black" onClick={()=>setIsExportModalOpen(false)}/>
            <h3 className="text-lg font-bold text-gray-800 text-left mb-4 border-b pb-2">Export Contacts</h3>
            <button onClick={exportToExcel} className="w-full mt-6 py-2.5 bg-[#2d3a60] text-white rounded-lg font-bold hover:bg-[#1e2a4a] transition-all shadow-lg">Download</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;