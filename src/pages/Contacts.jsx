import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Filter, ArrowUpDown, LayoutPanelLeft, Download, RotateCcw, X, List as ListIcon, LayoutGrid } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../api/client';

const statusColorMap = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-700',
  lead: 'bg-blue-100 text-blue-800',
  churned: 'bg-red-100 text-red-800',
};

const statusLabelMap = {
  active: 'Active',
  inactive: 'Inactive',
  lead: 'Lead',
  churned: 'Churned',
};

const formatStatus = (status) => statusLabelMap[status] || 'Unknown';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const mapCustomerToContact = (customer) => ({
  id: customer.id,
  email: customer.email,
  phone: customer.phone || '-',
  org: customer.company || '-',
  status: customer.status || 'active',
  modified: formatDate(customer.updated_at),
});

const Contacts = ({ user }) => {
  // --- STATES ---
  const [viewMode, setViewMode] = useState('Table');
  const [contacts, setContacts] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({ email: true, phone: true, mobile: true, org: true, status: true, modified: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const canDelete = user?.role === 'admin';
  const latestRequestId = useRef(0);

  // Modal form
  const [formData, setFormData] = useState({
    salutation: 'Salutation',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    gender: 'Gender',
    company: '',
    designation: '',
    address: ''
  });

  const resetForm = () => {
    setFormData({
      salutation: 'Salutation',
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      gender: 'Gender',
      company: '',
      designation: '',
      address: ''
    });
  };

  const fetchContacts = useCallback(async () => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;

    setLoading(true);
    setError('');

    try {
      const data = await apiFetch('/api/customers/');
      if (requestId !== latestRequestId.current) return;

      const mapped = data.map(mapCustomerToContact);
      setContacts(mapped);
      setError('');
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err?.message || 'Unable to load contacts.');
    } finally {
      if (requestId === latestRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // --- FILTERED CONTACTS ---
  const filteredContacts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return contacts;

    return contacts.filter((contact) => {
      const values = [contact.email, contact.org, contact.phone, contact.modified];
      return values.some((value) => String(value).toLowerCase().includes(term));
    });
  }, [contacts, searchTerm]);

  // --- SORT ---
  const handleSort = (key) => {
    const sorted = [...contacts].sort((a,b) => String(a[key]).localeCompare(String(b[key])));
    setContacts(sorted);
    setActiveDropdown(null);
  };

  // --- STATUS CHANGE ---
  const handleStatusChange = async (id, newStatus) => {
    setActiveDropdown(null);
    setError('');

    try {
      const updated = await apiFetch(`/api/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      setContacts((prev) => prev.map((contact) => (
        contact.id === id ? mapCustomerToContact(updated) : contact
      )));
    } catch (err) {
      setError(err?.message || 'Unable to update contact status.');
    }
  };

  // --- SAVE CONTACT ---
  const handleSaveContact = async (e) => {
    e.preventDefault();
    setError('');

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const email = formData.email.trim();

    if (!firstName || !email) {
      setError('First name and email are required.');
      return;
    }

    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const notes = [formData.designation, formData.address]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' | ');

    const payload = {
      email,
      full_name: fullName,
      phone: formData.mobile.trim() || undefined,
      company: formData.company.trim() || undefined,
      status: 'active',
      notes: notes || undefined,
    };

    setIsSaving(true);

    try {
      const created = await apiFetch('/api/customers/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setContacts((prev) => [mapCustomerToContact(created), ...prev]);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err?.message || 'Unable to create contact.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (id) => {
    if (!canDelete) return;

    const confirmed = window.confirm('Delete this contact?');
    if (!confirmed) return;

    setError('');
    try {
      await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
      setContacts((prev) => prev.filter((contact) => contact.id !== id));
    } catch (err) {
      setError(err?.message || 'Unable to delete contact.');
    }
  };

  // --- EXPORT TO EXCEL ---
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(contacts);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "CRM_Contacts.xlsx");
    setIsExportOpen(false);
  };

  // --- GROUPED CONTACTS ---
  const groupedContacts = {
    active: contacts.filter(c => c.status === 'active'),
    inactive: contacts.filter(c => c.status === 'inactive'),
    lead: contacts.filter(c => c.status === 'lead'),
    churned: contacts.filter(c => c.status === 'churned'),
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50 font-sans text-sm space-y-3">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-black tracking-tight">Contacts</h1>

          {/* VIEW MODE SWITCH */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown==='view'?null:'view')} className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-md bg-white text-xs">
              {viewMode==='Table'?<ListIcon size={14}/>:<LayoutGrid size={14}/>}{viewMode}
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
          <button onClick={fetchContacts} className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">
            <RotateCcw size={18} />
          </button>
          <button onClick={()=>setIsCreateModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-900 font-semibold">
            <Plus size={16}/> Create
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-xs text-gray-500">Loading contacts...</div>
      )}

      {/* SEARCH + ACTIONS */}
      <div className="flex justify-between items-center">
        {/* SEARCH */}
        <div className="relative w-64">
          <Search className="absolute left-2 top-2 text-gray-400" size={16}/>
          <input type="text" placeholder="Search contacts..." className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 w-full text-xs" onChange={e=>setSearchTerm(e.target.value)}/>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-2">

          {/* FILTER */}
          <div className="relative">
            <button onClick={()=>setActiveDropdown(activeDropdown==='filter'?null:'filter')} className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs flex gap-1 items-center">
              <Filter size={14}/> Filter
            </button>
            {activeDropdown==='filter' && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow w-40 z-50 text-xs">
                {['Status','Organization'].map(f=>(<div key={f} className="p-2 hover:bg-gray-100 cursor-pointer">{f}</div>))}
              </div>
            )}
          </div>

          {/* SORT */}
          <div className="relative">
            <button onClick={()=>setActiveDropdown(activeDropdown==='sort'?null:'sort')} className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs flex gap-1 items-center">
              <ArrowUpDown size={14}/> Sort
            </button>
            {activeDropdown==='sort' && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow w-36 z-50 text-xs">
                {['email','status','modified'].map(s=>(<div key={s} onClick={()=>handleSort(s)} className="p-2 hover:bg-gray-100 cursor-pointer capitalize">{s}</div>))}
              </div>
            )}
          </div>

          {/* COLUMNS */}
          <div className="relative">
            <button onClick={()=>setActiveDropdown(activeDropdown==='cols'?null:'cols')} className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs flex gap-1 items-center">
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
    {viewMode === 'Table' && !loading && (
  <div className="mt-2 flex flex-col gap-1">
    {/* HEADER */}
    <div className="grid grid-cols-[30px_1fr_1fr_1fr_1fr_1fr_1fr_80px] bg-black text-white text-[10px] uppercase font-bold px-2 py-1 rounded-t-md">
      <div><input type="checkbox"/></div>
      {visibleColumns.org && <div>Organization</div>}
      {visibleColumns.phone && <div>Phone</div>}
      {visibleColumns.status && <div>Status</div>}
      {visibleColumns.email && <div>Email</div>}
      {visibleColumns.mobile && <div>Mobile</div>}
      {visibleColumns.modified && <div>Modified</div>}
      <div>Action</div>
    </div>

    {/* ROWS */}
    {filteredContacts.map(c => (
      <div key={c.id} className="grid grid-cols-[30px_1fr_1fr_1fr_1fr_1fr_1fr_80px] bg-white border-b border-gray-300 px-2 py-1 items-center text-xs">
        <div><input type="checkbox"/></div>
        {visibleColumns.org && <div className="font-bold">{c.org}</div>}
        {visibleColumns.phone && <div>{c.phone}</div>}
        {visibleColumns.status && <div>{formatStatus(c.status)}</div>}
        {visibleColumns.email && <div>{c.email}</div>}
        {visibleColumns.mobile && <div>{c.mobile || '-'}</div>}
        {visibleColumns.modified && <div className="text-gray-400 italic">{c.modified}</div>}
        <div className="flex flex-col justify-end text-right h-full pr-22">
          {canDelete && (
            <button
              onClick={() => handleDeleteContact(c.id)}
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
      {viewMode==='Kanban' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {Object.entries(groupedContacts).map(([status, items])=>(
            <div key={status} className="bg-gray-100 p-3 rounded-lg">
              <h3 className="text-xs font-bold mb-2">{formatStatus(status)}</h3>
              <div className="space-y-2">
                {items.map(c=>(
                  <div key={c.id} className="bg-white p-2 rounded shadow text-xs border">
                    <div className="font-bold">{c.email}</div>
                    <div className="text-gray-500">{c.org}</div>
                    <div className="mt-1 flex justify-between items-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColorMap[c.status]}`}>{formatStatus(c.status)}</span>
                      {canDelete && (
                        <button onClick={()=>handleDeleteContact(c.id)} className="text-red-500 text-[10px]">Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredContacts.length === 0 && (
        <div className="text-xs text-gray-500">No contacts found.</div>
      )}

      {/* CREATE CONTACT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-3">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-5 py-2 border-b border-gray-200 sticky top-0 bg-white z-20">
              <h3 className="text-md font-semibold text-gray-900">Create Contact</h3>
              <X size={18} className="cursor-pointer text-gray-400 hover:text-gray-700" onClick={()=>setIsCreateModalOpen(false)}/>
            </div>
            <div className="overflow-y-auto max-h-[65vh] p-5">
              <form id="contact-form" onSubmit={handleSaveContact} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {[
                  {name:'salutation', label:'Salutation', type:'select', options:['Salutation','Mr.','Ms.']},
                  {name:'firstName', label:'First Name', type:'text', required: true},
                  {name:'lastName', label:'Last Name', type:'text'},
                  {name:'email', label:'Email', type:'email', required: true},
                  {name:'mobile', label:'Mobile', type:'text'},
                  {name:'gender', label:'Gender', type:'select', options:['Gender','Male','Female']},
                  {name:'company', label:'Company', type:'text'},
                  {name:'designation', label:'Designation', type:'text'},
                  {name:'address', label:'Address', type:'text'}
                ].map((f,i)=> (
                  <div key={i}>
                    <label className="text-[9px] font-medium text-gray-500 uppercase mb-1 block">{f.label}</label>
                    {f.type==='select' ? (
                      <select className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300"
                        value={formData[f.name]} 
                        onChange={e=>setFormData({...formData,[f.name]:e.target.value})}>
                        {f.options.map((opt,idx)=><option key={idx}>{opt}</option>)}
                      </select>
                    ) : (
                      <input type={f.type} className="w-full border border-gray-300 p-1.5 rounded-md bg-white text-sm outline-none focus:ring-1 focus:ring-gray-300"
                        value={formData[f.name]} 
                        onChange={e=>setFormData({...formData,[f.name]:e.target.value})}
                        required={f.required} />
                    )}
                  </div>
                ))}
              </form>
            </div>
            <div className="flex justify-end gap-2 px-5 py-2 border-t bg-white sticky bottom-0 z-20">
              <button type="button" onClick={()=>setIsCreateModalOpen(false)} className="px-4 py-1.5 text-gray-600 font-medium text-sm hover:bg-gray-100 rounded-md transition">Discard</button>
              <button type="submit" form="contact-form" disabled={isSaving} className="px-5 py-1.5 bg-gray-900 text-white font-medium text-sm rounded-md shadow hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-60">
                {isSaving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {isExportOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-80 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm">Export Contacts</h3>
              <X size={16} className="cursor-pointer text-gray-400 hover:text-black" onClick={()=>setIsExportOpen(false)}/>
            </div>
            <button onClick={exportToExcel} className="w-full bg-black text-white py-2 rounded text-xs font-bold hover:bg-gray-800 transition">Download Excel</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Contacts;
