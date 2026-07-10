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

export async function getAdminActivityLog({ skip = 0, limit = 50, entityType, eventType, search } = {}) {
  const suffix = buildQuery({
    skip,
    limit,
    entity_type: entityType,
    event_type: eventType,
    search,
  });
  const data = await apiFetch(`/api/admin/activity-log${suffix}`, {}, { cache: false });
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number.isFinite(Number(data?.total)) ? Number(data.total) : 0,
  };
}

export async function listAdminUsers({ search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const suffix = buildQuery({ search, page, page_size: pageSize });
  const data = await apiFetch(`/api/admin/users${suffix}`);
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number.isFinite(Number(data?.total)) ? Number(data.total) : 0,
  };
}

export async function listDealAssignmentOwners() {
  const data = await apiFetch('/api/deals/assignment-owners', {}, { cache: false });
  return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
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

export async function enableAdminUser(userId) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'active' }),
  });
}

export async function revokeAdminInvite(userId) {
  return apiFetch(`/api/admin/invites/${encodeURIComponent(userId)}/revoke`, {
    method: 'POST',
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

export async function listFailedInvites() {
  return apiFetch('/api/admin/failed-invites');
}

export async function listDeletedUsers({ page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const suffix = buildQuery({ page, page_size: pageSize });
  const data = await apiFetch(`/api/admin/deleted-users${suffix}`);
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number.isFinite(Number(data?.total)) ? Number(data.total) : 0,
  };
}

export async function reinviteFailedInvite(failedId) {
  return apiFetch(`/api/admin/failed-invites/${encodeURIComponent(failedId)}/reinvite`, {
    method: 'POST',
  });
}

export async function deleteFailedInvite(failedId) {
  return apiFetch(`/api/admin/failed-invites/${encodeURIComponent(failedId)}`, {
    method: 'DELETE',
  });
}
