import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, Building2, ClipboardList, 
  Check, ChevronLeft, ChevronRight, UserCircle, Bell, X, LogOut, Shield
} from 'lucide-react';

const isAdminUser = (user) => {
  if (!user) return false;
  if (user.is_admin || user.is_superuser) return true;
  const role = (user.role || '').toString().toLowerCase();
  return ['admin', 'administrator', 'system manager', 'superuser'].includes(role);
};

const Sidebar = ({ onLogout, user, permissions }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const location = useLocation();
  const displayName = user?.full_name || user?.email || 'User';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const adminUser = isAdminUser(user);
  const consoleLabel = adminUser ? 'Admin Console' : 'Manager Console';

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={18}/>, path: '/', permission: 'dashboard' },
    { name: 'Leads', icon: <Users size={18}/>, path: '/leads', permission: 'leads' },
    { name: 'Deals', icon: <Briefcase size={18}/>, path: '/deals', permission: 'deals' },
    { name: 'Customers', icon: <UserCircle size={18}/>, path: '/contacts', permission: 'contacts' },
    { name: 'Organizations', icon: <Building2 size={18}/>, path: '/orgs', permission: 'organizations' },
    { name: 'Notes', icon: <ClipboardList size={18}/>, path: '/tasks', permission: 'notes' },
    { name: 'Tasks', icon: <Check size={18}/>, path: '/todo', permission: 'tasks' },
  ];

  const canAccess = (permissionKey) => permissions?.[permissionKey] === true;
  const canOpenConsole =
    permissions?.admin_panel === true ||
    permissions?.admin_users === true ||
    permissions?.admin_permissions === true ||
    permissions?.import_data === true;
  const adminHomePath = adminUser
    ? '/admin'
    : permissions?.admin_users === true
      ? '/admin/users'
      : permissions?.admin_permissions === true
        ? '/admin/permissions'
        : permissions?.import_data === true
          ? '/admin/imports'
          : '/';

  const adminItems = [
    ...(adminUser
      ? [{ name: consoleLabel, icon: <Shield size={18} />, path: '/admin', permission: 'admin_panel' }]
      : []),
    { name: 'Users', icon: <Users size={18} />, path: '/admin/users', permission: 'admin_users' },
    { name: 'Permissions', icon: <LayoutDashboard size={18} />, path: '/admin/permissions', permission: 'admin_permissions' },
    { name: 'Imports', icon: <Users size={18} />, path: '/admin/imports', permission: 'import_data' },
  ];

  const navItems = (isAdminRoute ? adminItems : menuItems).filter((item) =>
    canAccess(item.permission),
  );
  const showAdminCenter = canOpenConsole;

  return (
    <div className="relative flex">

      {/* Sidebar */}
      <div className={`${isCollapsed ? 'w-20' : 'w-60'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out h-screen shadow-sm`}>

        {/* Logo */}
        <div className="p-4 border-b border-gray-100 relative flex items-center gap-2">
          <div className="w-9 h-9 bg-black text-white font-black flex items-center justify-center rounded-md shadow">
            CRM
          </div>
          {!isCollapsed && (
            <div>
              <span className="text-sm font-semibold text-gray-900">AutoCRM</span>
              <p className="text-[10px] text-gray-500">{displayName}</p>
            </div>
          )}
          {/* Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-3 bg-white border border-gray-200 rounded-full p-1 shadow hover:scale-110 transition"
          >
            {isCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
          </button>
        </div>

        {!isAdminRoute && (
          <div className="px-3 mt-3">
            <button
              onClick={() => setIsNotifOpen(true)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition ${isCollapsed && 'justify-center'}`}
            >
              <Bell size={18}/>
              {!isCollapsed && <span className="text-xs font-medium">Notifications</span>}
            </button>
          </div>
        )}

        {/* Menu */}
        <nav className="flex-1 mt-2 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                location.pathname === item.path
                  ? 'bg-black text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              } ${isCollapsed && 'justify-center'}`}
            >
              {item.icon}
              {!isCollapsed && <span className="text-xs">{item.name}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          {showAdminCenter && !isAdminRoute && (
            <Link
              to={adminHomePath}
              className={`mb-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition ${isCollapsed && 'justify-center'}`}
            >
              <Shield size={18} />
              {!isCollapsed && <span className="text-xs font-medium">{consoleLabel}</span>}
            </Link>
          )}
          {isAdminRoute && (
            <Link
              to="/"
              className={`mb-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition ${isCollapsed && 'justify-center'}`}
            >
              <LayoutDashboard size={18} />
              {!isCollapsed && <span className="text-xs font-medium">CRM Home</span>}
            </Link>
          )}
          <button
            onClick={() => {
              onLogout();
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition ${isCollapsed && 'justify-center'}`}
          >
            <LogOut size={18}/>
            {!isCollapsed && <span className="text-xs font-medium">Logout</span>}
          </button>
        </div>
      </div>

      {/* Notifications Panel */}
      {isNotifOpen && (
        <>
          <div className="fixed inset-0 bg-black/5 z-[150]" onClick={() => setIsNotifOpen(false)} />
          <div className={`fixed ${isCollapsed ? 'left-20' : 'left-60'} top-0 h-screen w-80 bg-white shadow-2xl border-l z-[160] p-5`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
              <X size={16} className="cursor-pointer text-gray-500 hover:text-gray-700" onClick={() => setIsNotifOpen(false)} />
            </div>
            <div className="text-center text-gray-400 mt-16">
              <Bell size={28} className="mx-auto mb-2"/>
              No new notifications
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default Sidebar;
