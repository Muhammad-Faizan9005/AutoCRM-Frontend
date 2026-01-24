import React, { useState } from 'react';

const Leads = () => {
  const [showModal, setShowModal] = useState(false);
  const [openMenu, setOpenMenu] = useState(null); // Menus control karne ke liye

  // Table Data State
  const [tableData, setTableData] = useState([
    { id: 1, name: "new abc def", org: "qwqgr", status: "New", email: "asidhkasdfgh@mail.com", mobile: "6457649287365298...", assigned: "A Administrator" }
  ]);

  const [formData, setFormData] = useState({ name: '', org: '', email: '' });

  const toggleMenu = (name) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  const handleAddLead = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    const newLead = {
      id: Date.now(),
      name: formData.name,
      org: formData.org || "N/A",
      status: "New",
      email: formData.email || "N/A",
      mobile: "Not Provided",
      assigned: "A Administrator"
    };
    setTableData([...tableData, newLead]);
    setFormData({ name: '', org: '', email: '' });
    setShowModal(false);
  };

  const handleDeleteLead = (id) => {
    setTableData(tableData.filter(item => item.id !== id));
    setOpenMenu(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-white font-sans text-[#333] relative">
      
      {/* 1. Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[14px]">
          <span className="text-gray-400">Leads</span> <span className="text-gray-300">/</span>
          <div className="relative">
            <button onClick={() => toggleMenu('list')} className="font-bold flex items-center gap-1 hover:bg-gray-50 px-2 py-1 rounded">
              List <span className="text-[10px] opacity-50">▼</span>
            </button>
            {openMenu === 'list' && (
              <div className="absolute top-8 left-0 w-40 bg-white border shadow-lg rounded z-50 py-1 text-sm">
                <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer">All Leads</div>
                <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-t">Recently Viewed</div>
              </div>
            )}
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-black text-white px-5 py-1.5 rounded-full text-sm font-bold hover:bg-zinc-800 transition-all">
          + Create
        </button>
      </header>

      {/* 2. Action Bar (Slim & All Clickable) */}
      <div className="flex items-center justify-end gap-3 px-6 py-2 bg-[#fafafa] border-b border-gray-50 relative">
        <button onClick={() => window.location.reload()} className="p-2 bg-white border border-gray-200 rounded-xl hover:shadow-sm text-xs">🔄</button>
        
        {/* Filter */}
        <div className="relative">
          <button onClick={() => toggleMenu('filter')} className="flex items-center gap-2 px-4 py-1.5 bg-[#f3f4f6] rounded-xl text-gray-700 font-medium hover:bg-gray-200 text-[13px]">
            <span>≡</span> Filter
          </button>
          {openMenu === 'filter' && (
            <div className="absolute right-0 mt-2 w-60 bg-white border shadow-2xl rounded-xl z-50 p-3">
               <input type="text" placeholder="Search..." className="w-full border rounded-lg p-2 text-xs outline-none focus:border-black" />
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <button onClick={() => toggleMenu('sort')} className="flex items-center gap-2 px-4 py-1.5 bg-[#f3f4f6] rounded-xl text-gray-700 font-medium hover:bg-gray-200 text-[13px]">
            <span>⇅</span> Sort
          </button>
          {openMenu === 'sort' && (
            <div className="absolute right-0 mt-2 w-44 bg-white border shadow-xl rounded-xl z-50 py-1 text-xs">
              <div className="px-4 py-2 hover:bg-gray-50 cursor-pointer">Name (A-Z)</div>
              <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-t">Date Created</div>
            </div>
          )}
        </div>

        {/* Columns */}
        <div className="relative">
          <button onClick={() => toggleMenu('columns')} className="flex items-center gap-2 px-4 py-1.5 bg-[#f3f4f6] rounded-xl text-gray-700 font-medium hover:bg-gray-200 text-[13px]">
            <span>⊞</span> Columns
          </button>
          {openMenu === 'columns' && (
            <div className="absolute right-0 mt-2 w-48 bg-white border shadow-xl rounded-xl z-50 p-3 space-y-2 text-xs text-gray-600">
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Organization</label>
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Status</label>
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Mobile No</label>
            </div>
          )}
        </div>

        {/* More (3 Dots) */}
        <div className="relative">
          <button onClick={() => toggleMenu('more')} className="px-3 py-1.5 bg-[#f3f4f6] rounded-xl text-gray-700 font-bold hover:bg-gray-200">
            •••
          </button>
          {openMenu === 'more' && (
            <div className="absolute right-0 mt-2 w-40 bg-white border shadow-xl rounded-xl z-50 py-1 text-xs">
              <div className="px-4 py-2 hover:bg-gray-50 cursor-pointer">Export Leads</div>
              <div onClick={() => handleDeleteLead(tableData[0]?.id)} className="px-4 py-2 hover:bg-red-50 text-red-500 cursor-pointer border-t">Delete Selected</div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Table (All Columns Restored) */}
      <div className="flex-1 overflow-auto px-6">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] text-gray-400 font-bold border-b border-gray-100 uppercase tracking-wider">
              <th className="py-4 px-2 w-10 text-center"><input type="checkbox" className="accent-black" /></th>
              <th className="py-4">Name</th>
              <th className="py-4">Organization</th>
              <th className="py-4">Status</th>
              <th className="py-4">Email</th>
              <th className="py-4">Mobile No</th>
              <th className="py-4 text-center">Assigned To</th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {tableData.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-5 px-2 text-center"><input type="checkbox" className="accent-black" /></td>
                <td className="py-5 font-medium">{row.name}</td>
                <td className="py-5 text-gray-600">{row.org}</td>
                <td className="py-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 border border-gray-200 rounded-full text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-black"></span> {row.status}
                  </span>
                </td>
                <td className="py-5 text-blue-500 underline cursor-pointer">{row.email}</td>
                <td className="py-5 text-gray-400 italic">📞 {row.mobile}</td>
                <td className="py-5 text-center text-gray-700">{row.assigned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Footer */}
      <div className="p-3 border-t flex justify-between items-center text-[12px] text-gray-400">
        <div className="flex gap-1">
          <button className="px-3 py-1 bg-gray-100 rounded-lg text-black font-bold">20</button>
          <button className="px-3 py-1 hover:bg-gray-50">50</button>
        </div>
        <div className="font-semibold tracking-wider">1 of 1</div>
      </div>

      {/* 5. Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-[340px]">
            <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-gray-800 tracking-tight">New Lead</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 text-xl font-light">✕</button>
            </div>
            <form onSubmit={handleAddLead} className="p-5 space-y-4">
              <input 
                type="text" placeholder="Full Name" 
                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-black" 
              />
              <input 
                type="text" placeholder="Organization" 
                value={formData.org} onChange={(e) => setFormData({...formData, org: e.target.value})}
                className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-black" 
              />
              <input 
                type="email" placeholder="Email Address" 
                value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-black" 
              />
              <button type="submit" className="w-full bg-black text-white py-2.5 rounded-md text-[13px] font-bold mt-2 hover:bg-gray-900 transition-all">
                Save Details
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;