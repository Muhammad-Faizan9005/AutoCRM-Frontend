import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Briefcase, Building2, ClipboardList,
  CheckSquare, ChevronLeft, ChevronRight, Bell, X, LogOut, Shield,
  UserCircle, Bot
} from 'lucide-react';
import ProfileSettingsModal from './ProfileSettingsModal';
import { apiFetch } from '../api/client';

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

const Sidebar = ({ onLogout, user, permissions, onUserUpdate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const location = useLocation();
  const displayName = user?.full_name || user?.email || 'User';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const adminUser = isAdminUser(user);
  const consoleLabel = adminUser ? 'Admin Console' : 'Manager Console';
  const roleBadge = getRoleBadge(user);
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications],
  );

  useEffect(() => {
    let active = true;
    const fetchNotifications = async () => {
      setNotifLoading(true);
      try {
        const data = await apiFetch('/api/notifications/?skip=0&limit=30');
        if (active) setNotifications(Array.isArray(data) ? data : []);
      } catch {
        if (active) setNotifications([]);
      } finally {
        if (active) setNotifLoading(false);
      }
    };

    if (!isAdminRoute) fetchNotifications();
    return () => { active = false; };
  }, [isAdminRoute]);

  const handleOpenNotifications = async () => {
    setIsNotifOpen(true);
    try {
      const data = await apiFetch('/api/notifications/?skip=0&limit=30');
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  };

  const markOneRead = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    } catch {
      setNotifications((prev) => prev);
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
    } catch {
      setNotifications((prev) => prev);
    }
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', permission: 'dashboard' },
    { name: 'Leads', icon: Users, path: '/leads', permission: 'leads' },
    { name: 'Deals', icon: Briefcase, path: '/deals', permission: 'deals' },
    { name: 'Customers', icon: UserCircle, path: '/contacts', permission: 'contacts' },
    { name: 'Organizations', icon: Building2, path: '/orgs', permission: 'organizations' },
    { name: 'Notes', icon: ClipboardList, path: '/tasks', permission: 'notes' },
    { name: 'Tasks', icon: CheckSquare, path: '/todo', permission: 'tasks' },
  ];

  const canAccess = (permissionKey) => {
    if (permissionKey === 'ai_control') {
      return permissions?.admin_panel === true || permissions?.admin_users === true;
    }
    return permissions?.[permissionKey] === true;
  };
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
      ? '/admin'
      : permissions?.admin_users === true
        ? '/admin/users'
        : permissions?.admin_permissions === true
          ? '/admin/permissions'
          : permissions?.import_data === true
            ? '/admin/imports'
            : '/';

  const adminItems = [
    ...(adminUser || (isManager && permissions?.admin_users === true)
      ? [{ name: consoleLabel, icon: Shield, path: '/admin', permission: adminUser ? 'admin_panel' : 'admin_users' }]
      : []),
    { name: 'AI Control', icon: Bot, path: '/admin/ai', permission: 'ai_control' },
    { name: 'Users', icon: Users, path: '/admin/users', permission: 'admin_users' },
    ...(adminUser
      ? [{ name: 'Teams', icon: Users, path: '/admin/teams', permission: 'admin_users' }]
      : []),
    ...(isManager
      ? [{ name: 'My Team', icon: Users, path: '/admin/team', permission: 'admin_users' }]
      : []),
    { name: 'Permissions', icon: LayoutDashboard, path: '/admin/permissions', permission: 'admin_users' },
    { name: 'Imports', icon: Users, path: '/admin/imports', permission: 'import_data' },
  ];

  const navItems = (isAdminRoute ? adminItems : menuItems).filter((item) =>
    canAccess(item.permission),
  );
  const showAdminCenter = canOpenConsole;

  return (
    <div style={{ position: 'relative', display: 'flex', zIndex: 30 }}>
      {/* Edge collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute',
          top: '50%',
          left: isCollapsed ? 52 : 228,
          transform: 'translateY(-50%)',
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 40,
          color: 'var(--color-text-tertiary)',
          transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s, background 0.15s',
          boxShadow: 'var(--shadow-sm)',
          padding: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

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
          padding: '16px 12px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minHeight: '56px',
        }}>
          <img
            src="/brand/autocrm-mark.svg"
            alt="AutoCRM"
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius)',
              flexShrink: 0,
            }}
          />
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

        {/* Notification Button */}
        {!isAdminRoute && (
          <div style={{ padding: '4px 12px' }}>
            <button
              onClick={handleOpenNotifications}
              className="btn-ghost"
              aria-label="Notifications"
              style={{
                display: 'flex',
                width: '100%',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                alignItems: 'center',
                padding: '8px 10px',
                border: 'none',
                borderLeft: '3px solid transparent',
                gap: '10px',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
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
                    {unreadCount > 0 ? ` (${unreadCount})` : ''}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        )}


        {/* Nav Items */}
        <motion.nav
          variants={navContainer}
          initial="initial"
          animate="animate"
          style={{ flex: 1, overflowY: 'auto', padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}
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
          padding: '4px 12px',
          borderTop: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {/* Admin / CRM Home Link */}
          {showAdminCenter && !isAdminRoute && (
            <Link
              to={adminHomePath}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderLeft: '3px solid transparent',
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
                gap: '10px',
                padding: '8px 10px',
                borderLeft: '3px solid transparent',
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


          {/* User + Role Badge */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            title="Profile settings"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 10px',
              borderLeft: '3px solid transparent',
              borderRadius: 'var(--radius)',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div className="avatar avatar-md avatar-accent" style={{ overflow: 'hidden', flexShrink: 0 }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                getInitials(displayName)
              )}
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
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="btn-ghost"
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              alignItems: 'center',
              padding: '8px 10px',
              border: 'none',
              borderLeft: '3px solid transparent',
              gap: '10px',
              color: 'var(--color-danger)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
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
        {isProfileOpen && (
          <ProfileSettingsModal
            user={user}
            onClose={() => setIsProfileOpen(false)}
            onUserUpdate={onUserUpdate}
          />
        )}
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
                  Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="btn btn-ghost btn-sm" type="button">
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsNotifOpen(false)}
                    className="btn-ghost btn-icon"
                    aria-label="Close notifications"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              {notifLoading ? (
                <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>Loading...</div>
              ) : notifications.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: 'var(--color-text-tertiary)',
                  marginTop: 60,
                  fontSize: 'var(--text-sm)',
                }}>
                  <Bell size={28} style={{ margin: '0 auto 8px', color: 'var(--color-text-tertiary)' }} />
                  No new notifications
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 'calc(100vh - 110px)', overflowY: 'auto' }}>
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => !item.read_at && markOneRead(item.id)}
                      style={{
                        textAlign: 'left',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius)',
                        background: item.read_at ? 'var(--color-bg-elevated)' : 'var(--color-accent-subtle)',
                        padding: '10px 12px',
                        cursor: item.read_at ? 'default' : 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.title}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>{item.message}</div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sidebar;
