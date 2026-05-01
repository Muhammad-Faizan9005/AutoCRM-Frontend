const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const DEFAULT_TIMEOUT_MS = 8000;

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearTokens() {
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

async function fetchWithTimeout(url, init, timeoutMs) {
  const { init: timedInit, cleanup } = withTimeout(init, timeoutMs);

  try {
    return await fetch(url, timedInit);
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("Request timed out. Please try again.");
      timeoutError.code = "timeout";
      throw timeoutError;
    }

    throw error;
  } finally {
    cleanup();
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
      DEFAULT_TIMEOUT_MS
    );

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data = await response.json();
    if (!data?.access_token || !data?.refresh_token) {
      clearTokens();
      return false;
    }

    setTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });

    return true;
  } catch (error) {
    clearTokens();
    return false;
  }
}

export async function apiFetch(path, init = {}, options = {}) {
  const { retryOn401 = true, skipAuth = false, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const headers = new Headers(init.headers || {});
  const isFormData = init.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const response = await fetchWithTimeout(
    `${API_BASE}${path}`,
    {
      ...init,
      headers,
    },
    timeoutMs
  );

  if (response.status === 401 && retryOn401 && !skipAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch(path, init, { retryOn401: false, skipAuth });
    }
  }

  const data = await parseResponseBody(response);
  if (!response.ok) {
    const message =
      (typeof data === "object" && data
        ? data.error?.message || data.detail || data.message
        : null) ||
      (typeof data === "string" ? data : null) ||
      "Request failed";

    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
