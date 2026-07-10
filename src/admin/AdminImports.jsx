import React from 'react';
import ImportData from '../pages/ImportData';
import { PageTransition } from '../components/PageTransition';

const AdminImports = () => {
  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
            Data Operations
          </div>
          <h1 className="page-title" style={{ fontSize: 'var(--text-2xl)' }}>Lead imports</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Upload lead spreadsheets, validate the results, and resolve any failed rows from the import summary.
          </p>
        </div>
        <ImportData variant="admin" />
      </div>
    </PageTransition>
  );
};

export default AdminImports;
