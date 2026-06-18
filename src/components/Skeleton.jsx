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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SkeletonBlock width="180px" height="12px" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonBlock width="220px" height="28px" />
            <SkeletonBlock width="260px" height="13px" />
          </div>
          <SkeletonBlock width="90px" height="32px" />
        </div>
        <div className="card card-padding" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonBlock width="110px" height="10px" />
            <SkeletonBlock width="140px" height="22px" />
            <SkeletonBlock width="300px" height="12px" />
          </div>
          <SkeletonBlock width="130px" height="32px" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[60, 70, 65, 80, 72].map((w, i) => <SkeletonBlock key={i} width={`${w}px`} height="30px" />)}
        </div>
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <SkeletonBlock width="28px" height="28px" className="skeleton-round" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SkeletonBlock width="40%" height="13px" />
                <SkeletonBlock width="70%" height="11px" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonBlock width="40px" height="10px" />
          <SkeletonBlock width="120px" height="15px" />
          {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} width="100%" height="12px" />)}
        </div>
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonBlock width="100px" height="14px" />
          {[1, 2, 3].map((i) => <SkeletonBlock key={i} width="100%" height="30px" />)}
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
