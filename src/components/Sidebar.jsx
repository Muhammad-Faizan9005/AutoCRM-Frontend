import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false); // Notification toggle state

  const menuItems = [
    { name: "Dashboard", path: "/" },
    { name: "Leads", path: "/leads" },
    { name: "Deals", path: "/deals" },
    { name: "Contacts", path: "/contacts" },
    { name: "Organizations", path: "/organizations" },
    { name: "Notes", path: "/notes" },
    { name: "Tasks", path: "/tasks" },
    { name: "Call Logs", path: "/call-logs" }
  ];

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col p-4 relative">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">CRM</h1>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Administrator</p>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {/* Clickable Notifications */}
        <div className="relative mb-4">
          <div 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`text-xs font-semibold px-2 flex items-center justify-between cursor-pointer transition-all p-2 rounded-md ${
              showNotifications ? "bg-gray-100 text-black" : "text-gray-400 hover:text-black hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>🔔</span> Notifications
            </div>
            {/* Red badge for unread */}
            <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full">3</span>
          </div>

          {/* Notification Dropdown Panel */}
          {showNotifications && (
            <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-100 shadow-xl rounded-lg z-[60] py-2 animate-in fade-in slide-in-from-top-1">
              <div className="px-4 py-2 border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between">
                Recent Alerts
                <button onClick={() => setShowNotifications(false)} className="hover:text-black">✕</button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50">
                  <p className="text-[11px] font-bold text-gray-800">New Lead Assigned</p>
                  <p className="text-[10px] text-gray-500">Sarah Khan was added to your list.</p>
                  <span className="text-[9px] text-blue-500 mt-1 block italic">2 mins ago</span>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50">
                  <p className="text-[11px] font-bold text-gray-800">Deal Status Updated</p>
                  <p className="text-[10px] text-gray-500">Deal #827 moved to Negotiation.</p>
                  <span className="text-[9px] text-blue-500 mt-1 block italic">1 hour ago</span>
                </div>
              </div>
              <div className="px-4 py-2 text-center">
                <button className="text-[10px] font-bold text-gray-400 hover:text-black uppercase underline decoration-gray-200">View All</button>
              </div>
            </div>
          )}
        </div>

        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  location.pathname === item.path
                    ? "bg-gray-100 text-black border-r-4 border-black"
                    : "text-gray-500 hover:bg-gray-50 hover:text-black"
                }`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-100 text-gray-400 text-xs space-y-3">
        <div className="flex items-center gap-2 cursor-pointer hover:text-black px-2">
          <span>❓</span> Help
        </div>
        <div className="flex items-center gap-2 cursor-pointer hover:text-black px-2">
          <span>⬅️</span> Collapse
        </div>
      </div>
    </div>
  );
};

export default Sidebar;