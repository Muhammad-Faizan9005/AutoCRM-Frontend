import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Clock, RefreshCw, Search } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { SkeletonTable } from '../components/Skeleton';
import { getAdminActivityLog } from './adminApi';

const PAGE_SIZE = 50;
const ENTITY_OPTIONS = [
  { value: '', label: 'All records' },
  { value: 'lead', label: 'Leads' },
  { value: 'deal', label: 'Deals' },
  { value: 'task', label: 'Tasks' },
  { value: 'note', label: 'Notes' },
  { value: 'call', label: 'Calls' },
  { value: 'notification', label: 'Notifications' },
];

const EVENT_OPTIONS = [
  { value: '', label: 'All events' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'status_change', label: 'Status changes' },
  { value: 'agent_alert', label: 'AI alerts' },
  { value: 'agent_approval', label: 'AI approvals' },
];

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const titleCase = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase()) || '-';

const actorLabel = (item) => item.actor_name || item.actor_email || 'System';

const AdminActivityLog = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', entityType: '', eventType: '' });

  const hasMore = items.length < total;

  const loadLog = useCallback(async ({ append = false, skip = 0 } = {}) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const data = await getAdminActivityLog({
        skip,
        limit: PAGE_SIZE,
        search: filters.search.trim(),
        entityType: filters.entityType,
        eventType: filters.eventType,
      });
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setTotal(data.total);
    } catch (err) {
      setError(err?.message || 'Unable to load activity log.');
      if (!append) {
        setItems([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters.entityType, filters.eventType, filters.search]);

  useEffect(() => {
    loadLog({ append: false });
  }, [filters.entityType, filters.eventType, loadLog]);

  const filteredSummary = useMemo(() => {
    if (!total) return 'No events found';
    return `${items.length} of ${total} events`;
  }, [items.length, total]);

  const submitSearch = (event) => {
    event.preventDefault();
    loadLog({ append: false });
  };

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
              CRM history
            </div>
            <h1 className="page-title" style={{ fontSize: 'var(--text-2xl)' }}>Activity Log</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Review what happened, when it happened, and who was attached to the action.
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => loadLog({ append: false })} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        <div className="card card-padding">
          <form onSubmit={submitSearch} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 180px 180px auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label className="label">Search</label>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                <input
                  className="input"
                  value={filters.search}
                  onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                  placeholder="Search activity..."
                  style={{ paddingLeft: 32 }}
                />
              </div>
            </div>
            <div>
              <label className="label">Record</label>
              <select className="input" value={filters.entityType} onChange={(event) => setFilters((prev) => ({ ...prev, entityType: event.target.value }))}>
                {ENTITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Event</label>
              <select className="input" value={filters.eventType} onChange={(event) => setFilters((prev) => ({ ...prev, eventType: event.target.value }))}>
                {EVENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Apply</button>
          </form>
        </div>

        {error && (
          <div style={{ padding: 12, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
            {error}
          </div>
        )}

        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={17} />
              <h2 className="section-title">Recorded activity</h2>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{filteredSummary}</span>
          </div>

          {loading ? (
            <div style={{ padding: 10 }}>
              <SkeletonTable rows={8} cols={5} />
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
              No activity matches these filters.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Record</th>
                  <th>Event</th>
                  <th>Actor</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 'var(--weight-medium)' }}>{item.message}</div>
                    </td>
                    <td><span className="badge badge-muted">{titleCase(item.entity_type)}</span></td>
                    <td><span className="badge badge-accent">{titleCase(item.event_type)}</span></td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{actorLabel(item)}</td>
                    <td style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>
                      <Clock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} />
                      {formatDateTime(item.happened_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button type="button" className="btn btn-secondary" disabled={loadingMore} onClick={() => loadLog({ append: true, skip: items.length })}>
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default AdminActivityLog;
