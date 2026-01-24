import React, { useState } from 'react';

const Deals = () => {
  const [showModal, setShowModal] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  // Deals Data State with Random Email
  const [dealsData, setDealsData] = useState([
    { id: 1, org: "Tech-Global Ltd", revenue: "PKR 100,000,000.00", status: "Ready to Close", email: "contact@techglobal.com", mobile: "03364869005", assigned: "A Administrator" }
  ]);

  const [formData, setFormData] = useState({ org: '', revenue: '', email: '' });

  const toggleMenu = (name) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  const handleAddDeal = (e) => {
    e.preventDefault();
    if (!formData.org) return;
    const newDeal = {
      id: Date.now(),
      org: formData.org,
      revenue: formData.revenue || "PKR 0.00",
      status: "Discovery",
      email: formData.email || "info@example.com", // Default random email
      mobile: "Not Provided",
      assigned: "A Administrator"
    };
    setDealsData([...dealsData, newDeal]);
    setFormData({ org: '', revenue: '', email: '' });
    setShowModal(false);
  };

  const handleDeleteDeal = (id) => {
    setDealsData(dealsData.filter(item => item.id !== id));
    setOpenMenu(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-white font-sans text-[#333] relative">
      
      {/* 1. Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[14px]">
          <span className="text-gray-400">Deals</span> <span className="text-gray-300">/</span>
          <div className="relative">
            <button onClick={() => toggleMenu('list')} className="font-bold flex items-center gap-1 hover:bg-gray-50 px-2 py-1 rounded">
              ☰ List <span className="text-[10px] opacity-50">▼</span>
            </button>
            {openMenu === 'list' && (
              <div className="absolute top-8 left-0 w-40 bg-white border shadow-lg rounded z-50 py-1 text-sm text-gray-700">
                <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Active Deals</div>
                <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-t">Closed Deals</div>
              </div>
            )}
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-black text-white px-5 py-1.5 rounded-full text-sm font-bold hover:bg-zinc-800 transition-all">
          + Create
        </button>
      </header>

      {/* 2. Action Bar */}
      <div className="flex items-center justify-end gap-3 px-6 py-2 bg-[#fafafa] border-b border-gray-50 relative">
        <button onClick={() => window.location.reload()} className="p-2 bg-white border border-gray-200 rounded-xl hover:shadow-sm text-xs" title="Refresh">🔄</button>
        
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

        <div className="relative">
          <button onClick={() => toggleMenu('sort')} className="flex items-center gap-2 px-4 py-1.5 bg-[#f3f4f6] rounded-xl text-gray-700 font-medium hover:bg-gray-200 text-[13px]">
            <span>⇅</span> Sort
          </button>
          {openMenu === 'sort' && (
            <div className="absolute right-0 mt-2 w-44 bg-white border shadow-xl rounded-xl z-50 py-1 text-xs">
              <div className="px-4 py-2 hover:bg-gray-50 cursor-pointer">Revenue (High to Low)</div>
              <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-t">Organization A-Z</div>
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => toggleMenu('columns')} className="flex items-center gap-2 px-4 py-1.5 bg-[#f3f4f6] rounded-xl text-gray-700 font-medium hover:bg-gray-200 text-[13px]">
            <span>⊞</span> Columns
          </button>
          {openMenu === 'columns' && (
            <div className="absolute right-0 mt-2 w-48 bg-white border shadow-xl rounded-xl z-50 p-3 space-y-2 text-xs text-gray-600">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked /> Revenue</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked /> Status</label>
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => toggleMenu('more')} className="px-3 py-1.5 bg-[#f3f4f6] rounded-xl font-bold hover:bg-gray-200">
            •••
          </button>
          {openMenu === 'more' && (
            <div className="absolute right-0 mt-2 w-40 bg-white border shadow-xl rounded-xl z-50 py-1 text-xs text-center">
              <div onClick={() => handleDeleteDeal(dealsData[dealsData.length - 1]?.id)} className="px-4 py-2 hover:bg-red-50 text-red-500 cursor-pointer font-medium">Delete Last</div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Table */}
      <div className="flex-1 overflow-auto px-6">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] text-gray-400 font-bold border-b border-gray-100 uppercase tracking-wider">
              <th className="py-4 px-2 w-10 text-center"><input type="checkbox" className="accent-black" /></th>
              <th className="py-4">Organization</th>
              <th className="py-4">Annual Revenue</th>
              <th className="py-4 text-center">Status</th>
              <th className="py-4">Email</th>
              <th className="py-4">Mobile No</th>
              <th className="py-4 text-right pr-4">Assigned To</th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {dealsData.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                <td className="py-5 px-2 text-center"><input type="checkbox" className="accent-black" /></td>
                <td className="py-5 font-semibold text-gray-900">{row.org}</td>
                <td className="py-5 text-gray-600 font-medium">{row.revenue}</td>
                <td className="py-5 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-100 rounded-full text-[11px] font-bold text-purple-600 uppercase tracking-tighter">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span> {row.status}
                  </span>
                </td>
                <td className="py-5 text-blue-500 hover:underline cursor-pointer">{row.email}</td>
                <td className="py-5 text-gray-400 italic">📞 {row.mobile}</td>
                <td className="py-5 text-right pr-4 text-gray-700 font-medium">{row.assigned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Footer */}
      <div className="p-3 border-t flex justify-between items-center text-[12px] text-gray-400 bg-white">
        <div className="flex gap-1">
          <button className="px-3 py-1 bg-gray-100 rounded-lg text-black font-bold border border-gray-200">20</button>
          <button className="px-3 py-1 hover:bg-gray-50">50</button>
        </div>
        <div className="font-semibold tracking-wider">Total: {dealsData.length}</div>
      </div>

      {/* 5. Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-[340px]">
            <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-gray-800">New Deal Entry</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 text-xl font-light">✕</button>
            </div>
            <form onSubmit={handleAddDeal} className="p-5 space-y-4">
              <input type="text" placeholder="Organization" value={formData.org} onChange={(e) => setFormData({...formData, org: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-black" />
              <input type="text" placeholder="Revenue (e.g. PKR 500k)" value={formData.revenue} onChange={(e) => setFormData({...formData, revenue: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-black" />
              <input type="email" placeholder="Business Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-black" />
              <button type="submit" className="w-full bg-black text-white py-2.5 rounded-md text-[13px] font-bold mt-2 hover:bg-zinc-800 transition-all shadow-lg active:scale-[0.98]">
                Add to Pipeline
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deals;