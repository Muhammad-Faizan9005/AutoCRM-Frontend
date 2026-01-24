import React from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
const Dashboard = () => {
  const data = [
    { name: 'Mon', leads: 20, revenue: 1200 },
    { name: 'Tue', leads: 35, revenue: 2100 },
    { name: 'Wed', leads: 15, revenue: 800 },
    { name: 'Thu', leads: 45, revenue: 3000 },
    { name: 'Fri', leads: 30, revenue: 2500 },
  ];

  const stats = [
    { title: "Total Leads", count: "1,240", change: "+12%", color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Open Deals", count: "45", change: "+5%", color: "text-orange-500", bg: "bg-orange-50" },
    { title: "Won Deals", count: "32", change: "+18%", color: "text-green-500", bg: "bg-green-50" },
    { title: "Avg. Response", count: "2.4h", change: "-10%", color: "text-purple-500", bg: "bg-purple-50" },
  ];

  return (
    <div className="flex-1 bg-[#fcfdfe] min-h-screen p-6 font-sans">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Performance Overview</h1>
          <p className="text-xs text-gray-500 font-medium">Real-time CRM activity logs.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-all">Export</button>
          <button className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-semibold shadow-md hover:bg-zinc-800 transition-all">Refresh</button>
        </div>
      </div>

      {/* 1. Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((item, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.bg} ${item.color}`}>
                {item.title.split(' ')[0]}
              </div>
              <span className={`text-[10px] font-bold ${item.color}`}>{item.change}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">{item.count}</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">{item.title}</p>
          </div>
        ))}
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Area Chart */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-6">Revenue Growth</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#9ca3af'}} />
                <YAxis hide />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', fontSize: '12px'}} />
                <Area type="monotone" dataKey="revenue" stroke="#000" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-6">Pipeline Efficiency</h3>
          <div className="space-y-5">
            {[
              { stage: 'Qualified', val: 75, color: 'bg-zinc-800' },
              { stage: 'Negotiation', val: 45, color: 'bg-zinc-500' },
              { stage: 'Closure', val: 20, color: 'bg-zinc-300' }
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-[10px] font-bold mb-1 text-gray-500 uppercase">
                  <span>{item.stage}</span>
                  <span className="text-black">{item.val}%</span>
                </div>
                <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                  <div className={`${item.color} h-full transition-all`} style={{ width: `${item.val}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Activity Feed */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
          <h3 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Live Logs</h3>
          <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { msg: 'New lead "Sarah Khan" assigned', time: 'Just now' },
            { msg: 'Deal #827 converted to Won', time: '14m ago' },
          ].map((log, i) => (
            <div key={i} className="p-3 px-5 flex items-center justify-between hover:bg-gray-50">
              <p className="text-[12px] text-gray-600 font-medium">{log.msg}</p>
              <span className="text-[10px] font-bold text-gray-400">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;