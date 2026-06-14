import React from 'react';
import { PageTransition } from './PageTransition';

export const PageLoader = ({
  title = 'Loading details',
  message = 'Fetching the latest CRM context.',
  minHeight = '58vh',
}) => (
  <PageTransition>
    <div style={{ minHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="lead-detail-loader-card" role="status" aria-live="polite">
        <div className="lead-detail-loader-visual" aria-hidden="true">
          <div className="lead-detail-loader-ring" />
          <div className="lead-detail-loader-avatar">
            <img src="/brand/autocrm-mark.svg" alt="" />
          </div>
          <div className="lead-detail-loader-orbit orbit-one" />
          <div className="lead-detail-loader-orbit orbit-two" />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
            {title}
          </div>
          <div style={{ marginTop: 5, fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', lineHeight: 1.45 }}>
            {message}
          </div>
        </div>

        <div className="lead-detail-loader-steps" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="lead-detail-loader-progress" aria-hidden="true"><span /></div>
      </div>
    </div>
  </PageTransition>
);
