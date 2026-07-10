import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Briefcase, Clock, DollarSign, Target, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getAdminOverview } from './adminApi';
import { PageTransition, staggerContainer, staggerItem } from '../components/PageTransition';
import { CountUp } from '../components/CountUp';
import { SkeletonDashboard } from '../components/Skeleton';

const ICON_BY_LABEL = {
  'Open Pipeline': DollarSign,
  'Won Revenue': Target,
  'New Leads': Activity,
  'Overdue Tasks': Clock,
  'Active Operators': Users,
  'Unassigned Records': Briefcase,
};

const getErrorMessage = (error, fallback) => error?.message || error?.data?.detail || fallback;
const EMPTY = { highlights: [], coverage: [], sources: [], watchlist: [], queues: [], team_performance: [], activity: [] };

const getNumericValue = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const MetricValue = ({ value }) => {
  const numeric = getNumericValue(value);
  if (numeric === null) return <>{value || '0'}</>;
  return <CountUp value={numeric} />;
};

const ProgressList = ({ title, subtitle, items, emptyText }) => (
  <div className="card card-padding">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12 }}>
      <h3 className="section-title">{title}</h3>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textAlign: 'right' }}>{subtitle}</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map(item => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: 6, gap: 12 }}>
            <span>{item.label}</span>
            <span style={{ color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
              {item.value || `${item.percent}%`}{item.meta ? ` - ${item.meta}` : ''}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-hover)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, Number(item.percent) || 0))}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 999, background: 'var(--color-accent)' }}
            />
          </div>
        </div>
      ))}
      {items.length === 0 && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>{emptyText}</p>}
    </div>
  </div>
);

const AdminDashboard = () => {
  const [overview, setOverview] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const data = await getAdminOverview();
        if (mounted) setOverview({
          highlights: Array.isArray(data?.highlights) ? data.highlights : [],
          coverage: Array.isArray(data?.coverage) ? data.coverage : [],
          sources: Array.isArray(data?.sources) ? data.sources : [],
          watchlist: Array.isArray(data?.watchlist) ? data.watchlist : [],
          queues: Array.isArray(data?.queues) ? data.queues : [],
          team_performance: Array.isArray(data?.team_performance) ? data.team_performance : [],
          activity: Array.isArray(data?.activity) ? data.activity : [],
        });
      } catch (e) { if (mounted) { setError(getErrorMessage(e, 'Failed to load overview.')); setOverview(EMPTY); } }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const activityRows = useMemo(() => overview.activity.map(i => ({
    message: i?.message || 'Activity event',
    at: i?.at ? new Date(i.at) : null,
  })), [overview.activity]);

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {error && <div style={{ padding: 12, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>{error}</div>}

        {loading ? (
          <SkeletonDashboard />
        ) : (
          <>
            {/* KPI Cards */}
            <motion.div variants={staggerContainer} initial="initial" animate="animate" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
              {overview.highlights.map((item) => {
                const Icon = ICON_BY_LABEL[item.label] || Activity;
                return (
                  <motion.div key={item.label} variants={staggerItem} className="card card-padding">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{item.label}</div>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius)', background: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                        <Icon size={18} />
                      </div>
                    </div>
                    <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', fontFamily: 'var(--font-display)', marginTop: 8 }}>
                      <MetricValue value={item.value} />
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>{item.meta}</div>
                  </motion.div>
                );
              })}
              {overview.highlights.length === 0 && (
                <div className="card card-padding" style={{ gridColumn: '1 / -1', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  No highlight metrics available.
                </div>
              )}
            </motion.div>

            {/* Pipeline + Sources */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <ProgressList
                title="Deal stages"
                subtitle="Count and value by stage"
                items={overview.coverage}
                emptyText="No deal stage metrics yet."
              />

              <ProgressList
                title="Lead sources"
                subtitle="Top acquisition channels"
                items={overview.sources}
                emptyText="No lead source metrics yet."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card card-padding">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 className="section-title">Team performance</h3>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Pipeline performance</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {overview.team_performance.map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{item.label}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{item.meta}</div>
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{item.value}</div>
                    </div>
                  ))}
                  {overview.team_performance.length === 0 && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>No team performance yet.</p>}
                </div>
              </div>

              <div className="card card-padding">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 className="section-title">Recent admin activity</h3>
                  <Link to="/admin/activity-log" className="btn btn-secondary btn-sm">Activity Log</Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activityRows.map((entry, i) => (
                    <div key={`${entry.message}-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', flexShrink: 0, color: 'var(--color-text-secondary)' }}>{i + 1}</div>
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)' }}>{entry.message}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{entry.at ? entry.at.toLocaleString() : 'Just now'}</div>
                      </div>
                    </div>
                  ))}
                  {activityRows.length === 0 && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>No activity recorded.</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
};

export default AdminDashboard;

