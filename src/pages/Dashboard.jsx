import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, RefreshCcw, ChevronDown } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { apiFetch } from '../api/client';

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
  } catch (error) {
    return `USD ${numeric.toLocaleString()}`;
  }
};

const formatDateLabel = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('Last 7 Days');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [userDropdown, setUserDropdown] = useState(false);
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      const [summaryResult, activityResult] = await Promise.allSettled([
        apiFetch('/api/dashboard/summary', {}, { timeoutMs: DASHBOARD_TIMEOUT_MS }),
        apiFetch(`/api/dashboard/activity?days=${selectedDays}`, {}, { timeoutMs: DASHBOARD_TIMEOUT_MS }),
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
        { label: 'Leads', value: '-' },
        { label: 'Deals', value: '-' },
        { label: 'Organizations', value: '-' },
        { label: 'Tasks', value: '-' },
        { label: 'Revenue', value: '-' },
      ];
    }

    return [
      { label: 'Leads', value: summary.leads_total },
      { label: 'Deals', value: summary.deals_total },
      { label: 'Organizations', value: summary.organizations_total },
      { label: 'Tasks', value: summary.tasks_total },
      { label: 'Revenue', value: formatCurrency(summary.revenue_total) },
    ];
  }, [summary]);

  const activitySeries = activity?.series || [];
  const salesTrendData = useMemo(() => ({
    labels: activitySeries.map((point) => formatDateLabel(point.day)),
    datasets: [
      { label: 'Leads', data: activitySeries.map((point) => point.leads), borderColor: '#000', backgroundColor: 'rgba(0,0,0,0.06)', tension: 0.4, fill: true },
      { label: 'Deals', data: activitySeries.map((point) => point.deals), borderColor: '#6b7280', backgroundColor: 'rgba(107,114,128,0.08)', tension: 0.4, fill: true },
    ]
  }), [activitySeries]);

  const pipelineStages = summary?.pipeline || [];
  const revenueData = useMemo(() => ({
    labels: pipelineStages.map((stage) => stage.stage),
    datasets: [
      { label: 'Pipeline Value', data: pipelineStages.map((stage) => stage.value_total || 0), backgroundColor: '#000', borderRadius: 6 }
    ]
  }), [pipelineStages]);

  const pipelineData = useMemo(() => ({
    labels: pipelineStages.map((stage) => stage.stage),
    datasets: [{ label: 'Deals', data: pipelineStages.map((stage) => stage.count || 0), backgroundColor: '#000', borderRadius: 6 }]
  }), [pipelineStages]);

  const activityDonutData = useMemo(() => ({
    labels: ['Leads', 'Deals', 'Tasks', 'Notes'],
    datasets: [{
      data: [summary?.leads_total || 0, summary?.deals_total || 0, summary?.tasks_total || 0, summary?.notes_total || 0],
      backgroundColor: ['#000', '#404040', '#808080', '#e5e7eb'],
      borderWidth: 0
    }]
  }), [summary]);

  const leadsByStatus = summary?.leads_by_status || [];

  const leadsByStatusDonutData = useMemo(() => {
    const labels = leadsByStatus.map((stat) => stat.status);
    const data = leadsByStatus.map((stat) => stat.count);
    const palette = ['#000', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'];

    return {
      labels: labels.length ? labels : ['No data'],
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: labels.length ? palette.slice(0, labels.length) : ['#e5e7eb'],
        borderWidth: 0,
      }]
    };
  }, [leadsByStatus]);

  const commonOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6, font: { size: 10 }, color: '#111' } } }
  };

  const crmRoles = ['Admin', 'Sales Manager', 'Sales Representative'];

  return (
    <div className="min-h-screen p-6 bg-gray-50 font-sans text-sm space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-black tracking-tight">Dashboard</h1>

        <div className="flex items-center gap-3">
{/* HEADER BUTTONS */}
<div className="flex items-center gap-3">

  {/* Logged in as Button (first) */}
  <div className="relative">
    <button
      onClick={() => setUserDropdown(!userDropdown)}
      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-100 transition"
    >
      Logged in as Admin <ChevronDown size={14} />
    </button>
    {userDropdown && (
      <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-50">
        {crmRoles.map(role => (
          <div
            key={role}
            className="px-3 py-2 text-xs hover:bg-gray-100 cursor-pointer"
            onClick={() => { alert(`Switched to ${role}`); setUserDropdown(false); }}
          >
            {role}
          </div>
        ))}
      </div>
    )}
  </div>

  {/* Last Days / Calendar Button (second) */}
  <div className="relative">
    <button
      onClick={() => setActiveDropdown(activeDropdown === 'time' ? null : 'time')}
      className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition"
    >
      <Calendar size={14}/> {timeRange} <ChevronDown size={14}/>
    </button>
    {activeDropdown === 'time' && (
      <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-50">
        {['Last 7 Days', 'Last 30 Days', 'Last 90 Days'].map(t => (
          <button key={t} onClick={() => { setTimeRange(t); setActiveDropdown(null); }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100">
            {t}
          </button>
        ))}
      </div>
    )}
  </div>

  {/* Refresh Button (third) */}
  <button
    onClick={handleRefresh}
    className={`p-2 rounded-lg transition ${isRefreshing ? 'animate-spin text-black' : 'text-gray-500 hover:bg-gray-100'}`}
  >
    <RefreshCcw size={16} />
  </button>

</div>

        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-xs text-gray-500">Loading dashboard metrics...</div>
      )}

      {/* TOP STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {topStats.map((stat, i) => (
          <div key={i} className="bg-white border border-gray-200 shadow-sm rounded-xl p-3 hover:shadow-md transition">
            <p className="text-gray-400 text-[10px] uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-lg font-semibold text-black">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-black mb-2">Sales Trend</h3>
          <div className="h-[180px]"><Line data={salesTrendData} options={commonOptions} /></div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-black mb-2">Pipeline Value by Stage</h3>
          <div className="h-[180px]"><Bar data={revenueData} options={commonOptions} /></div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-black mb-2">Deals Pipeline</h3>
          <div className="h-[180px]"><Bar data={pipelineData} options={commonOptions} /></div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-black mb-2">Activity Distribution</h3>
          <div className="h-[180px] flex items-center justify-center">
            <Doughnut data={activityDonutData} options={{ ...commonOptions, cutout: '70%' }} />
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-black mb-2">Funnel Conversion</h3>
          <div className="space-y-2">
            {leadsByStatus.length ? (
              leadsByStatus.map((stat) => (
                <div key={stat.status} className="bg-gray-100 h-7 rounded-md flex items-center justify-between px-3 text-xs text-gray-700">
                  <span className="capitalize">{stat.status}</span>
                  <span className="text-gray-500">{stat.count}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400">No funnel data</div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-black mb-2">Leads by Status</h3>
          <div className="h-[160px]">
            <Doughnut
              data={leadsByStatusDonutData}
              options={{ ...commonOptions, cutout: '75%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
