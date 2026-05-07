import { apiFetch } from '../api/client';

const DEFAULT_PAGE_SIZE = 200;

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && !value.trim()) return;
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export async function getAdminOverview() {
  return apiFetch('/api/admin/overview');
}

export async function listAdminUsers({ search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const suffix = buildQuery({ search, page, page_size: pageSize });
  const data = await apiFetch(`/api/admin/users${suffix}`);
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number.isFinite(Number(data?.total)) ? Number(data.total) : 0,
  };
}

export async function createAdminUser(payload) {
  return apiFetch('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUser(userId, payload) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deactivateAdminUser(userId) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export async function getAdminUserPermissions(userId) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/permissions`);
}

export async function updateAdminUserPermissions(userId, permissions) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}
