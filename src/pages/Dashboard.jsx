import React, { useState } from 'react';
import { Calendar, RefreshCcw, ChevronDown } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('Last 7 Days');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [userDropdown, setUserDropdown] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const topStats = [
    { label: 'Leads', value: '42' },
    { label: 'Deals', value: '12' },
    { label: 'Won', value: '5' },
    { label: 'Avg Value', value: 'Rs 15k' },
    { label: 'Forecast', value: 'Rs 50k' },
  ];

  const salesTrendData = {
    labels: ['25 Jan', '26 Jan', '27 Jan', '28 Jan', '29 Jan'],
    datasets: [
      { label: 'Leads', data: [10, 15, 8, 20, 12], borderColor: '#000', backgroundColor: 'rgba(0,0,0,0.06)', tension: 0.4, fill: true },
      { label: 'Deals', data: [2, 5, 3, 7, 4], borderColor: '#6b7280', backgroundColor: 'rgba(107,114,128,0.08)', tension: 0.4, fill: true },
    ]
  };

  const revenueData = {
    labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5'],
    datasets: [
      { label: 'Actual', data: [12000, 19000, 15000, 25000, 22000], backgroundColor: '#000', borderRadius: 6 },
      { label: 'Forecast', data: [15000, 22000, 18000, 28000, 25000], backgroundColor: '#e5e7eb', borderRadius: 6 }
    ]
  };

  const pipelineData = {
    labels: ['New', 'Qualified', 'Proposal', 'Negotiation'],
    datasets: [{ label: 'Deals', data: [14, 9, 6, 3], backgroundColor: '#000', borderRadius: 6 }]
  };

  const activityDonutData = {
    labels: ['Calls', 'Emails', 'Meetings', 'Follow-ups'],
    datasets: [{ data: [12, 19, 7, 10], backgroundColor: ['#000', '#404040', '#808080', '#e5e7eb'], borderWidth: 0 }]
  };

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
          <h3 className="text-sm font-semibold text-black mb-2">Forecasted Revenue</h3>
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
            {['Leads', 'Opportunities', 'Won Deals'].map(step => (
              <div key={step} className="bg-gray-100 h-7 rounded-md flex items-center px-3 text-xs text-gray-700">{step}</div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-black mb-2">Leads by Source</h3>
          <div className="h-[160px]">
            <Doughnut
              data={{
                labels: ['LinkedIn', 'Organic', 'Social'],
                datasets: [{ data: [15, 8, 5], backgroundColor: ['#000', '#6b7280', '#e5e7eb'], borderWidth: 0 }]
              }}
              options={{ ...commonOptions, cutout: '75%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
