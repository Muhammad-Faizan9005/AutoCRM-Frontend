export function SkeletonBlock({ width = '100%', height = '16px', className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <SkeletonBlock width="40%" height="12px" />
      <SkeletonBlock width="60%" height="28px" />
      <SkeletonBlock width="30%" height="14px" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '12px', padding: '12px 14px' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={`h-${i}`} width="80%" height="10px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '12px', padding: '10px 14px' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBlock key={`c-${r}-${c}`} width={`${60 + Math.random() * 30}%`} height="14px" />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonHeaderCard({ padding = '24px 28px', titleWidth = '220px', withButton = true }) {
  return (
    <div className="card" style={{ padding }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonBlock width="110px" height="10px" />
          <SkeletonBlock width={titleWidth} height="30px" />
          <SkeletonBlock width="420px" height="13px" />
        </div>
        {withButton && <SkeletonBlock width="120px" height="38px" />}
      </div>
    </div>
  );
}

function SkeletonMetricCard() {
  return (
    <div className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <SkeletonBlock width="90px" height="11px" />
        <SkeletonBlock width="36px" height="36px" className="skeleton-round" />
      </div>
      <SkeletonBlock width="50px" height="34px" />
    </div>
  );
}

export function SkeletonAIControlCenter() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SkeletonHeaderCard padding="24px 28px" titleWidth="280px" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        {[1, 2, 3, 4].map((i) => <SkeletonMetricCard key={i} />)}
      </div>
      <section className="card card-padding">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SkeletonBlock width="120px" height="16px" />
          <SkeletonBlock width="70px" height="22px" />
        </div>
        <SkeletonTable rows={5} cols={6} />
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(420px, 1.4fr)', gap: 14 }}>
        <section className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonBlock width="110px" height="16px" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <SkeletonBlock width="40%" height="13px" />
                <SkeletonBlock width="60px" height="18px" />
              </div>
              <SkeletonBlock width="70%" height="10px" />
            </div>
          ))}
        </section>
        <section className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SkeletonBlock width="130px" height="16px" />
          <SkeletonBlock width="100%" height="80px" />
          <SkeletonBlock width="90%" height="14px" />
          <SkeletonBlock width="100%" height="120px" />
        </section>
      </div>
    </div>
  );
}

export function SkeletonAdminUsers() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SkeletonHeaderCard padding="24px 28px" titleWidth="240px" />
      <div className="card card-padding">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SkeletonBlock width="36px" height="36px" className="skeleton-round" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SkeletonBlock width="120px" height="13px" />
              <SkeletonBlock width="160px" height="10px" />
            </div>
          </div>
          <SkeletonBlock width="280px" height="34px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '14px 18px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <SkeletonBlock width="40px" height="40px" className="skeleton-round" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SkeletonBlock width="140px" height="13px" />
                  <SkeletonBlock width="180px" height="10px" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <SkeletonBlock width="120px" height="32px" />
                <SkeletonBlock width="120px" height="32px" />
                <SkeletonBlock width="110px" height="32px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonAdminTeams() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SkeletonHeaderCard padding="28px 32px" titleWidth="200px" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[1, 2, 3].map((i) => <SkeletonMetricCard key={i} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="card card-padding" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <SkeletonBlock width="44px" height="44px" className="skeleton-round" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SkeletonBlock width="180px" height="15px" />
                <SkeletonBlock width="120px" height="11px" />
              </div>
            </div>
            <SkeletonBlock width="90px" height="32px" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonLeadDetail() {
  return (
    <div className="deal-detail-page" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="deal-detail-hero">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonBlock width="82px" height="28px" />
          <SkeletonBlock width="120px" height="10px" />
          <SkeletonBlock width="250px" height="34px" />
          <SkeletonBlock width="460px" height="13px" />
        </div>
        <div className="deal-detail-actions">
          <SkeletonBlock width="74px" height="32px" />
          <SkeletonBlock width="98px" height="32px" />
          <SkeletonBlock width="96px" height="32px" />
        </div>
      </div>

      <div className="deal-detail-grid">
        <div className="deal-detail-main">
          <section className="deal-detail-metrics">
            <div className="deal-detail-metric lead-score-metric">
              <div className="lead-score-metric-head">
                <SkeletonBlock width="62px" height="10px" />
                <SkeletonBlock width="28px" height="28px" />
              </div>
              <SkeletonBlock width="92px" height="22px" />
              <SkeletonBlock width="92%" height="10px" />
              <SkeletonBlock width="78%" height="10px" />
            </div>
            {[1, 2, 3].map((item) => (
              <div className="deal-detail-metric" key={item}>
                <SkeletonBlock width="82px" height="10px" />
                <SkeletonBlock width="125px" height="22px" />
              </div>
            ))}
          </section>

          <section className="ai-insights-panel">
            <div className="ai-insights-header">
              <div className="ai-insights-heading">
                <SkeletonBlock width="32px" height="32px" />
                <div style={{ display: 'grid', gap: 6 }}>
                  <SkeletonBlock width="110px" height="10px" />
                  <SkeletonBlock width="210px" height="20px" />
                </div>
              </div>
              <div className="ai-insights-header-actions">
                <SkeletonBlock width="58px" height="20px" />
                <SkeletonBlock width="30px" height="30px" />
              </div>
            </div>
            <div className="ai-insight-card">
              <SkeletonBlock width="32px" height="32px" />
              <div style={{ display: 'grid', gap: 8 }}>
                <SkeletonBlock width="140px" height="10px" />
                <SkeletonBlock width="230px" height="18px" />
                <SkeletonBlock width="90%" height="12px" />
              </div>
            </div>
          </section>

          <div className="tab-row">
            {[70, 62, 58, 58, 58, 92].map((width, index) => (
              <SkeletonBlock key={index} width={`${width}px`} height="30px" />
            ))}
          </div>

          <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            {[1, 2, 3, 4].map((item) => (
              <div className="activity-item" key={item}>
                <SkeletonBlock width="28px" height="28px" />
                <div style={{ display: 'grid', gap: 7 }}>
                  <SkeletonBlock width="220px" height="13px" />
                  <SkeletonBlock width="70%" height="11px" />
                </div>
                <SkeletonBlock width="70px" height="10px" />
              </div>
            ))}
          </div>
        </div>

        <div className="deal-detail-sidebar">
          {[1, 2, 3].map((card) => (
            <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }} key={card}>
              <SkeletonBlock width="120px" height="16px" />
              {[1, 2, 3, 4].map((line) => (
                <SkeletonBlock key={line} width={`${64 + line * 7}%`} height="12px" />
              ))}
            </div>
          ))}
          <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <SkeletonBlock width="140px" height="16px" />
            <div className="deal-signal-grid">
              {[1, 2, 3, 4].map((item) => (
                <SkeletonBlock key={item} width="100%" height="34px" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonDealDetail() {
  return (
    <div className="deal-detail-page" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="deal-detail-hero">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonBlock width="86px" height="28px" />
          <SkeletonBlock width="120px" height="10px" />
          <SkeletonBlock width="260px" height="34px" />
          <SkeletonBlock width="420px" height="13px" />
        </div>
        <div className="deal-detail-actions">
          <SkeletonBlock width="90px" height="32px" />
          <SkeletonBlock width="102px" height="32px" />
          <SkeletonBlock width="96px" height="32px" />
        </div>
      </div>

      <div className="deal-detail-grid">
        <div className="deal-detail-main">
          <section className="deal-detail-metrics">
            {[1, 2, 3, 4].map((item) => (
              <div className="deal-detail-metric" key={item}>
                <SkeletonBlock width="82px" height="10px" />
                <SkeletonBlock width="120px" height="22px" />
              </div>
            ))}
          </section>

          <section className="ai-insights-panel">
            <div className="ai-insights-header">
              <div className="ai-insights-heading">
                <SkeletonBlock width="32px" height="32px" />
                <div style={{ display: 'grid', gap: 6 }}>
                  <SkeletonBlock width="120px" height="10px" />
                  <SkeletonBlock width="180px" height="20px" />
                </div>
              </div>
              <SkeletonBlock width="58px" height="20px" />
            </div>
            {[1, 2].map((item) => (
              <div className="ai-insight-card" key={item}>
                <SkeletonBlock width="32px" height="32px" />
                <div style={{ display: 'grid', gap: 8 }}>
                  <SkeletonBlock width="140px" height="10px" />
                  <SkeletonBlock width="210px" height="18px" />
                  <SkeletonBlock width="90%" height="12px" />
                </div>
              </div>
            ))}
          </section>

          <div className="tab-row">
            {[70, 60, 76, 58, 58, 92].map((width, index) => (
              <SkeletonBlock key={index} width={`${width}px`} height="30px" />
            ))}
          </div>

          <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            {[1, 2, 3, 4].map((item) => (
              <div className="activity-item" key={item}>
                <SkeletonBlock width="28px" height="28px" />
                <div style={{ display: 'grid', gap: 7 }}>
                  <SkeletonBlock width="220px" height="13px" />
                  <SkeletonBlock width="70%" height="11px" />
                </div>
                <SkeletonBlock width="70px" height="10px" />
              </div>
            ))}
          </div>
        </div>

        <div className="deal-detail-sidebar">
          {[1, 2, 3, 4].map((card) => (
            <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }} key={card}>
              <SkeletonBlock width="120px" height="16px" />
              {[1, 2, 3].map((line) => (
                <SkeletonBlock key={line} width={`${70 + line * 7}%`} height="12px" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonOrganizationDetail() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <SkeletonBlock width="170px" height="32px" />
        <div className="card" style={{ marginTop: 12, padding: '24px 28px', display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <SkeletonBlock width="48px" height="48px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SkeletonBlock width="150px" height="10px" />
              <SkeletonBlock width="280px" height="34px" />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <SkeletonBlock width="86px" height="22px" />
                <SkeletonBlock width="140px" height="22px" />
                <SkeletonBlock width="110px" height="22px" />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            <SkeletonBlock width="150px" height="32px" />
            <SkeletonBlock width="70px" height="12px" />
            <SkeletonBlock width="120px" height="26px" />
            <SkeletonBlock width="130px" height="10px" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((item) => (
          <SkeletonMetricCard key={item} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {['People / Leads', 'Deals', 'Tasks'].map((title, index) => (
            <section className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} key={title}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <SkeletonBlock width={`${120 + index * 18}px`} height="18px" />
                <SkeletonBlock width="64px" height="22px" />
              </div>
              {index === 0 && (
                <div style={{ display: 'grid', gap: 10 }}>
                  {[1, 2, 3].map((item) => (
                    <div className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }} key={item}>
                      <div style={{ display: 'grid', gap: 7 }}>
                        <SkeletonBlock width="160px" height="14px" />
                        <SkeletonBlock width="210px" height="10px" />
                      </div>
                      <SkeletonBlock width="82px" height="22px" />
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {['Notes', 'Calls / Meetings', 'Recent Activity'].map((title) => (
            <section className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} key={title}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <SkeletonBlock width="140px" height="18px" />
                <SkeletonBlock width="64px" height="22px" />
              </div>
              {title === 'Recent Activity' && (
                <div style={{ display: 'grid', gap: 10 }}>
                  {[1, 2, 3].map((item) => (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }} key={item}>
                      <SkeletonBlock width="54px" height="22px" />
                      <div style={{ display: 'grid', gap: 7 }}>
                        <SkeletonBlock width="180px" height="13px" />
                        <SkeletonBlock width="90px" height="10px" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px' }}>
        <div className="card card-padding">
          <SkeletonBlock width="30%" height="14px" />
          <div style={{ marginTop: 16 }}><SkeletonBlock width="100%" height="180px" /></div>
        </div>
        <div className="card card-padding">
          <SkeletonBlock width="30%" height="14px" />
          <div style={{ marginTop: 16 }}><SkeletonBlock width="100%" height="180px" /></div>
        </div>
      </div>
    </div>
  );
}
