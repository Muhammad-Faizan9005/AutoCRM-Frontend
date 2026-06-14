import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const ConfirmDialog = ({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const toneStyles = {
    danger: {
      iconBg: 'var(--color-danger-subtle)',
      iconColor: 'var(--color-danger)',
      buttonClass: 'btn btn-danger',
    },
    warning: {
      iconBg: 'var(--color-warning-subtle)',
      iconColor: 'var(--color-warning)',
      buttonClass: 'btn btn-secondary',
    },
  };
  const activeTone = toneStyles[tone] || toneStyles.danger;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isLoading ? undefined : onCancel}
        >
          <motion.div
            className="modal-content"
            style={{ maxWidth: 420 }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.16 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <div style={{ padding: 20, display: 'flex', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: activeTone.iconBg,
                  color: activeTone.iconColor,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={20} />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <h3 id="confirm-dialog-title" className="section-title" style={{ margin: 0 }}>
                    {title}
                  </h3>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={onCancel}
                    disabled={isLoading}
                    aria-label="Close"
                    style={{ width: 28, height: 28, padding: 0 }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.55 }}>
                  {message}
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '14px 20px',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-bg-elevated)',
              }}
            >
              <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
                {cancelLabel}
              </button>
              <button type="button" className={activeTone.buttonClass} onClick={onConfirm} disabled={isLoading}>
                {isLoading ? 'Deleting...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
