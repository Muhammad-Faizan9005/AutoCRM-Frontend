import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Clock,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminOverview } from './adminApi';

const ICON_BY_LABEL = {
  'Active Operators': <Users size={18} />,
  'Permissions Changed': <ShieldCheck size={18} />,
  'Data Imports': <FileSpreadsheet size={18} />,
};

const getErrorMessage = (error, fallback) =>
  error?.message || error?.data?.detail || fallback;

const EMPTY_OVERVIEW = {
  highlights: [],
  coverage: [],
  watchlist: [],
  queues: [],
  activity: [],
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadOverview = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAdminOverview();
        if (mounted) {
          setOverview({
            highlights: Array.isArray(data?.highlights) ? data.highlights : [],
            coverage: Array.isArray(data?.coverage) ? data.coverage : [],
            watchlist: Array.isArray(data?.watchlist) ? data.watchlist : [],
            queues: Array.isArray(data?.queues) ? data.queues : [],
            activity: Array.isArray(data?.activity) ? data.activity : [],
          });
        }
      } catch (loadError) {
        if (mounted) {
          setError(getErrorMessage(loadError, 'Failed to load admin overview.'));
          setOverview(EMPTY_OVERVIEW);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadOverview();
    return () => {
      mounted = false;
    };
  }, []);

  const activityRows = useMemo(
    () =>
      overview.activity.map((item) => ({
        message: item?.message || 'Activity event',
        at: item?.at ? new Date(item.at) : null,
      })),
    [overview.activity],
  );

  return (
    <div className="space-y-8">
      <section className="admin-panel p-6 md:p-8 admin-rise">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--admin-muted)]">
              Mission Control
            </p>
            <h2 className="admin-title text-2xl md:text-3xl mt-2">
              Live governance radar
            </h2>
            <p className="text-sm text-[color:var(--admin-muted)] max-w-2xl mt-3">
              Track how access, data, and workflows are evolving without
              relying on the sales dashboard visuals.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="admin-pill" onClick={() => navigate('/admin/permissions')}>
              Run access audit
            </button>
            <button
              className="admin-pill admin-pill-accent"
              onClick={() => navigate('/admin/imports')}
            >
              Open import queue
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="admin-panel p-6 flex items-center gap-2 text-sm text-[color:var(--admin-muted)]">
          <Loader2 size={16} className="animate-spin" />
          Loading overview...
        </div>
      )}

      {!loading && (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            {overview.highlights.map((item, index) => (
              <div
                key={item.label}
                className="admin-panel p-5 admin-rise"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[color:var(--admin-muted)]">
                    {item.label}
                  </div>
                  <div className="h-9 w-9 rounded-2xl bg-[color:var(--admin-accent)]/10 text-[color:var(--admin-accent)] flex items-center justify-center">
                    {ICON_BY_LABEL[item.label] || <Activity size={18} />}
                  </div>
                </div>
                <div className="mt-4 text-3xl font-semibold">
                  {item.value}
                </div>
                <div className="mt-1 text-xs text-[color:var(--admin-muted)]">
                  {item.meta}
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="admin-panel p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Access coverage</h3>
                <span className="text-xs text-[color:var(--admin-muted)]">
                  Relative module activity
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {overview.coverage.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="text-[color:var(--admin-muted)]">
                        {item.percent}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[color:var(--admin-border)]/40">
                      <div
                        className="h-2 rounded-full bg-[color:var(--admin-accent)]"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
                {overview.coverage.length === 0 && (
                  <p className="text-xs text-[color:var(--admin-muted)]">No coverage metrics yet.</p>
                )}
              </div>
            </div>

            <div className="admin-panel p-6">
              <div className="flex items-center gap-2 text-sm text-[color:var(--admin-muted)]">
                <Activity size={16} />
                Risk watchlist
              </div>
              <div className="mt-4 space-y-4">
                {overview.watchlist.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-[color:var(--admin-accent-2)]/10 text-[color:var(--admin-accent-2)] flex items-center justify-center">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-[color:var(--admin-muted)]">
                        {item.value} - {item.note}
                      </p>
                    </div>
                  </div>
                ))}
                {overview.watchlist.length === 0 && (
                  <p className="text-xs text-[color:var(--admin-muted)]">No watchlist alerts right now.</p>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="admin-panel p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Operations queue</h3>
                <button className="text-xs text-[color:var(--admin-accent)] flex items-center gap-1">
                  View all <ArrowUpRight size={12} />
                </button>
              </div>
              <div className="mt-5 space-y-4">
                {overview.queues.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between rounded-2xl border border-[color:var(--admin-border)]/60 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-[color:var(--admin-muted)]">
                        {item.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[color:var(--admin-muted)]">
                      <Clock size={12} />
                      {item.age}
                    </div>
                  </div>
                ))}
                {overview.queues.length === 0 && (
                  <p className="text-xs text-[color:var(--admin-muted)]">Queue is empty.</p>
                )}
              </div>
            </div>

            <div className="admin-panel p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent admin activity</h3>
                <span className="text-xs text-[color:var(--admin-muted)]">
                  Activity log
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {activityRows.map((entry, index) => (
                  <div
                    key={`${entry.message}-${index}`}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="h-8 w-8 rounded-xl bg-[color:var(--admin-ink)]/10 flex items-center justify-center text-[color:var(--admin-ink)]">
                      {index + 1}
                    </div>
                    <div>
                      <p>{entry.message}</p>
                      <p className="text-xs text-[color:var(--admin-muted)]">
                        {entry.at ? entry.at.toLocaleString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))}
                {activityRows.length === 0 && (
                  <p className="text-xs text-[color:var(--admin-muted)]">No activity recorded yet.</p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
