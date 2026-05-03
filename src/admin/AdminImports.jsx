import React from 'react';
import ImportData from '../pages/ImportData';

const AdminImports = () => {
  return (
    <div className="space-y-6">
      <div className="admin-panel p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--admin-muted)]">
          Data Operations
        </p>
        <h2 className="admin-title text-2xl mt-2">Controlled CSV imports</h2>
        <p className="text-sm text-[color:var(--admin-muted)] mt-2">
          Upload validated data to the CRM. Use the queue summary to verify
          success and resolve failures quickly.
        </p>
      </div>
      <ImportData variant="admin" />
    </div>
  );
};

export default AdminImports;
