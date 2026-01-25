import React, { useState } from 'react';
import { 
  Plus, Calendar, RefreshCcw, Layout, X, 
  ChevronDown, BarChart, PieChart, TrendingUp, Activity
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, 
  PointElement, LineElement, Title, Tooltip, Legend, ArcElement 
} from 'chart.js';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  // --- STATES ---
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [timeRange, setTimeRange] = useState('Last 7 Days');
  const [isAddChartOpen, setIsAddChartOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const [widgets, setWidgets] = useState([
    { id: 1, type: 'line', title: 'Sales trend', subtitle: 'Daily performance of leads, deals, and wins' },
    { id: 2, type: 'bar', title: 'Forecasted revenue', subtitle: 'Projected vs actual revenue based on deal probability' }
  ]);

  // --- FUNCTIONS ---
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setActiveDropdown(null);
    }, 1000);
  };

  const addNewChart = (type, title) => {
    setWidgets([...widgets, { id: Date.now(), type, title, subtitle: 'Real-time analysis updated just now' }]);
    setIsAddChartOpen(false);
  };

  const removeWidget = (id) => setWidgets(widgets.filter(w => w.id !== id));

  // --- CHART DATA CONFIGS ---
  const salesTrendData = {
    labels: ['25 Jan', '26 Jan', '27 Jan', '28 Jan', '29 Jan'],
    datasets: [
      { label: 'Leads', data: [10, 15, 8, 20, 12], borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)', tension: 0.4, fill: true },
      { label: 'Deals', data: [2, 5, 3, 7, 4], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, fill: true },
    ]
  };

  const revenueData = {
    labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5'],
    datasets: [
      { label: 'Actual', data: [12000, 19000, 15000, 25000, 22000], backgroundColor: '#4F46E5', borderRadius: 6, barThickness: 20 },
      { label: 'Forecast', data: [15000, 22000, 18000, 28000, 25000], backgroundColor: '#A5B4FC', borderRadius: 6, barThickness: 20 }
    ]
  };

  const commonOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6, font: { size: 10, weight: '600' } } } }
  };

  const topStats = [
    { label: 'Total leads', value: isRefreshing ? '...' : '42', change: '-16%' },
    { label: 'Ongoing deals', value: '12' },
    { label: 'Won deals', value: '5' },
    { label: 'Avg. deal value', value: 'Rs 15k' },
    { label: 'Forecasted revenue', value: 'Rs 50k' },
  ];

  return (
    /* Fix: h-screen aur overflow-hidden taake sirf content scroll ho */
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      
      {/* 1. SOLID STICKY ACTION BAR */}
      <header className="z-[100] bg-white border-b border-gray-200 px-8 py-5 shadow-sm">
        <div className="flex justify-between items-center max-w-[1600px] mx-auto">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Dashboard</h1>
            <div className="relative">
              <button onClick={() => setActiveDropdown(activeDropdown === 'time' ? null : 'time')} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600 transition-all">
                <Calendar size={14} /> {timeRange} <ChevronDown size={14} />
              </button>
              {activeDropdown === 'time' && (
                <div className="absolute top-10 left-0 w-48 bg-white border border-gray-100 shadow-xl rounded-xl py-1 z-[110] animate-in slide-in-from-top-1">
                  {['Last 7 Days', 'Last 30 Days', 'Last 90 Days'].map(t => (
                    <button key={t} onClick={() => {setTimeRange(t); setActiveDropdown(null)}} className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-slate-600 text-xs font-medium">{t}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className={`p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-all ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`}>
              <RefreshCcw size={18} />
            </button>
            <button onClick={() => setIsEditMode(!isEditMode)} className={`p-2 rounded-lg transition-colors ${isEditMode ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}>
              <Layout size={18} />
            </button>
            <button onClick={() => setIsAddChartOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-black active:scale-95 transition-all">
              <Plus size={16} /> Chart
            </button>
          </div>
        </div>
      </header>

      {/* 2. SCROLLABLE MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className={`max-w-[1600px] mx-auto space-y-8 transition-opacity duration-300 ${isRefreshing ? 'opacity-30' : 'opacity-100'}`}>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {topStats.map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-indigo-200">
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1.5">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{stat.value}</h3>
                  {stat.change && <span className="text-rose-500 text-[10px] font-bold">{stat.change} ↑</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Dynamic Widgets Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {widgets.map((widget) => (
              <div key={widget.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative group transition-all">
                {isEditMode && (
                  <button onClick={() => removeWidget(widget.id)} className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:scale-110 transition-all z-10">
                    <X size={14} />
                  </button>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-slate-800 tracking-tight text-left">{widget.title}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase text-left tracking-wider">{widget.subtitle}</p>
                </div>
                <div className="h-[250px]">
                  {widget.type === 'line' ? <Line data={salesTrendData} options={commonOptions} /> : 
                   widget.type === 'bar' ? <Bar data={revenueData} options={commonOptions} /> :
                   widget.type === 'pie' ? <Pie data={salesTrendData} options={commonOptions} /> :
                   <Doughnut data={salesTrendData} options={{...commonOptions, cutout: '75%'}} />}
                </div>
              </div>
            ))}
          </div>

          {/* Static Analysis Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
            {/* Funnel */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 text-sm">Funnel conversion</h3>
              <div className="space-y-4">
                 {['Leads', 'Opportunities', 'Won Deals'].map((step, i) => (
                   <div key={step} className="relative h-12 bg-slate-50 rounded-xl flex items-center px-4 border border-slate-100 overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 bg-indigo-50" style={{width: `${100 - (i*35)}%`}}></div>
                      <span className="relative text-xs font-bold text-slate-600">{step}</span>
                      <span className="relative ml-auto font-black text-slate-400">{(100 - (i*35))}</span>
                   </div>
                 ))}
              </div>
            </div>
            {/* Source */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm lg:col-span-2">
              <h3 className="font-bold text-slate-800 mb-6 text-sm">Leads by source</h3>
              <div className="h-[220px]">
                 <Doughnut data={{
                   labels: ['LinkedIn', 'Organic', 'Social'],
                   datasets: [{ data: [15, 8, 5], backgroundColor: ['#6366F1', '#10B981', '#F59E0B'], borderWidth: 0 }]
                 }} options={{...commonOptions, cutout: '80%'}} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. ADD CHART MODAL */}
      {isAddChartOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Add widget</h3>
              <X className="cursor-pointer text-slate-300 hover:text-rose-500 transition-colors" onClick={() => setIsAddChartOpen(false)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <button onClick={() => addNewChart('bar', 'Revenue Report')} className="flex flex-col items-center gap-3 p-4 border border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl transition-all group">
                 <BarChart className="text-indigo-600" /> <span className="font-bold text-[10px] uppercase">Bar Chart</span>
               </button>
               <button onClick={() => addNewChart('line', 'User Growth')} className="flex flex-col items-center gap-3 p-4 border border-slate-100 hover:border-purple-400 hover:bg-purple-50 rounded-xl transition-all group">
                 <TrendingUp className="text-purple-600" /> <span className="font-bold text-[10px] uppercase">Line Chart</span>
               </button>
               <button onClick={() => addNewChart('pie', 'Market Share')} className="flex flex-col items-center gap-3 p-4 border border-slate-100 hover:border-orange-400 hover:bg-orange-50 rounded-xl transition-all group">
                 <Activity className="text-orange-600" /> <span className="font-bold text-[10px] uppercase">Pie Chart</span>
               </button>
               <button onClick={() => addNewChart('donut', 'Sales Source')} className="flex flex-col items-center gap-3 p-4 border border-gray-100 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl transition-all group">
                 <PieChart className="text-indigo-600" /> <span className="font-bold text-[10px] uppercase">Donut Chart</span>
               </button>
            </div>
            <button onClick={() => setIsAddChartOpen(false)} className="w-full mt-6 py-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;