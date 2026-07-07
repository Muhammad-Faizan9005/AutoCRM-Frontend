import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminPermissions from './AdminPermissions';
import AdminImports from './AdminImports';
import AdminTeams from './AdminTeams';
import ManagerTeam from './ManagerTeam';
import AIControlCenter from './AIControlCenter';
import Sidebar from '../components/Sidebar';

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

const AdminLayout = ({ user, onLogout, permissions, onUserUpdate }) => {
  const canOpenConsole =
    permissions?.admin_panel === true ||
    permissions?.admin_users === true ||
    permissions?.admin_permissions === true ||
    permissions?.import_data === true;

  if (!canOpenConsole) {
    return <Navigate to="/" replace />;
  }

  const adminUser = isAdminUser(user);
  const managerUser = isManagerUser(user);
  const canManageUsers = permissions?.admin_users === true;
  const canManagePermissions = permissions?.admin_permissions === true;
  const canImport = permissions?.import_data === true;
  const canControlAI = permissions?.admin_panel === true || permissions?.admin_users === true;

  // Admins and managers land on the console dashboard.
  const firstAllowedPath = (adminUser || managerUser) && canManageUsers
    ? '/admin'
    : canManageUsers
      ? '/admin/users'
      : canManagePermissions
        ? '/admin/permissions'
        : canImport
          ? '/admin/imports'
          : permissions?.admin_panel === true
            ? '/admin'
            : '/';

  const showDashboard = adminUser || (managerUser && canManageUsers);

  return (
    <div className="admin-shell">
      <Sidebar onLogout={onLogout} user={user} permissions={permissions} onUserUpdate={onUserUpdate} />
      <div className="admin-content">
        <main className="admin-main">
          <div className="admin-container">
          <Routes>
            {/* Admin command dashboard */}
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

            {/* Users directory */}
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

            {/* Admin: all teams */}
            <Route
              path="teams"
              element={
                adminUser && canManageUsers ? (
                  <AdminTeams currentUser={user} />
                ) : (
                  <Navigate to={firstAllowedPath} replace />
                )
              }
            />

            {/* Manager: own team */}
            <Route
              path="team"
              element={
                canManageUsers ? (
                  <ManagerTeam currentUser={user} />
                ) : (
                  <Navigate to={firstAllowedPath} replace />
                )
              }
            />

            {/* Permissions */}
            <Route
              path="permissions"
              element={
                (canManagePermissions || (managerUser && canManageUsers)) ? (
                  <AdminPermissions currentUser={user} />
                ) : (
                  <Navigate to={firstAllowedPath} replace />
                )
              }
            />

            {/* Imports */}
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

            <Route
              path="ai"
              element={
                canControlAI ? (
                  <AIControlCenter currentUser={user} />
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

