/* Self-check for operator-list grouping. Run: node src/admin/permissionsStore.check.js */
import assert from 'node:assert/strict';
import { buildTeamLabeler, groupUsersByRole } from './permissionsStore.js';

const TEAM = { id: 't1', name: 'North', manager_id: 'm1' };

/* ── grouping ── */
const sections = groupUsersByRole([
  { id: 'r2', full_name: 'Zoe', role: 'agent' },
  { id: 'a1', full_name: 'Ada', role: 'admin' },
  { id: 'r1', full_name: 'Bob', role: 'sales_rep' },   // unmapped DB spelling
  { id: 'm1', full_name: 'Mia', role: 'manager' },
  { id: 'x1', full_name: 'Bot', role: 'ai_worker' },   // unrecognised
]);

assert.deepEqual(sections.map(s => s.key), ['admin', 'manager', 'agent', 'other'], 'section order');
assert.deepEqual(sections[2].users.map(u => u.full_name), ['Bob', 'Zoe'], 'reps sorted by name, both spellings');
assert.equal(sections[3].users[0].full_name, 'Bot', 'unrecognised role is not dropped');
assert.equal(groupUsersByRole([{ id: 'a', role: 'admin' }]).length, 1, 'empty sections dropped');
assert.deepEqual(groupUsersByRole([]), [], 'no users');

/* ── team labels ── */
const label = buildTeamLabeler([TEAM]);
assert.equal(label({ id: 'm1', role: 'manager', team_id: null }), 'North', 'manager labelled by owned team, not team_id');
assert.equal(label({ id: 'r1', role: 'agent', team_id: 't1' }), 'North', 'rep labelled by team_id');
assert.equal(label({ id: 'm9', role: 'manager', team_id: null }), 'No team');
assert.equal(label({ id: 'r9', role: 'agent', team_id: null }), 'Unassigned');
assert.equal(label({ id: 'a1', role: 'admin', team_id: null }), '', 'admins unlabelled');
assert.equal(label({ id: 'm1', role: 'admin', team_id: null }), 'North', 'admin owning a team is labelled');
assert.equal(label({ id: 'r1', role: 'agent', team_id: 'gone' }), 'Unassigned', 'stale team_id');
// listTeams() failed: labels degrade, page still renders
assert.equal(buildTeamLabeler([])({ id: 'm1', role: 'manager' }), 'No team', 'no teams loaded');

console.log('permissionsStore: all checks passed');
