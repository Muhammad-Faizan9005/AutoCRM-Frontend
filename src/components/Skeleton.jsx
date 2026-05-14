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
