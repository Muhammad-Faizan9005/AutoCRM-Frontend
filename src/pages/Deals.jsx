import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, Download, RotateCcw, List, KanbanSquare, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const Deals = () => {
  const [viewMode, setViewMode] = useState('Table');
  const [deals, setDeals] = useState([
    { id: 1, org: 'Aslam industries', revenue: 'PKR 1,000,000.00', status: 'Qualification', email: 'aslam.ali@gmail.com', mobile: '03004567890', modified: '1 week ago' },
  ]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({ org: true, revenue: true, status: true, email: true, mobile: true, modified: true });

  const [formData, setFormData] = useState({
    orgName: '', website: '', employees: '1-10', territory: 'Territory', revenue: 'PKR 0.00', industry: 'Industry',
    salutation: 'Salutation', firstName: '', lastName: '', email: '', mobile: '', status: 'Qualification'
  });

  const filteredDeals = useMemo(() => deals.filter(d => d.org.toLowerCase().includes(searchTerm.toLowerCase())), [deals, searchTerm]);

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
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(deals);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Deals");
    XLSX.writeFile(wb, "CRM_Deals.xlsx");
    setIsExportOpen(false);
  };

  const groupedDeals = {
    Qualification: deals.filter(d => d.status === 'Qualification'),
    Proposal: deals.filter(d => d.status === 'Proposal'),
    Closed: deals.filter(d => d.status === 'Closed')
  };

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
          <button onClick={() => setDeals([...deals])} className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">
            <RotateCcw size={18} />
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-900 font-semibold">
            <Plus size={16} /> Create
          </button>
        </div>
      </div>

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
      {viewMode === 'Table' && (
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
              {visibleColumns.status && <div>{d.status}</div>}
              {visibleColumns.email && <div>{d.email}</div>}
              {visibleColumns.mobile && <div>{d.mobile}</div>}
              {visibleColumns.modified && <div className="text-gray-400 italic">{d.modified}</div>}
             <div className="flex flex-col justify-end text-right h-full pr-10">
  <button
    onClick={() => setDeals(deals.filter(x => x.id !== d.id))}
    className="text-red-500 text-xs"
  >
    Delete
  </button>
</div>

            </div>
          ))}
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'Kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {Object.entries(groupedDeals).map(([status, items]) => (
            <div key={status} className="bg-gray-100 rounded-lg p-3">
              <h3 className="text-xs font-bold mb-2">{status}</h3>
              <div className="space-y-2">
                {items.map(d => (
                  <div key={d.id} className="bg-white p-2 rounded shadow text-xs border">
                    <div className="font-bold">{d.org}</div>
                    <div className="text-gray-500">{d.revenue}</div>
                    <button onClick={()=>setDeals(deals.filter(x=>x.id!==d.id))} className="text-red-500 text-[10px] mt-1">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
        <form onSubmit={handleSaveDeal} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">

          {/* Generate Form Fields */}
          {[
            { label: 'Organization Name', type: 'text' },
            { label: 'Website', type: 'text' },
            { label: 'Employees', type: 'select', options: ['1-10', '11-50', '51-200', '201+'] },
            { label: 'Territory', type: 'select', options: ['Option 1', 'Option 2'] },
            { label: 'Revenue', type: 'text' },
            { label: 'Industry', type: 'select', options: ['Option 1', 'Option 2'] },
            { label: 'Salutation', type: 'select', options: ['Mr.', 'Ms.', 'Dr.'] },
            { label: 'First Name', type: 'text' },
            { label: 'Last Name', type: 'text' },
            { label: 'Email', type: 'text' },
            { label: 'Mobile', type: 'text' },
          ].map((field, i) => (
            <div key={i}>
              <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">{field.label}</label>
              {field.type === 'select' ? (
                <select
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData[field.label.replace(' ','').toLowerCase()]}
                  onChange={e =>
                    setFormData({...formData, [field.label.replace(' ','').toLowerCase()]: e.target.value})
                  }
                >
                  {field.options.map((opt, idx) => (
                    <option key={idx}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  value={formData[field.label.replace(' ','').toLowerCase()]}
                  onChange={e =>
                    setFormData({...formData, [field.label.replace(' ','').toLowerCase()]: e.target.value})
                  }
                />
              )}
            </div>
          ))}

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
          onClick={handleSaveDeal}
          className="px-5 py-1.5 bg-gray-900 text-white font-medium text-sm rounded-md shadow hover:bg-gray-800 transition-all active:scale-95"
        >
          Create
        </button>
      </div>

    </div>
  </div>
)}

    </div>
  );
};

export default Deals;
