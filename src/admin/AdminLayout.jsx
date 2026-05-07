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
    <div className="flex h-screen bg-gray-100">
      <Sidebar onLogout={onLogout} user={user} permissions={permissions} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
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
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
