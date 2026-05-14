import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Briefcase, Building2, ClipboardList,
  CheckSquare, ChevronLeft, ChevronRight, Bell, X, LogOut, Shield,
  UserCircle, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const isAdminUser = (user) => {
  if (!user) return false;
  if (user.is_admin || user.is_superuser) return true;
  const role = (user.role || '').toString().toLowerCase();
  return ['admin', 'administrator', 'system manager', 'superuser'].includes(role);
};

const getRoleBadge = (user) => {
  if (!user) return { label: 'USER', className: 'badge-muted' };
  if (isAdminUser(user)) return { label: 'ADMIN', className: 'badge-accent' };
  const role = (user.role || '').toString().toLowerCase();
  if (role.includes('manager')) return { label: 'MANAGER', className: 'badge-success' };
  return { label: 'SALES', className: 'badge-muted' };
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
};

const navContainer = { animate: { transition: { staggerChildren: 0.04 } } };
const navItemVariant = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

const Sidebar = ({ onLogout, user, permissions }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const location = useLocation();
  const displayName = user?.full_name || user?.email || 'User';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const adminUser = isAdminUser(user);
  const consoleLabel = adminUser ? 'Admin Console' : 'Manager Console';
  const roleBadge = getRoleBadge(user);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', permission: 'dashboard' },
    { name: 'Leads', icon: Users, path: '/leads', permission: 'leads' },
    { name: 'Deals', icon: Briefcase, path: '/deals', permission: 'deals' },
    { name: 'Customers', icon: UserCircle, path: '/contacts', permission: 'contacts' },
    { name: 'Organizations', icon: Building2, path: '/orgs', permission: 'organizations' },
    { name: 'Notes', icon: ClipboardList, path: '/tasks', permission: 'notes' },
    { name: 'Tasks', icon: CheckSquare, path: '/todo', permission: 'tasks' },
  ];

  const canAccess = (permissionKey) => permissions?.[permissionKey] === true;
  const canOpenConsole =
    permissions?.admin_panel === true ||
    permissions?.admin_users === true ||
    permissions?.admin_permissions === true ||
    permissions?.import_data === true;
  const isManager = ['sales_manager', 'manager'].includes(
    (user?.role || '').toString().toLowerCase()
  );
  const adminHomePath = adminUser
    ? '/admin'
    : isManager && permissions?.admin_users === true
      ? '/admin/team'
      : permissions?.admin_users === true
        ? '/admin/users'
        : permissions?.admin_permissions === true
          ? '/admin/permissions'
          : permissions?.import_data === true
            ? '/admin/imports'
            : '/';

  const adminItems = [
    ...(adminUser
      ? [{ name: consoleLabel, icon: Shield, path: '/admin', permission: 'admin_panel' }]
      : []),
    { name: 'Users', icon: <Users size={18} />, path: '/admin/users', permission: 'admin_users' },
    ...(adminUser
      ? [{ name: 'Teams', icon: <Users size={18} />, path: '/admin/teams', permission: 'admin_users' }]
      : []),
    ...(isManager
      ? [{ name: 'My Team', icon: <Users size={18} />, path: '/admin/team', permission: 'admin_users' }]
      : []),
    { name: 'Permissions', icon: <LayoutDashboard size={18} />, path: '/admin/permissions', permission: 'admin_users' },
    { name: 'Imports', icon: <Users size={18} />, path: '/admin/imports', permission: 'import_data' },
  ];

  const navItems = (isAdminRoute ? adminItems : menuItems).filter((item) =>
    canAccess(item.permission),
  );
  const showAdminCenter = canOpenConsole;

  return (
    <div className="relative flex" style={{ zIndex: 30 }}>
      {/* Sidebar */}
      <motion.aside
        layout
        animate={{ width: isCollapsed ? 64 : 240 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        style={{
          background: 'var(--color-bg-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minHeight: '56px',
        }}>
          <div style={{
            width: 34,
            height: 34,
            background: 'var(--color-accent)',
            color: 'var(--color-text-inverse)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius)',
            flexShrink: 0,
          }}>
            CRM
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.1 } }}
                exit={{ opacity: 0, transition: { duration: 0.05 } }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--color-text-primary)' }}>
                  AutoCRM
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: -2 }}>
                  {displayName}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse Toggle */}
        <div style={{ padding: '8px 8px 0' }}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="btn-ghost btn-icon"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start', padding: '6px 8px', gap: '8px' }}
          >
            {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.1 } }}
                  exit={{ opacity: 0, transition: { duration: 0.05 } }}
                  style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Notification Button */}
        {!isAdminRoute && (
          <div style={{ padding: '4px 8px' }}>
            <button
              onClick={() => setIsNotifOpen(true)}
              className="btn-ghost"
              aria-label="Notifications"
              style={{
                width: '100%',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: '8px',
                gap: '8px',
              }}
            >
              <Bell size={16} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.1 } }}
                    exit={{ opacity: 0, transition: { duration: 0.05 } }}
                    style={{ fontSize: 'var(--text-sm)' }}
                  >
                    Notifications
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        )}

        <hr className="separator" style={{ margin: '4px 12px' }} />

        {/* Nav Items */}
        <motion.nav
          variants={navContainer}
          initial="initial"
          animate="animate"
          style={{ flex: 1, overflowY: 'auto', padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <motion.div key={item.path} variants={navItemVariant}>
                <Link
                  to={item.path}
                  aria-label={item.name}
                  title={isCollapsed ? item.name : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: isActive ? 'var(--weight-medium)' : 'var(--weight-regular)',
                    color: isActive ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                    background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                    textDecoration: 'none',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--color-bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon size={16} />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { delay: 0.1 } }}
                        exit={{ opacity: 0, transition: { duration: 0.05 } }}
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </motion.div>
            );
          })}
        </motion.nav>

        {/* Bottom Section */}
        <div style={{
          padding: '12px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {/* Theme Toggle */}
          <div style={{ display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-start', padding: '2px 0' }}>
            <ThemeToggle />
          </div>

          {/* Admin / CRM Home Link */}
          {showAdminCenter && !isAdminRoute && (
            <Link
              to={adminHomePath}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: 'var(--radius)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                transition: 'background 0.15s',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Shield size={16} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.1 } }}
                    exit={{ opacity: 0, transition: { duration: 0.05 } }}
                  >
                    {consoleLabel}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )}
          {isAdminRoute && (
            <Link
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: 'var(--radius)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                transition: 'background 0.15s',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LayoutDashboard size={16} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.1 } }}
                    exit={{ opacity: 0, transition: { duration: 0.05 } }}
                  >
                    CRM Home
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )}

          <hr className="separator" style={{ margin: '4px 0' }} />

          {/* User + Role Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 8px',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}>
            <div className="avatar avatar-md avatar-accent">
              {getInitials(displayName)}
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.1 } }}
                  exit={{ opacity: 0, transition: { duration: 0.05 } }}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <div style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-medium)',
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {displayName}
                  </div>
                  <span className={`badge ${roleBadge.className}`} style={{ marginTop: 2 }}>
                    {roleBadge.label}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="btn-ghost"
            style={{
              width: '100%',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: '8px 10px',
              gap: '8px',
              color: 'var(--color-danger)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <LogOut size={16} />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.1 } }}
                  exit={{ opacity: 0, transition: { duration: 0.05 } }}
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Notifications Panel */}
      <AnimatePresence>
        {isNotifOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotifOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.2)',
                zIndex: 150,
              }}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: 'fixed',
                left: isCollapsed ? 64 : 240,
                top: 0,
                height: '100vh',
                width: 320,
                background: 'var(--color-bg-surface)',
                borderRight: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 160,
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-md)' }}>
                  Notifications
                </h3>
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="btn-ghost btn-icon"
                  aria-label="Close notifications"
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{
                textAlign: 'center',
                color: 'var(--color-text-tertiary)',
                marginTop: 60,
                fontSize: 'var(--text-sm)',
              }}>
                <Bell size={28} style={{ margin: '0 auto 8px', color: 'var(--color-text-tertiary)' }} />
                No new notifications
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sidebar;
