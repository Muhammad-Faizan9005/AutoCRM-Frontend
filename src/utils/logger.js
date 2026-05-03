const APP_TAG = "[AutoCRM]";
const IS_DEV = import.meta.env?.DEV;

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== "object") {
    return undefined;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(meta)) {
    if (/token|password|authorization/i.test(key)) {
      continue;
    }
    sanitized[key] = value;
  }

  return Object.keys(sanitized).length ? sanitized : undefined;
}

function emit(level, event, meta) {
  if (level === "debug" && !IS_DEV) {
    return;
  }

  if (typeof console === "undefined") {
    return;
  }

  const safeMeta = sanitizeMeta(meta);
  const loggerFn = console[level] || console.log;
  if (safeMeta) {
    loggerFn(`${APP_TAG} ${event}`, safeMeta);
  } else {
    loggerFn(`${APP_TAG} ${event}`);
  }
}

export const logger = {
  info(event, meta) {
    emit("info", event, meta);
  },
  warn(event, meta) {
    emit("warn", event, meta);
  },
  error(event, meta) {
    emit("error", event, meta);
  },
  debug(event, meta) {
    emit("debug", event, meta);
  },
};
