import React from 'react';
import {
  ShieldCheck,
  Activity,
  Users,
  FileSpreadsheet,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

const AdminDashboard = () => {
  const highlights = [
    {
      label: 'Active Operators',
      value: '42',
      meta: '12 in onboarding flow',
      icon: <Users size={18} />,
    },
    {
      label: 'Permissions Changed',
      value: '18',
      meta: 'Last 24 hours',
      icon: <ShieldCheck size={18} />,
    },
    {
      label: 'Data Imports',
      value: '6',
      meta: '2 awaiting review',
      icon: <FileSpreadsheet size={18} />,
    },
  ];

  const coverage = [
    { label: 'Leads', percent: 86 },
    { label: 'Deals', percent: 74 },
    { label: 'Contacts', percent: 91 },
    { label: 'Tasks', percent: 68 },
  ];

  const watchlist = [
    {
      title: 'Dormant accounts',
      value: '5 users',
      note: 'No activity in 30 days',
    },
    {
      title: 'Elevated access',
      value: '3 admins',
      note: 'Review quarterly',
    },
    {
      title: 'Data queue',
      value: '2 imports',
      note: 'Pending validation',
    },
  ];

  const queues = [
    {
      title: 'Access requests',
      status: '2 awaiting approval',
      age: 'Updated 1h ago',
    },
    {
      title: 'CRM sync',
      status: 'Healthy',
      age: 'Last check 6m ago',
    },
    {
      title: 'Import validations',
      status: '1 blocked row',
      age: 'Review needed',
    },
  ];

  const activity = [
    'Ayesha granted Deals access to Ahmed',
    '3 new leads imported from Q2 events CSV',
    'System defaults updated for currency rules',
    'Upcoming SLA review scheduled for Friday',
  ];

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
            <button className="admin-pill">Run access audit</button>
            <button className="admin-pill admin-pill-accent">
              Open import queue
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item, index) => (
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
                {item.icon}
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
              Permissions active this week
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {coverage.map((item) => (
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
          </div>
        </div>

        <div className="admin-panel p-6">
          <div className="flex items-center gap-2 text-sm text-[color:var(--admin-muted)]">
            <Activity size={16} />
            Risk watchlist
          </div>
          <div className="mt-4 space-y-4">
            {watchlist.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[color:var(--admin-accent-2)]/10 text-[color:var(--admin-accent-2)] flex items-center justify-center">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-[color:var(--admin-muted)]">
                    {item.value} · {item.note}
                  </p>
                </div>
              </div>
            ))}
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
            {queues.map((item) => (
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
            {activity.map((entry, index) => (
              <div
                key={entry}
                className="flex items-start gap-3 text-sm"
              >
                <div className="h-8 w-8 rounded-xl bg-[color:var(--admin-ink)]/10 flex items-center justify-center text-[color:var(--admin-ink)]">
                  {index + 1}
                </div>
                <div>
                  <p>{entry}</p>
                  <p className="text-xs text-[color:var(--admin-muted)]">
                    Just now
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
