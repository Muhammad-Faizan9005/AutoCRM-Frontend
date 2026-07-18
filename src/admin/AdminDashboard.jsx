import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Briefcase, Calendar, ChevronDown, Clock, DollarSign, RefreshCcw, Target, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getAdminOverview } from './adminApi';
import { isAdminUser, isManagerUser } from './roles';
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

const ICON_COLOR_BY_LABEL = {
  'Open Pipeline': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.14)' },
  'Won Revenue': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.14)' },
  'New Leads': { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.14)' },
  'Overdue Tasks': { color: '#f97316', bg: 'rgba(249, 115, 22, 0.14)' },
  'Active Operators': { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.14)' },
  'Unassigned Records': { color: '#eab308', bg: 'rgba(234, 179, 8, 0.14)' },
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

const AdminDashboard = ({ user }) => {
  const [overview, setOverview] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('Last 7 Days');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const timeDropdownRef = useRef(null);

  const daysMap = {
    'Last 7 Days': 7,
    'Last 30 Days': 30,
    'Last 90 Days': 90,
  };
  const selectedDays = daysMap[timeRange] || 7;

  const dashboardTitle = isAdminUser(user) ? 'Admin Dashboard' : isManagerUser(user) ? 'Manager Dashboard' : 'Dashboard';

  useEffect(() => {
    if (!activeDropdown) return undefined;

    const closeDropdown = (event) => {
      if (timeDropdownRef.current?.contains(event.target)) return;
      setActiveDropdown(null);
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setActiveDropdown(null);
    };

    document.addEventListener('pointerdown', closeDropdown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeDropdown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [activeDropdown]);

  const fetchOverview = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const data = await getAdminOverview({ days: selectedDays });
      setOverview({
        highlights: Array.isArray(data?.highlights) ? data.highlights : [],
        coverage: Array.isArray(data?.coverage) ? data.coverage : [],
        sources: Array.isArray(data?.sources) ? data.sources : [],
        watchlist: Array.isArray(data?.watchlist) ? data.watchlist : [],
        queues: Array.isArray(data?.queues) ? data.queues : [],
        team_performance: Array.isArray(data?.team_performance) ? data.team_performance : [],
        activity: Array.isArray(data?.activity) ? data.activity : [],
      });
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load overview.'));
      setOverview(EMPTY);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [selectedDays]);

  useEffect(() => {
    fetchOverview(true);
  }, [fetchOverview]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOverview(false);
    setIsRefreshing(false);
  };

  const activityRows = useMemo(() => overview.activity.map(i => ({
    message: i?.message || 'Activity event',
    at: i?.at ? new Date(i.at) : null,
  })), [overview.activity]);

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">{dashboardTitle}</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Console overview and team metrics.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Time Range Selector */}
            <div ref={timeDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'time' ? null : 'time')}
                className="btn btn-secondary"
                style={{ gap: 6 }}
              >
                <Calendar size={14} /> {timeRange} <ChevronDown size={14} />
              </button>
              {activeDropdown === 'time' && (
                <div className="dropdown-menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)' }}>
                  {['Last 7 Days', 'Last 30 Days', 'Last 90 Days'].map(t => (
                    <button
                      key={t}
                      className="dropdown-item"
                      onClick={() => { setTimeRange(t); setActiveDropdown(null); }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className="btn btn-ghost btn-icon"
              aria-label="Refresh dashboard"
              style={{ transition: 'transform 0.3s' }}
            >
              <RefreshCcw size={16} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {error && <div style={{ padding: 12, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>{error}</div>}

        {loading ? (
          <SkeletonDashboard />
        ) : (
          <>
            {/* KPI Cards */}
            <motion.div variants={staggerContainer} initial="initial" animate="animate" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
              {overview.highlights.map((item) => {
                const Icon = ICON_BY_LABEL[item.label] || Activity;
                const iconColor = ICON_COLOR_BY_LABEL[item.label] || { color: 'var(--color-accent)', bg: 'var(--color-accent-subtle)' };
                return (
                  <motion.div key={item.label} variants={staggerItem} className="card card-padding">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{item.label}</div>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius)', background: iconColor.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor.color }}>
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PageTransition>
  );
};

export default AdminDashboard;

