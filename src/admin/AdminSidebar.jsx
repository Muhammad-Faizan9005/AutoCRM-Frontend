import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Shield,
  Users,
  UsersRound,
  SlidersHorizontal,
  UploadCloud,
  Command,
  ArrowLeftCircle,
  LogOut,
} from 'lucide-react';

const isAdminUser = (user) => {
  if (!user) return false;
  if (user.is_admin || user.is_superuser) return true;
  const role = (user.role || '').toString().toLowerCase();
  return ['admin', 'administrator', 'system manager', 'superuser'].includes(role);
};

const isManagerUser = (user) => {
  const role = (user?.role || '').toString().toLowerCase();
  return role === 'sales_manager' || role === 'manager';
};

const AdminSidebar = ({ user, onLogout, permissions }) => {
  const adminActor = isAdminUser(user);
  const managerActor = isManagerUser(user);

  const navItems = [
    {
      label: 'Command',
      path: '/admin',
      icon: <Command size={18} />,
      permission: 'admin_panel',
      adminOnly: true,
    },
    {
      label: 'Users',
      path: '/admin/users',
      icon: <Users size={18} />,
      permission: 'admin_users',
    },
    {
      label: 'Teams',
      path: '/admin/teams',
      icon: <UsersRound size={18} />,
      permission: 'admin_users',
      adminOnly: true,
    },
    {
      label: 'My Team',
      path: '/admin/team',
      icon: <UsersRound size={18} />,
      permission: 'admin_users',
      managerOnly: true,
    },
    {
      label: 'Permissions',
      path: '/admin/permissions',
      icon: <Shield size={18} />,
      permission: 'admin_permissions',
    },
    {
      label: 'Imports',
      path: '/admin/imports',
      icon: <UploadCloud size={18} />,
      permission: 'import_data',
    },
  ];

  const canAccess = (item) => {
    if (item.adminOnly && !adminActor) return false;
    if (item.managerOnly && !managerActor) return false;
    return item.permission ? permissions?.[item.permission] !== false : true;
  };

  return (
    <aside className="w-full md:w-64 p-6 md:pt-8 md:pb-6">
      <div className="admin-panel p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--admin-muted)]">
              Admin Core
            </p>
            <p className="admin-title text-lg mt-2">
              AutoCRM Command
            </p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-[color:var(--admin-accent)] text-white flex items-center justify-center">
            <Shield size={18} />
          </div>
        </div>
        <div className="mt-4 text-xs text-[color:var(--admin-muted)]">
          Signed in as
          <div className="text-sm text-[color:var(--admin-ink)] font-semibold">
            {user?.full_name || user?.email || 'Admin'}
          </div>
          {user?.role && (
            <div className="mt-1 text-[10px] uppercase tracking-widest opacity-60">
              {user.role === 'sales_manager' || user.role === 'manager'
                ? 'Sales Manager'
                : user.role === 'admin'
                  ? 'Administrator'
                  : user.role}
            </div>
          )}
        </div>
      </div>

      <nav className="mt-6 space-y-2">
        {navItems
          .filter((item) => canAccess(item))
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition ${
                  isActive
                    ? 'bg-[color:var(--admin-ink)] text-white'
                    : 'bg-[color:var(--admin-panel)] text-[color:var(--admin-ink)] hover:-translate-y-[1px] hover:shadow-lg'
                }`
              }
            >
              <span className="flex items-center gap-2">
                {item.icon}
                {item.label}
              </span>
              <SlidersHorizontal size={14} className="opacity-40" />
            </NavLink>
          ))}
      </nav>

      <div className="mt-6 space-y-3">
        <Link
          to="/"
          className="flex items-center gap-2 text-xs text-[color:var(--admin-muted)] hover:text-[color:var(--admin-ink)]"
        >
          <ArrowLeftCircle size={14} />
          Back to CRM
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 text-xs text-[color:var(--admin-accent-2)]"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
