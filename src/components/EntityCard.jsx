import React from 'react';
import { motion } from 'framer-motion';

export const EntityCard = ({
  title,
  description,
  descriptionFallback = 'No description added.',
  accentClass = 'note-border-accent',
  statusSlot = null,
  iconSlot = null,
  badges = [],
  footerLeft = null,
  footerRight = null,
  actions = null,
  onClick,
  clickable = Boolean(onClick),
  clampDescription = false,
  minDescriptionHeight = 44,
}) => {
  const hasFooter = footerLeft || footerRight || actions;

  return (
    <motion.div
      className={`card ${accentClass}`}
      style={{
        padding: 16,
        cursor: clickable ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 0,
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
      }}
      onClick={onClick}
      whileHover={clickable ? { scale: 1.01 } : undefined}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 'var(--text-md)',
            lineHeight: 1.35,
            margin: 0,
            minWidth: 0,
          }}
        >
          {title || 'Untitled'}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {statusSlot}
          {iconSlot}
        </div>
      </div>

      <p
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
          margin: 0,
          minHeight: minDescriptionHeight,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          ...(clampDescription
            ? {
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : {}),
        }}
      >
        {description || descriptionFallback}
      </p>

      {badges.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {badges.filter(Boolean).map((badge, index) => (
            <span key={`${badge.label}-${badge.className || 'badge-muted'}-${index}`} className={`badge ${badge.className || 'badge-muted'}`}>
              {badge.label}
            </span>
          ))}
        </div>
      )}

      {hasFooter && (
        <div
          style={{
            display: 'flex',
            justifyContent: footerLeft ? 'space-between' : 'flex-end',
            alignItems: 'center',
            marginTop: 'auto',
            paddingTop: 10,
            borderTop: '1px solid var(--color-border)',
            gap: 8,
          }}
        >
          {footerLeft && <div style={{ minWidth: 0 }}>{footerLeft}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {footerRight}
            {actions}
          </div>
        </div>
      )}
    </motion.div>
  );
};
