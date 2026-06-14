import React from 'react';
import { motion } from 'framer-motion';

export const LoadingScreen = ({
  message = 'Preparing your workspace...',
  hint = 'Loading your permissions, modules, and latest CRM context.',
}) => (
  <div className="app-loading-screen" role="status" aria-live="polite">
    <motion.div
      className="app-loading-card"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="app-loading-brand-row">
        <div className="app-loading-logo" aria-hidden="true">
          <img src="/brand/autocrm-mark.svg" alt="" />
        </div>
        <div>
          <div className="app-loading-title">AutoCRM</div>
          <div className="app-loading-subtitle">AI powered CRM workspace</div>
        </div>
      </div>

      <div className="app-loading-orbit" aria-hidden="true">
        <div className="app-loading-ring" />
        <div className="app-loading-core">
          <img src="/brand/autocrm-mark.svg" alt="" />
        </div>
        <span className="app-loading-dot dot-one" />
        <span className="app-loading-dot dot-two" />
        <span className="app-loading-dot dot-three" />
      </div>

      <div className="app-loading-copy">
        <div className="app-loading-message">{message}</div>
        <div className="app-loading-hint">{hint}</div>
      </div>

      <div className="app-loading-progress" aria-hidden="true">
        <span />
      </div>
    </motion.div>
  </div>
);
