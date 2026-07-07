import { logger } from "../utils/logger";
import { toast } from "../utils/toast";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const CSRF_TOKEN_COOKIE = "csrf_token";
const CSRF_HEADER = "X-CSRF-Token";
const DEFAULT_TIMEOUT_MS = 15000;
const AUTH_REFRESH_TIMEOUT_MS = 15000;
const DEFAULT_CACHE_TTL_MS = 120000;
const MAX_CACHE_ENTRIES = 250;
const MAX_IN_FLIGHT_REQUESTS = 100;
const STALE_DATA_EVENT = "autocrm-stale-data";

const CACHEABLE_PREFIXES = [
  "/api/leads/",
  "/api/deals/",
  "/api/organizations/",
  "/api/notes/",
  "/api/tasks/",
  "/api/dashboard/",
  "/api/admin/",
];

const CACHE_TTL_BY_PREFIX = {
  "/api/dashboard/": 20000,
  "/api/leads/": 120000,
  "/api/deals/": 120000,
  "/api/organizations/": 120000,
  "/api/notes/": 120000,
  "/api/tasks/": 120000,
  "/api/admin/": 120000,
};

const memoryCache = new Map();
const inFlightRequests = new Map();

let cacheUserScope = "anonymous";

// Called on successful /me (login/bootstrap) and on logout, so cached data
// from one identity is never served to another identity in the same tab.
export function setCacheUserScope(userId) {
  const nextScope = userId ? String(userId) : "anonymous";
  if (nextScope === cacheUserScope) {
    return;
  }
  cacheUserScope = nextScope;
  memoryCache.clear();
  inFlightRequests.clear();
}

function getCsrfToken() {
  if (typeof document === "undefined") {
    return "";
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function isJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json");
}

function withTimeout(init, timeoutMs) {
  if (!timeoutMs) {
    return { init, cleanup: () => {} };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    init: { ...init, signal: controller.signal },
    cleanup: () => clearTimeout(timeoutId),
  };
}

function formatLogPath(url) {
  if (typeof url !== "string") {
    return String(url);
  }

  if (url.startsWith(API_BASE)) {
    return url.slice(API_BASE.length) || "/";
  }

  return url;
}

function getCacheablePrefix(path) {
  const cleanPath = path.split("?")[0];
  return CACHEABLE_PREFIXES.find((prefix) => cleanPath.startsWith(prefix)) || null;
}

function getCacheKey(method, path) {
  return `${cacheUserScope}:${method}:${path}`;
}

function getCacheTtlMs(prefix, overrideTtlMs) {
  if (typeof overrideTtlMs === "number") {
    return overrideTtlMs;
  }
  return CACHE_TTL_BY_PREFIX[prefix] || DEFAULT_CACHE_TTL_MS;
}

function getCachedEntry(cacheKey, options = {}) {
  const { allowStale = false } = options;
  const entry = memoryCache.get(cacheKey);
  if (!entry) {
    return { hit: false, stale: false, value: null };
  }

  memoryCache.delete(cacheKey);
  memoryCache.set(cacheKey, entry);

  if (entry.expiresAt <= Date.now()) {
    if (allowStale) {
      return { hit: true, stale: true, value: entry.data };
    }
    return { hit: false, stale: true, value: entry.data };
  }

  return { hit: true, stale: false, value: entry.data };
}

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
  while (memoryCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (!oldestKey) break;
    memoryCache.delete(oldestKey);
  }
  while (inFlightRequests.size > MAX_IN_FLIGHT_REQUESTS) {
    const oldestKey = inFlightRequests.keys().next().value;
    if (!oldestKey) break;
    inFlightRequests.delete(oldestKey);
  }
}

function setCacheEntry(cacheKey, data, ttlMs) {
  pruneCache();
  memoryCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
  pruneCache();
}

function invalidateCacheByPrefix(prefix) {
  for (const key of memoryCache.keys()) {
    if (key.includes(`:${prefix}`)) {
      memoryCache.delete(key);
    }
  }
  for (const key of inFlightRequests.keys()) {
    if (key.includes(`:${prefix}`)) {
      inFlightRequests.delete(key);
    }
  }
}

function invalidateRelatedCache(path) {
  const cleanPath = path.split("?")[0];
  const prefixes = new Set();
  const directPrefix = getCacheablePrefix(path);
  if (directPrefix) {
    prefixes.add(directPrefix);
  }

  if (cleanPath.startsWith("/api/leads/")) {
    prefixes.add("/api/deals/");
    prefixes.add("/api/tasks/");
    prefixes.add("/api/notes/");
    prefixes.add("/api/dashboard/");
  }
  if (cleanPath.startsWith("/api/deals/")) {
    prefixes.add("/api/leads/");
    prefixes.add("/api/dashboard/");
  }
  if (cleanPath.startsWith("/api/tasks/") || cleanPath.startsWith("/api/notes/")) {
    prefixes.add("/api/leads/");
    prefixes.add("/api/dashboard/");
  }
  if (cleanPath.startsWith("/api/organizations/")) {
    prefixes.add("/api/deals/");
    prefixes.add("/api/leads/");
  }

  prefixes.forEach(invalidateCacheByPrefix);
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const { init: timedInit, cleanup } = withTimeout(init, timeoutMs);

  try {
    return await fetch(url, timedInit);
  } catch (error) {
    if (error?.name === "AbortError") {
      logger.warn("api.timeout", { path: formatLogPath(url), timeoutMs });
      const timeoutError = new Error("Request timed out. Please try again.");
      timeoutError.code = "timeout";
      throw timeoutError;
    }

    logger.error("api.network_error", {
      path: formatLogPath(url),
      message: error?.message || "Network error",
    });
    throw error;
  } finally {
    cleanup();
  }
}

async function fetchWithRetry(url, init, timeoutMs, retries = 0) {
  let attempt = 0;
  while (true) {
    try {
      return await fetchWithTimeout(url, init, timeoutMs);
    } catch (error) {
      if (attempt >= retries || error?.code === "timeout") {
        throw error;
      }
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
}

async function parseResponseBody(response) {
  if (response.status === 204) {
    return null;
  }

  if (isJsonResponse(response)) {
    return await response.json();
  }

  const text = await response.text();
  return text || null;
}

async function refreshAccessToken() {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/api/auth/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", [CSRF_HEADER]: getCsrfToken() },
        credentials: "include",
      },
      AUTH_REFRESH_TIMEOUT_MS
    );

    if (!response.ok) {
      logger.warn("auth.refresh.failed", { status: response.status });
      setCacheUserScope(null);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("auth.refresh.error", { message: error?.message });
    setCacheUserScope(null);
    return false;
  }
}

export function peekCache(path) {
  const cachePrefix = getCacheablePrefix(path);
  if (!cachePrefix) {
    return { hit: false, value: null };
  }
  const cacheKey = getCacheKey("GET", path);
  return getCachedEntry(cacheKey);
}

export async function apiFetch(path, init = {}, options = {}) {
  const {
    retryOn401 = true,
    skipAuth = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cache = true,
    forceRefresh = false,
    cacheTtlMs,
    retries,
  } = options;
  if (typeof window !== "undefined" && window.__AUTOCRM_SIGNING_OUT__ && path !== "/api/auth/logout") {
    const error = new Error("Sign out in progress");
    error.code = "signing_out";
    throw error;
  }

  const headers = new Headers(init.headers || {});
  const isFormData = init.body instanceof FormData;
  const method = (init.method || "GET").toUpperCase();
  const cachePrefix = getCacheablePrefix(path);
  const shouldCache = cache && method === "GET" && cachePrefix;
  const isMutating = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth && isMutating) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set(CSRF_HEADER, csrfToken);
    }
  }

  if (shouldCache) {
    const cacheKey = getCacheKey(method, path);
    const cached = getCachedEntry(cacheKey);
    const inFlight = inFlightRequests.get(cacheKey);
    if (inFlight && !forceRefresh) {
      return inFlight;
    }
    if (cached.hit && !forceRefresh) {
      return cached.value;
    }
  }

  const requestUrl = `${API_BASE}${path}`;
  const requestInit = {
    ...init,
    headers,
    credentials: init.credentials || "include",
  };
  const cacheKey = shouldCache ? getCacheKey(method, path) : null;
  const executeRequest = async () => {
    let response;
    try {
      response = await fetchWithRetry(
        requestUrl,
        requestInit,
        timeoutMs,
        typeof retries === "number" ? retries : method === "GET" ? 1 : 0
      );
    } catch (error) {
      if (shouldCache && cacheKey) {
        const stale = getCachedEntry(cacheKey, { allowStale: true });
        if (stale.hit) {
          logger.warn("api.stale_cache_fallback", {
            path,
            reason: error?.code || error?.message || "network_error",
          });
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent(STALE_DATA_EVENT, { detail: { path } }));
          }
          toast.info("Showing offline/outdated data — reconnecting…", { id: `stale:${path}` });
          return stale.value;
        }
      }
      throw error;
    }

    if (response.status === 401 && retryOn401 && !skipAuth) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiFetch(path, init, {
          retryOn401: false,
          skipAuth,
          timeoutMs,
          cache,
          forceRefresh,
          cacheTtlMs,
          retries,
        });
      }
    }

    const data = await parseResponseBody(response);
    if (!response.ok) {
      if (!skipAuth && response.status === 401) {
        setCacheUserScope(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("autocrm-logout"));
        }
        logger.warn("auth.auto_logout", { status: response.status, path });
      }

      if (response.status >= 500) {
        logger.error("api.server_error", { status: response.status, path });
      }

      const message =
        (typeof data === "object" && data
          ? data.error?.message || data.detail || data.message
          : null) ||
        (typeof data === "string" ? data : null) ||
        "Request failed";

      if (!skipAuth && response.status === 403 && /inactive/i.test(message || "")) {
        setCacheUserScope(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("autocrm-inactive", {
              detail: { message },
            })
          );
        }
        logger.warn("auth.inactive_user", { status: response.status, path });
      }

      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (shouldCache) {
      setCacheEntry(cacheKey, data, getCacheTtlMs(cachePrefix, cacheTtlMs));
    } else if (method !== "GET" && cachePrefix) {
      invalidateRelatedCache(path);
    }

    return data;
  };

  if (shouldCache && cacheKey) {
    pruneCache();
    const requestPromise = executeRequest().finally(() => {
      if (inFlightRequests.get(cacheKey) === requestPromise) {
        inFlightRequests.delete(cacheKey);
      }
    });
    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  return executeRequest();
}
