const listeners = new Set();

const notify = (payload) => {
  listeners.forEach((listener) => listener(payload));
};

const buildToast = (payload) => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  type: payload.type || 'info',
  message: payload.message || '',
  title: payload.title || '',
  duration: Number.isFinite(payload.duration) ? payload.duration : undefined,
});

export const toast = {
  show: (payload) => notify(buildToast(payload)),
  success: (message, options = {}) => notify(buildToast({ ...options, type: 'success', message })),
  error: (message, options = {}) => notify(buildToast({ ...options, type: 'error', message })),
  info: (message, options = {}) => notify(buildToast({ ...options, type: 'info', message })),
};

export const subscribeToToasts = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
