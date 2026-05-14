import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, Clock, FileSpreadsheet, Loader2, ShieldCheck, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getAdminOverview } from './adminApi';
import { PageTransition, staggerContainer, staggerItem } from '../components/PageTransition';
import { CountUp } from '../components/CountUp';

const ICON_BY_LABEL = {
  'Active Operators': Users,
  'Permissions Changed': ShieldCheck,
  'Data Imports': FileSpreadsheet,
};

const getErrorMessage = (error, fallback) => error?.message || error?.data?.detail || fallback;
const EMPTY = { highlights: [], coverage: [], watchlist: [], queues: [], activity: [] };

const AdminDashboard = () => {
  const navigate = useNavigate();
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
          watchlist: Array.isArray(data?.watchlist) ? data.watchlist : [],
          queues: Array.isArray(data?.queues) ? data.queues : [],
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

        {/* Hero header */}
        <motion.div className="card" style={{ padding: '28px 32px' }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Mission Control</div>
              <h1 className="page-title">Live governance radar</h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 6, maxWidth: 500 }}>
                Track how access, data, and workflows are evolving without relying on the sales dashboard visuals.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => navigate('/admin/permissions')}>Run access audit</button>
              <button className="btn btn-primary" onClick={() => navigate('/admin/imports')}>Open import queue</button>
            </div>
          </div>
        </motion.div>

        {error && <div style={{ padding: 12, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>{error}</div>}

        {loading ? (
          <div className="card card-padding" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            <Loader2 size={16} className="animate-spin" /> Loading overview...
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <motion.div variants={staggerContainer} initial="initial" animate="animate" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {overview.highlights.map((item, i) => {
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
                      <CountUp value={typeof item.value === 'number' ? item.value : 0} />
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

            {/* Coverage + Watchlist */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div className="card card-padding">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="section-title">Access coverage</h3>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Relative module activity</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {overview.coverage.map(item => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: 6 }}>
                        <span>{item.label}</span>
                        <span style={{ color: 'var(--color-text-tertiary)' }}>{item.percent}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-hover)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percent}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: 999, background: 'var(--color-accent)' }}
                        />
                      </div>
                    </div>
                  ))}
                  {overview.coverage.length === 0 && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>No coverage metrics yet.</p>}
                </div>
              </div>

              <div className="card card-padding">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                  <Activity size={16} /> Risk watchlist
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {overview.watchlist.map(item => (
                    <div key={item.title} style={{ display: 'flex', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius)', background: 'var(--color-danger-subtle)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ShieldCheck size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{item.title}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{item.value} – {item.note}</div>
                      </div>
                    </div>
                  ))}
                  {overview.watchlist.length === 0 && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>No alerts.</p>}
                </div>
              </div>
            </div>

            {/* Queues + Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card card-padding">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 className="section-title">Operations queue</h3>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-accent)' }}>View all <ArrowUpRight size={12} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {overview.queues.map(item => (
                    <div key={item.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{item.title}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{item.status}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        <Clock size={12} /> {item.age}
                      </div>
                    </div>
                  ))}
                  {overview.queues.length === 0 && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>Queue is empty.</p>}
                </div>
              </div>

              <div className="card card-padding">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 className="section-title">Recent admin activity</h3>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Activity log</span>
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
