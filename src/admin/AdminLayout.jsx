import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminPermissions from './AdminPermissions';
import AdminImports from './AdminImports';

const AdminLayout = ({ user, onLogout, permissions }) => {
  if (!permissions?.admin_panel) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar onLogout={onLogout} user={user} permissions={permissions} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route
              path="users"
              element={
                permissions?.admin_users ? (
                  <AdminUsers currentUser={user} />
                ) : (
                  <Navigate to="/admin" replace />
                )
              }
            />
            <Route
              path="permissions"
              element={
                permissions?.admin_permissions ? (
                  <AdminPermissions currentUser={user} />
                ) : (
                  <Navigate to="/admin" replace />
                )
              }
            />
            <Route
              path="imports"
              element={
                permissions?.import_data ? (
                  <AdminImports />
                ) : (
                  <Navigate to="/admin" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
