import { apiFetch } from '../api/client';

export async function getControlCenterSnapshot() {
  return apiFetch('/api/agent/control-center', {}, { cache: false, timeoutMs: 45000 });
}

export async function listAgentRuns(params = {}) {
  const search = new URLSearchParams();
  if (params.status) search.set('status_filter', params.status);
  if (params.entityType) search.set('entity_type', params.entityType);
  if (params.entityId) search.set('entity_id', params.entityId);
  const suffix = search.toString() ? `?${search.toString()}` : '';
  return apiFetch(`/api/agent/runs${suffix}`, {}, { cache: false, timeoutMs: 20000 });
}

export async function getAgentRunTrace(runId) {
  return apiFetch(`/api/agent/runs/${encodeURIComponent(runId)}/trace`, {}, { cache: false, timeoutMs: 20000 });
}

export async function listAgentApprovals() {
  return apiFetch('/api/agent/approvals', {}, { cache: false, timeoutMs: 20000 });
}

export async function approveAgentAction(approvalId, note = '', options = {}) {
  return apiFetch(`/api/agent/approvals/${encodeURIComponent(approvalId)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note, ...options }),
  }, { cache: false, timeoutMs: 20000 });
}

export async function rejectAgentAction(approvalId, note = '') {
  return apiFetch(`/api/agent/approvals/${encodeURIComponent(approvalId)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  }, { cache: false, timeoutMs: 20000 });
}

export async function getAgentMemory(entityType, entityId) {
  return apiFetch(
    `/api/agent/memory/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
    {},
    { cache: false, timeoutMs: 20000 },
  );
}

export async function listAgentSettings() {
  return apiFetch('/api/agent/settings', {}, { cache: false, timeoutMs: 20000 });
}

export async function updateAgentSetting(agentType, enabled) {
  return apiFetch(`/api/agent/settings/${encodeURIComponent(agentType)}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  }, { cache: false, timeoutMs: 20000 });
}

export async function getAgentTeamStats() {
  return apiFetch('/api/agent/team-stats', {}, { cache: false, timeoutMs: 20000 });
}

// AI Agents Registry — returns only registered AI workers, not human CRM users
export async function listAiAgents() {
  return apiFetch('/api/agent/ai-agents', {}, { cache: false, timeoutMs: 20000 });
}

export async function updateAiAgent(agentKey, payload) {
  return apiFetch(`/api/agent/ai-agents/${encodeURIComponent(agentKey)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, { cache: false, timeoutMs: 20000 });
}

export async function createAiAgentCredential(agentKey, payload = {}) {
  return apiFetch(`/api/agent/ai-agents/${encodeURIComponent(agentKey)}/credentials`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { cache: false, timeoutMs: 20000 });
}

export async function listAiAgentCredentials(agentKey) {
  return apiFetch(`/api/agent/ai-agents/${encodeURIComponent(agentKey)}/credentials`, {}, { cache: false, timeoutMs: 20000 });
}

export async function revokeAiAgentCredential(agentKey, credentialId) {
  return apiFetch(`/api/agent/ai-agents/${encodeURIComponent(agentKey)}/credentials/${encodeURIComponent(credentialId)}`, {
    method: 'DELETE',
  }, { cache: false, timeoutMs: 20000 });
}
