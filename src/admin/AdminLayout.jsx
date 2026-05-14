import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminPermissions from './AdminPermissions';
import AdminImports from './AdminImports';

const isAdminUser = (user) => {
  if (!user) return false;
  if (user.is_admin || user.is_superuser) return true;
  const role = (user.role || '').toString().toLowerCase();
  return ['admin', 'administrator', 'system manager', 'superuser'].includes(role);
};

const AdminLayout = ({ user, onLogout, permissions }) => {
  const canOpenConsole =
    permissions?.admin_panel === true ||
    permissions?.admin_users === true ||
    permissions?.admin_permissions === true ||
    permissions?.import_data === true;

  if (!canOpenConsole) {
    return <Navigate to="/" replace />;
  }

  const adminUser = isAdminUser(user);
  const canManageUsers = permissions?.admin_users === true;
  const canManagePermissions = permissions?.admin_permissions === true;
  const canImport = permissions?.import_data === true;

  const firstAllowedPath = canManageUsers
    ? '/admin/users'
    : canManagePermissions
      ? '/admin/permissions'
      : canImport
        ? '/admin/imports'
        : permissions?.admin_panel === true
          ? '/admin'
          : '/';

  const showDashboard = adminUser;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--color-bg-base)' }}>
      <Sidebar onLogout={onLogout} user={user} permissions={permissions} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <main style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto', padding: '24px 32px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <Routes>
              <Route
                index
                element={
                  showDashboard ? (
                    <AdminDashboard />
                  ) : (
                    <Navigate to={firstAllowedPath} replace />
                  )
                }
              />
              <Route
                path="users"
                element={
                  canManageUsers ? (
                    <AdminUsers currentUser={user} />
                  ) : (
                    <Navigate to={firstAllowedPath} replace />
                  )
                }
              />
              <Route
                path="permissions"
                element={
                  canManagePermissions ? (
                    <AdminPermissions currentUser={user} />
                  ) : (
                    <Navigate to={firstAllowedPath} replace />
                  )
                }
              />
              <Route
                path="imports"
                element={
                  canImport ? (
                    <AdminImports />
                  ) : (
                    <Navigate to={firstAllowedPath} replace />
                  )
                }
              />
              <Route path="*" element={<Navigate to={firstAllowedPath} replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
