import React, { useMemo, useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiFetch } from '../api/client';
import { PageTransition } from '../components/PageTransition';

const entityOptions = [
  { value: 'customers', label: 'Customers' },
  { value: 'tickets', label: 'Tickets' },
];

const entityColumns = {
  customers: ['email (required)', 'full_name (required)', 'phone', 'company', 'status', 'notes'],
  tickets: ['subject (required)', 'customer_id (required unless customer_email exists)', 'customer_email', 'description', 'status', 'priority', 'category', 'assigned_to'],
};

const ImportData = ({ variant = 'default' }) => {
  const [entity, setEntity] = useState('customers');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const columns = useMemo(() => entityColumns[entity] || [], [entity]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!file) { setError('Please choose a CSV or Excel file to import.'); return; }
    const formData = new FormData();
    formData.append('file', file);
    setIsSubmitting(true);
    try {
      const data = await apiFetch(`/api/import/${entity}`, { method: 'POST', body: formData }, { timeoutMs: 2000000000 });
      setResult(data);
    } catch (err) { setError(err?.message || 'Import failed.'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Import Data</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Upload CSV or Excel files to bulk-import CRM data.
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
            fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)',
          }}>
            <FileSpreadsheet size={14} /> Supported: CSV, XLSX, XLSM
          </div>
        </div>

        {/* Import Form */}
        <div className="card card-padding">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="label">Import Type</label>
                <select className="input" value={entity} onChange={e => { setEntity(e.target.value); setResult(null); setError(''); }}>
                  {entityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">File</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xlsm"
                  className="input"
                  style={{ padding: '6px 10px' }}
                  onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); setError(''); }}
                />
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                  Max size depends on backend limits.
                </p>
              </div>
            </div>

            {error && (
              <div style={{ padding: 12, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              <UploadCloud size={16} /> {isSubmitting ? 'Importing...' : 'Start Import'}
            </button>
          </form>
        </div>

        {/* Required Columns */}
        <div className="card card-padding">
          <h3 className="section-title" style={{ marginBottom: 12 }}>Required Columns</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {columns.map(col => (
              <div key={col} style={{
                padding: '8px 12px',
                background: 'var(--color-bg-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
              }}>
                {col}
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        {result && (
          <motion.div
            className="card card-padding"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="section-title">Import Summary</h3>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{result.file_name}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
              {[
                { label: 'Total Rows', value: result.total_rows },
                { label: 'Successful', value: result.successful_rows },
                { label: 'Created', value: result.created_count },
                { label: 'Updated', value: result.updated_count },
                { label: 'Failed', value: result.failed_count },
              ].map(s => (
                <div key={s.label} style={{
                  padding: 12,
                  background: 'var(--color-bg-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)', marginTop: 2 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {result.failures?.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <div style={{
                  padding: '8px 14px',
                  background: 'var(--color-danger-subtle)',
                  borderRadius: 'var(--radius) var(--radius) 0 0',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-semibold)',
                  color: 'var(--color-danger)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <XCircle size={14} /> Failures
                </div>
                <div style={{ border: '1px solid var(--color-border)', borderTop: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                  {result.failures.map((f, i) => (
                    <div key={`${f.row_number}-${i}`} style={{
                      padding: '8px 14px',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-secondary)',
                    }}>
                      <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>Row {f.row_number}:</span> {f.reason}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 12, fontSize: 'var(--text-sm)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} /> No row failures reported.
              </div>
            )}
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
};

export default ImportData;
