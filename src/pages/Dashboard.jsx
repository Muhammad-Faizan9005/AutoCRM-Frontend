import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, RefreshCcw, ChevronDown, Users, Briefcase, Building2, CheckSquare, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { apiFetch } from '../api/client';
import { CountUp } from '../components/CountUp';
import { PageTransition } from '../components/PageTransition';
import { SkeletonDashboard } from '../components/Skeleton';
import { useChartColors } from '../hooks/useChartColors';
import { formatAiSummaryLines } from '../utils/aiContentFormatter';

const DASHBOARD_TIMEOUT_MS = 20000;

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '-';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `USD ${numeric.toLocaleString()}`;
  }
};

const formatDateLabel = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const pickChartTicks = (items, selectedDays) => {
  if (!items.length) return [];
  const maxTicks = selectedDays <= 7 ? items.length : selectedDays <= 30 ? 6 : 7;
  if (items.length <= maxTicks) return items.map((item) => item.date);

  const lastIndex = items.length - 1;
  const step = lastIndex / (maxTicks - 1);
  const indexes = new Set();
  for (let i = 0; i < maxTicks; i += 1) {
    indexes.add(Math.round(i * step));
  }

  return [...indexes]
    .sort((a, b) => a - b)
    .map((index) => items[index]?.date)
    .filter(Boolean);
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};
const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const KPI_ICONS = {
  Leads: Users,
  Deals: Briefcase,
  Organizations: Building2,
  Tasks: CheckSquare,
  Revenue: DollarSign,
};

const KPI_COLOR_MAP = {
  '--color-accent':  { bg: 'var(--color-accent-subtle)',  fg: 'var(--color-accent)' },
  '--color-success': { bg: 'var(--color-success-subtle)', fg: 'var(--color-success)' },
  '--color-warning': { bg: 'var(--color-warning-subtle)', fg: 'var(--color-warning)' },
  '--color-danger':  { bg: 'var(--color-danger-subtle)',  fg: 'var(--color-danger)' },
};

const getTrend = (summary, key) => {
  const trend = summary?.trends?.[key];
  if (!trend || trend.value === null || trend.value === undefined) return null;
  return {
    direction: trend.direction === 'down' ? 'down' : 'up',
    value: trend.value,
  };
};

function KpiCard({ label, value, icon: Icon, color, trend }) {
  const numericValue = typeof value === 'number' ? value : null;
  return (
    <motion.div variants={staggerItem} className="card card-padding">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-medium)',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 6,
          }}>
            {label}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--color-text-primary)',
          }}>
            {numericValue !== null ? (
              <CountUp value={numericValue} formatFn={label === 'Revenue' ? formatCurrency : undefined} />
            ) : (
              value
            )}
          </div>
        </div>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius)',
          background: (KPI_COLOR_MAP[color] || KPI_COLOR_MAP['--color-accent']).bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: (KPI_COLOR_MAP[color] || KPI_COLOR_MAP['--color-accent']).fg,
        }}>
          <Icon size={20} />
        </div>
      </div>
      {trend && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 10,
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--weight-medium)',
          color: trend.direction === 'up' ? 'var(--color-success)' : 'var(--color-danger)',
        }}>
          {trend.direction === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend.value}%
          <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 2 }}>vs previous period</span>
        </div>
      )}
    </motion.div>
  );
}

const Dashboard = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('Last 7 Days');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const chartColors = useChartColors();

  const daysMap = {
    'Last 7 Days': 7,
    'Last 30 Days': 30,
    'Last 90 Days': 90,
  };

  const selectedDays = daysMap[timeRange] || 7;

  const fetchDashboard = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    setError('');

    try {
      const [summaryResult, activityResult, aiSummaryResult] = await Promise.allSettled([
        apiFetch(`/api/dashboard/summary?days=${selectedDays}`, {}, { timeoutMs: DASHBOARD_TIMEOUT_MS }),
        apiFetch(`/api/dashboard/activity?days=${selectedDays}`, {}, { timeoutMs: DASHBOARD_TIMEOUT_MS }),
        apiFetch('/api/dashboard/ai-summary/latest', {}, { timeoutMs: DASHBOARD_TIMEOUT_MS, cache: false }),
      ]);

      let nextError = '';

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value);
      } else {
        nextError = summaryResult.reason?.message || 'Unable to load summary metrics.';
      }

      if (activityResult.status === 'fulfilled') {
        setActivity(activityResult.value);
      } else {
        const activityError = activityResult.reason?.message || 'Unable to load activity metrics.';
        nextError = nextError ? `${nextError} ${activityError}` : activityError;
      }

      if (aiSummaryResult?.status === 'fulfilled') {
        setAiSummary(aiSummaryResult.value);
      }

      if (nextError) {
        setError(nextError);
      }
    } catch (err) {
      setError(err?.message || 'Unable to load dashboard metrics.');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [selectedDays]);

  useEffect(() => {
    fetchDashboard(true);
  }, [fetchDashboard]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboard(false);
    setIsRefreshing(false);
  };

  const topStats = useMemo(() => {
    if (!summary) {
      return [
        { label: 'Leads', value: 0, icon: Users, color: '--color-accent', trend: null },
        { label: 'Deals', value: 0, icon: Briefcase, color: '--color-success', trend: null },
        { label: 'Revenue', value: 0, icon: DollarSign, color: '--color-success', trend: null },
        { label: 'Organizations', value: 0, icon: Building2, color: '--color-warning', trend: null },
        { label: 'Tasks', value: 0, icon: CheckSquare, color: '--color-accent', trend: null },
      ];
    }

    return [
      { label: 'Leads', value: summary.leads_total || 0, icon: Users, color: '--color-accent', trend: getTrend(summary, 'leads') },
      { label: 'Deals', value: summary.deals_total || 0, icon: Briefcase, color: '--color-success', trend: getTrend(summary, 'deals') },
      { label: 'Revenue', value: summary.revenue_total || 0, icon: DollarSign, color: '--color-success', trend: getTrend(summary, 'revenue') },
      { label: 'Organizations', value: summary.organizations_total || 0, icon: Building2, color: '--color-warning', trend: getTrend(summary, 'organizations') },
      { label: 'Tasks', value: summary.tasks_total || 0, icon: CheckSquare, color: '--color-accent', trend: getTrend(summary, 'tasks') },
    ];
  }, [summary]);

  const aiSummaryLines = useMemo(() => formatAiSummaryLines(aiSummary?.content), [aiSummary?.content]);

  const activityChartData = useMemo(() => {
    const series = activity?.series || [];
    return series.map((point) => ({
      date: formatDateLabel(point.day),
      leads: point.leads || 0,
      deals: point.deals || 0,
      tasks: point.tasks || 0,
      notes: point.notes || 0,
    }));
  }, [activity?.series]);

  const activityXAxisTicks = useMemo(
    () => pickChartTicks(activityChartData, selectedDays),
    [activityChartData, selectedDays]
  );

  const pipelineData = useMemo(() => {
    const stages = summary?.pipeline || [];
    return stages.map((stage) => ({
      stage: stage.stage,
      count: stage.count || 0,
      value: stage.value_total || 0,
    }));
  }, [summary?.pipeline]);

  const leadsByStatus = summary?.leads_by_status || [];
  const donutData = useMemo(() => {
    const statuses = summary?.leads_by_status || [];
    if (!statuses.length) return [{ name: 'No data', value: 1 }];
    return statuses.map((stat) => ({
      name: stat.status,
      value: stat.count,
    }));
  }, [summary?.leads_by_status]);

  const donutColors = [chartColors.accent, chartColors.success, chartColors.warning, chartColors.muted, chartColors.danger];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: chartColors.tooltipBg,
        border: `1px solid ${chartColors.tooltipBorder}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 'var(--text-sm)',
        color: chartColors.tooltipText,
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
            <span style={{ color: chartColors.text }}>{p.name}: {p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <PageTransition>
        <SkeletonDashboard />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Welcome back. Here's your overview.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Time Range Selector */}
            <div style={{ position: 'relative' }}>
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

        {error && (
          <div style={{
            padding: 12,
            background: 'var(--color-danger-subtle)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-danger)',
          }}>
            {error}
          </div>
        )}

        <>
            {/* KPI CARDS */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}
            >
              {topStats.map((stat) => (
                <KpiCard key={stat.label} {...stat} />
              ))}
            </motion.div>

            {aiSummary && (
              <div className="card card-padding note-border-purple" style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <h2 className="section-title">Daily AI Summary</h2>
                  <span className="badge badge-purple">AI Generated</span>
                </div>
                <div style={{ display: 'grid', gap: 8, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                  {aiSummaryLines.map((line, index) => (
                    <div key={`${line}-${index}`} style={{ display: 'grid', gridTemplateColumns: '8px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c026d3', marginTop: 9 }} />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CHARTS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
              {/* Activity Trend */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="card card-padding"
              >
                <h3 className="section-title" style={{ marginBottom: 16 }}>Activity Trend</h3>
                {activityChartData.length === 0 ? (
                  <div style={{
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-tertiary)',
                    fontSize: 'var(--text-sm)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--color-bg-hover)',
                  }}>
                    No activity data for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={activityChartData}>
                      <defs>
                        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartColors.accent} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="areaFill2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartColors.success} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={chartColors.success} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        ticks={activityXAxisTicks}
                        interval={0}
                        minTickGap={18}
                        tickMargin={8}
                        stroke={chartColors.text}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="leads" name="Leads" stroke={chartColors.accent} fill="url(#areaFill)" strokeWidth={2} />
                      <Area type="monotone" dataKey="deals" name="Deals" stroke={chartColors.success} fill="url(#areaFill2)" strokeWidth={2} />
                      <Area type="monotone" dataKey="tasks" name="Tasks" stroke={chartColors.warning} fill="none" strokeWidth={2} />
                      <Area type="monotone" dataKey="notes" name="Notes" stroke={chartColors.muted} fill="none" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* Leads by Status Donut */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="card card-padding"
              >
                <h3 className="section-title" style={{ marginBottom: 16 }}>Leads by Status</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      dataKey="value"
                      paddingAngle={3}
                      stroke="none"
                    >
                      {donutData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                  {donutData.map((item, idx) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: donutColors[idx % donutColors.length] }} />
                      <span style={{ textTransform: 'capitalize' }}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* PIPELINE BAR CHART */}
            {pipelineData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35 }}
                className="card card-padding"
              >
                <h3 className="section-title" style={{ marginBottom: 16 }}>Pipeline Overview</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={pipelineData} layout="vertical">
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="stage" stroke={chartColors.text} fontSize={12} width={90} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Deals" fill={chartColors.accent} radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* FUNNEL CONVERSION */}
            {leadsByStatus.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="card card-padding"
              >
                <h3 className="section-title" style={{ marginBottom: 16 }}>Funnel Conversion</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {leadsByStatus.map((stat) => {
                    const maxCount = Math.max(...leadsByStatus.map(s => s.count), 1);
                    const pct = (stat.count / maxCount) * 100;
                    return (
                      <div key={stat.status} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          width: 80,
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-secondary)',
                          textTransform: 'capitalize',
                        }}>
                          {stat.status}
                        </span>
                        <div style={{
                          flex: 1,
                          height: 24,
                          background: 'var(--color-bg-hover)',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                        }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
                            style={{
                              height: '100%',
                              background: 'var(--color-accent)',
                              borderRadius: 'var(--radius-sm)',
                              opacity: 0.7,
                            }}
                          />
                        </div>
                        <span style={{
                          width: 36,
                          textAlign: 'right',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 'var(--weight-semibold)',
                          color: 'var(--color-text-primary)',
                        }}>
                          {stat.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
        </>
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

export default Dashboard;
