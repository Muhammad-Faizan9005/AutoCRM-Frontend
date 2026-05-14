import { apiFetch } from '../api/client';

/* ── Teams API client ──────────────────────────────────────────────────── */

export async function createTeam(payload) {
  return apiFetch('/api/admin/teams', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listTeams() {
  const data = await apiFetch('/api/admin/teams');
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number(data?.total ?? 0),
  };
}

export async function getMyTeam() {
  return apiFetch('/api/admin/teams/mine');
}

export async function getTeam(teamId) {
  return apiFetch(`/api/admin/teams/${encodeURIComponent(teamId)}`);
}

export async function updateTeam(teamId, payload) {
  return apiFetch(`/api/admin/teams/${encodeURIComponent(teamId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function addTeamMember(teamId, agentId) {
  return apiFetch(`/api/admin/teams/${encodeURIComponent(teamId)}/members`, {
    method: 'POST',
    body: JSON.stringify({ agent_id: agentId }),
  });
}

export async function removeTeamMember(teamId, agentId) {
  return apiFetch(
    `/api/admin/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(agentId)}`,
    { method: 'DELETE' }
  );
}
