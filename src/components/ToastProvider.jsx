import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { subscribeToToasts } from '../utils/toast';

const DEFAULT_DURATION = 3000;

const ToastProvider = ({ children, position = 'top-right', duration = DEFAULT_DURATION }) => {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      const next = { ...toast, duration: toast.duration ?? duration };
      setToasts((prev) => [...prev, next]);
      const timeoutId = setTimeout(() => removeToast(next.id), next.duration);
      timeoutsRef.current.set(next.id, timeoutId);
    });

    return () => {
      unsubscribe();
      timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutsRef.current.clear();
    };
  }, [duration, removeToast]);

  const positionClass = useMemo(() => {
    if (position === 'top-left') return 'toast-host toast-host-top-left';
    return 'toast-host toast-host-top-right';
  }, [position]);

  return (
    <>
      {children}
      <div className={positionClass} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.title && <div className="toast-title">{toast.title}</div>}
            <div className="toast-message">{toast.message}</div>
            <button className="toast-close" onClick={() => removeToast(toast.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

export default ToastProvider;
