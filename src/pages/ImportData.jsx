import React, { useMemo, useState } from 'react';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';
import { apiFetch } from '../api/client';

const entityOptions = [
  { value: 'customers', label: 'Customers' },
  { value: 'tickets', label: 'Tickets' },
];

const entityColumns = {
  customers: [
    'email (required)',
    'full_name (required)',
    'phone',
    'company',
    'status',
    'notes',
  ],
  tickets: [
    'subject (required)',
    'customer_id (required unless customer_email exists)',
    'customer_email',
    'description',
    'status',
    'priority',
    'category',
    'assigned_to',
  ],
};

const ImportData = () => {
  const [entity, setEntity] = useState('customers');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allowedTypes = '.csv,.xlsx,.xlsm';

  const columns = useMemo(() => entityColumns[entity] || [], [entity]);

  const handleEntityChange = (event) => {
    setEntity(event.target.value);
    setResult(null);
    setError('');
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setResult(null);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!file) {
      setError('Please choose a CSV or Excel file to import.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsSubmitting(true);
    try {
      const data = await apiFetch(`/api/import/${entity}`, {
        method: 'POST',
        body: formData,
      }, { timeoutMs: 2000000000 });

      setResult(data);
    } catch (err) {
      setError(err?.message || 'Import failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50 font-sans text-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-black tracking-tight">Import Data</h1>
          <p className="text-xs text-gray-500 mt-1">Admin-only CSV or Excel import for CRM data.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600">
          <FileSpreadsheet size={16} />
          Supported: CSV, XLSX, XLSM
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Import Type</label>
              <select
                className="w-full border border-gray-300 p-2 rounded-lg text-sm"
                value={entity}
                onChange={handleEntityChange}
              >
                {entityOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">File</label>
              <input
                type="file"
                accept={allowedTypes}
                className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-white"
                onChange={handleFileChange}
              />
              <p className="text-[10px] text-gray-400 mt-1">Max size depends on backend limits.</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-xs font-semibold hover:bg-gray-900 disabled:opacity-60"
          >
            <UploadCloud size={16} />
            {isSubmitting ? 'Importing...' : 'Start Import'}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-black mb-3">Required Columns</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {columns.map((column) => (
            <div key={column} className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              {column}
            </div>
          ))}
        </div>
      </div>

      {result && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-black">Import Summary</h2>
            <span className="text-xs text-gray-500">{result.file_name}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase">Total Rows</p>
              <p className="text-sm font-semibold text-gray-900">{result.total_rows}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase">Successful</p>
              <p className="text-sm font-semibold text-gray-900">{result.successful_rows}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase">Created</p>
              <p className="text-sm font-semibold text-gray-900">{result.created_count}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase">Updated</p>
              <p className="text-sm font-semibold text-gray-900">{result.updated_count}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase">Failed</p>
              <p className="text-sm font-semibold text-gray-900">{result.failed_count}</p>
            </div>
          </div>

          {result.failures?.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700">Failures</div>
              <div className="divide-y divide-gray-200">
                {result.failures.map((failure, index) => (
                  <div key={`${failure.row_number}-${index}`} className="px-4 py-2 text-xs text-gray-600">
                    <span className="font-semibold text-gray-800">Row {failure.row_number}:</span> {failure.reason}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-green-600">No row failures reported.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportData;
