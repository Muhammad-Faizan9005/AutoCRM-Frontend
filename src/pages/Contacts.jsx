import React, { useState } from 'react';

const Contacts = () => {
  const [showModal, setShowModal] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  // Contacts Data State
  const [contactsData, setContactsData] = useState([
    { id: 1, email: "contact@nexus-solutions.com", phone: "03124567890", org: "Nexus Solutions", status: "Active", modified: "2 days ago" },
    { id: 2, email: "support@blue-ocean.pk", phone: "03009876543", org: "Blue Ocean", status: "Inactive", modified: "1 week ago" }
  ]);

  const [formData, setFormData] = useState({ email: '', phone: '', org: '', status: 'Active' });

  // Menu toggle function
  const toggleMenu = (name) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!formData.email) return;
    const newContact = {
      id: Date.now(),
      email: formData.email,
      phone: formData.phone || "N/A",
      org: formData.org || "Individual",
      status: formData.status,
      modified: "Just now"
    };
    setContactsData([...contactsData, newContact]);
    setFormData({ email: '', phone: '', org: '', status: 'Active' });
    setShowModal(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-white font-sans text-[#333] relative">
      
      {/* 1. Header with Clickable List */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[14px]">
          <span className="text-gray-400">Contacts</span> <span className="text-gray-300">/</span>
          <div className="relative">
            <button onClick={() => toggleMenu('list')} className="font-bold flex items-center gap-1 hover:bg-gray-50 px-2 py-1 rounded">
              ☰ List <span className="text-[10px] opacity-50">▼</span>
            </button>
            {openMenu === 'list' && (
              <div className="absolute top-8 left-0 w-40 bg-white border shadow-lg rounded z-50 py-1 text-sm">
                <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer">All Contacts</div>
                <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-t">Favorite Contacts</div>
              </div>
            )}
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-black text-white px-5 py-1.5 rounded-full text-sm font-bold hover:bg-zinc-800 transition-all">
          + Create
        </button>
      </header>

      {/* 2. Action Bar (All Clickable) */}
      <div className="flex items-center justify-end gap-3 px-6 py-2 bg-[#fafafa] border-b border-gray-50 relative">
        <button onClick={() => window.location.reload()} className="p-2 bg-white border border-gray-200 rounded-xl text-xs hover:shadow-sm">🔄</button>
        
        {/* Status Filter */}
        <div className="relative">
          <button onClick={() => toggleMenu('statusFilter')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded text-gray-600 text-[13px] hover:bg-gray-50">
            Status <span className="text-[10px]">▼</span>
          </button>
          {openMenu === 'statusFilter' && (
            <div className="absolute left-0 mt-2 w-32 bg-white border shadow-xl rounded-md z-50 py-1 text-xs">
              <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Active</div>
              <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Inactive</div>
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="relative">
          <button onClick={() => toggleMenu('filter')} className="flex items-center gap-2 px-4 py-1.5 bg-[#f3f4f6] rounded-xl text-gray-700 font-medium hover:bg-gray-200 text-[13px]">
            <span>≡</span> Filter
          </button>
          {openMenu === 'filter' && (
            <div className="absolute right-0 mt-2 w-60 bg-white border shadow-2xl rounded-xl z-50 p-3 text-xs">
              <input type="text" placeholder="Search by email..." className="w-full border rounded-lg p-2 outline-none focus:border-black" />
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
              <div className="px-4 py-2 hover:bg-gray-50 cursor-pointer italic">Email (A-Z)</div>
              <div className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-t italic">Last Modified</div>
            </div>
          )}
        </div>

        {/* Columns */}
        <div className="relative">
          <button onClick={() => toggleMenu('columns')} className="flex items-center gap-2 px-4 py-1.5 bg-[#f3f4f6] rounded-xl text-gray-700 font-medium hover:bg-gray-200 text-[13px]">
            <span>⊞</span> Columns
          </button>
          {openMenu === 'columns' && (
            <div className="absolute right-0 mt-2 w-48 bg-white border shadow-xl rounded-xl z-50 p-3 space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked /> Phone</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked /> Organization</label>
            </div>
          )}
        </div>

        <button className="px-3 py-1.5 bg-[#f3f4f6] rounded-xl font-bold hover:bg-gray-200">•••</button>
      </div>

      {/* 3. Contacts Table */}
      <div className="flex-1 overflow-auto px-6 text-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] text-gray-400 font-bold border-b border-gray-100 uppercase tracking-wider">
              <th className="py-4 px-2 w-10 text-center"><input type="checkbox" className="accent-black" /></th>
              <th className="py-4">Email</th>
              <th className="py-4">Phone</th>
              <th className="py-4 text-center">Status</th>
              <th className="py-4">Organization</th>
              <th className="py-4 text-right pr-4">Last Modified</th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {contactsData.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-5 px-2 text-center"><input type="checkbox" className="accent-black" /></td>
                <td className="py-5 text-blue-500 font-medium cursor-pointer hover:underline">{row.email}</td>
                <td className="py-5 text-gray-600">📞 {row.phone}</td>
                <td className="py-5 text-center">
                  <div className="relative inline-block">
                    <button 
                      onClick={() => toggleMenu(`rowStatus-${row.id}`)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                        row.status === 'Active' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      {row.status} ▼
                    </button>
                    {openMenu === `rowStatus-${row.id}` && (
                      <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-24 bg-white border shadow-2xl rounded-md z-50 py-1 text-[10px] font-bold uppercase">
                        <div onClick={() => toggleMenu(null)} className="px-3 py-1.5 hover:bg-green-50 text-green-600 cursor-pointer">Active</div>
                        <div onClick={() => toggleMenu(null)} className="px-3 py-1.5 hover:bg-gray-50 text-gray-500 cursor-pointer">Inactive</div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-5">
                   <span className="flex items-center gap-2">
                     <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">G</span>
                     {row.org}
                   </span>
                </td>
                <td className="py-5 text-right pr-4 text-gray-400 italic font-medium">{row.modified}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* 4. Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-[340px]">
            <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold">New Contact</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddContact} className="p-5 space-y-4">
              <input type="email" placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-black" />
              <input type="text" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-black" />
              <select 
                value={formData.status} 
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-black bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <button type="submit" className="w-full bg-black text-white py-2.5 rounded-md text-[13px] font-bold mt-2 hover:bg-zinc-800">
                Save Contact
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;