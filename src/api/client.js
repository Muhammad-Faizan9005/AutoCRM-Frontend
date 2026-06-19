import { logger } from "../utils/logger";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const DEFAULT_TIMEOUT_MS = 0;
const AUTH_REFRESH_TIMEOUT_MS = 15000;
const DEFAULT_CACHE_TTL_MS = 120000;

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

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens({ accessToken, refreshToken }) {
  memoryCache.clear();
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearTokens() {
  memoryCache.clear();
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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

function getCacheKey(method, path, authToken = "") {
  const tokenScope = authToken ? authToken.slice(-16) : "anonymous";
  return `${tokenScope}:${method}:${path}`;
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

  if (entry.expiresAt <= Date.now()) {
    if (allowStale) {
      return { hit: true, stale: true, value: entry.data };
    }
    return { hit: false, stale: true, value: entry.data };
  }

  return { hit: true, stale: false, value: entry.data };
}

function setCacheEntry(cacheKey, data, ttlMs) {
  memoryCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

function invalidateCacheByPrefix(prefix) {
  for (const key of memoryCache.keys()) {
    if (key.includes(`:${prefix}`)) {
      memoryCache.delete(key);
    }
  }
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
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/api/auth/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
      AUTH_REFRESH_TIMEOUT_MS
    );

    if (!response.ok) {
      logger.warn("auth.refresh.failed", { status: response.status });
      clearTokens();
      return false;
    }

    const data = await response.json();
    if (!data?.access_token || !data?.refresh_token) {
      logger.warn("auth.refresh.invalid_response");
      clearTokens();
      return false;
    }

    setTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });

    return true;
  } catch (error) {
    logger.error("auth.refresh.error", { message: error?.message });
    clearTokens();
    return false;
  }
}

export function peekCache(path, options = {}) {
  const { skipAuth = false } = options;
  const cachePrefix = getCacheablePrefix(path);
  if (!cachePrefix) {
    return { hit: false, value: null };
  }
  const accessToken = skipAuth ? "" : getAccessToken();
  const cacheKey = getCacheKey("GET", path, accessToken);
  return getCachedEntry(cacheKey);
}

export async function apiFetch(path, init = {}, options = {}) {
  const {
    retryOn401 = true,
    skipAuth = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cache = true,
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

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = skipAuth ? "" : getAccessToken();
  if (!skipAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (shouldCache) {
    const cacheKey = getCacheKey(method, path, accessToken);
    const cached = getCachedEntry(cacheKey);
    if (cached.hit) {
      return cached.value;
    }
  }

  const requestUrl = `${API_BASE}${path}`;
  const requestInit = {
    ...init,
    headers,
  };
  const cacheKey = shouldCache ? getCacheKey(method, path, accessToken) : null;
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
        cacheTtlMs,
        retries,
      });
    }
  }

  const data = await parseResponseBody(response);
  if (!response.ok) {
    if (!skipAuth && response.status === 401) {
      clearTokens();
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
      clearTokens();
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
    invalidateCacheByPrefix(cachePrefix);
  }

  return data;
}
