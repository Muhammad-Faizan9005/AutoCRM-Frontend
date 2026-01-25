import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, Building2, 
  ClipboardList, Check, ChevronLeft, ChevronRight, 
  UserCircle, Bell, X, LogOut 
} from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false); 
  const location = useLocation();

  // Menu items minus Call Logs
  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20}/>, path: '/' },
    { name: 'Leads', icon: <Users size={20}/>, path: '/leads' },
    { name: 'Deals', icon: <Briefcase size={20}/>, path: '/deals' },
    { name: 'Contacts', icon: <UserCircle size={20}/>, path: '/contacts' },
    { name: 'Organizations', icon: <Building2 size={20}/>, path: '/orgs' },
    { name: 'Notes', icon: <ClipboardList size={20}/>, path: '/tasks' },
    { name: 'Tasks', icon: <Check size={20}/>, path: '/todo' },
  ];

  return (
    <div className="relative flex">
      {/* --- SIDEBAR --- */}
      <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 relative h-screen shadow-sm`}>
        
        {/* User Profile Section */}
        <div className="p-6 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="min-w-[40px] h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-purple-100 transition-all">
               CRM
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left animate-in fade-in duration-500">
                <span className="text-sm font-black text-gray-800 tracking-tight leading-none mb-1">CRM</span>
                <span className="text-[10px] font-bold text-gray-400">Administrator</span>
              </div>
            )}
          </div>
        </div>

        {/* Notifications Button */}
        <div className="px-4 mt-4">
          <button 
            onClick={() => setIsNotifOpen(true)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isNotifOpen ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-100'} ${isCollapsed && 'justify-center'}`}
          >
            <Bell size={20} className={isNotifOpen ? "animate-pulse" : ""}/>
            {!isCollapsed && <span className="text-sm font-bold animate-in fade-in duration-300">Notifications</span>}
          </button>
        </div>
        
        {/* Main Menu Items */}
        <nav className="flex-1 px-4 mt-2 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === item.path 
                ? 'bg-purple-50 text-purple-700 font-black shadow-sm' 
                : 'text-gray-500 hover:bg-gray-50 font-medium'
              } ${isCollapsed && 'justify-center'}`}
            >
              {item.icon}
              {!isCollapsed && <span className="text-sm animate-in fade-in duration-300">{item.name}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom Collapse Action */}
        <div className="p-4 border-t border-gray-100">
           <button 
             onClick={() => setIsCollapsed(!isCollapsed)} // Functional Collapse
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all ${isCollapsed && 'justify-center'}`}
           >
             {isCollapsed ? <ChevronRight size={20}/> : <LogOut size={20}/>}
             {!isCollapsed && <span className="text-sm font-bold">Collapse</span>}
           </button>
        </div>
      </div>

      {/* --- NOTIFICATIONS PANEL (Matches Screenshot 108) --- */}
      {isNotifOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/5 z-[150]" onClick={() => setIsNotifOpen(false)} />
          
          {/* Panel - Alignment adjust according to sidebar width */}
          <div className={`fixed ${isCollapsed ? 'left-20' : 'left-64'} top-0 h-screen w-96 bg-white shadow-2xl border-l border-gray-100 z-[160] animate-in slide-in-from-left duration-300`}>
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
               <h3 className="text-base font-black text-gray-800 tracking-tight">Notifications</h3>
               <div className="flex items-center gap-4 text-gray-400">
                  <Check size={18} className="hover:text-green-500 cursor-pointer transition-colors" title="Mark all as read" />
                  <X size={18} className="hover:text-red-500 cursor-pointer transition-colors" onClick={() => setIsNotifOpen(false)} />
               </div>
            </div>

            {/* Content (Empty State) */}
            <div className="h-full flex flex-col items-center justify-center pb-32">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-200">
                  <Bell size={32} />
               </div>
               <p className="text-sm font-bold text-gray-400 tracking-tight">No new notifications</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;