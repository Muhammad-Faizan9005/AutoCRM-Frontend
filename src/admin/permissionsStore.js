export const PERMISSION_GROUPS = [
  {
    label: 'CRM Core',
    permissions: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        description: 'View CRM performance snapshot and summaries.',
      },
      {
        key: 'leads',
        label: 'Leads',
        description: 'Access lead pipelines, views, and records.',
      },
      {
        key: 'deals',
        label: 'Deals',
        description: 'Access deal pipelines, values, and stages.',
      },
      {
        key: 'contacts',
        label: 'Contacts',
        description: 'View and manage contacts and customers.',
      },
      {
        key: 'organizations',
        label: 'Organizations',
        description: 'Manage organizations and account profiles.',
      },
      {
        key: 'notes',
        label: 'Notes',
        description: 'View internal notes and discussions.',
      },
      {
        key: 'tasks',
        label: 'Tasks',
        description: 'Access task lists and reminders.',
      },
    ],
  },
  {
    label: 'Data Operations',
    permissions: [
      {
        key: 'import_data',
        label: 'Data Imports',
        description: 'Upload CSV and Excel files into CRM.',
      },
    ],
  },
  {
    label: 'Admin Panel',
    permissions: [
      {
        key: 'admin_panel',
        label: 'Admin Panel',
        description: 'Enter the admin control center.',
      },
      {
        key: 'admin_users',
        label: 'User Management',
        description: 'Add, update, and deactivate users.',
      },
      {
        key: 'admin_permissions',
        label: 'Permission Management',
        description: 'Configure per-user feature access.',
      },
    ],
  },
];

/* ── Operator list grouping (admin permissions page) ───────────────────────
   Both role spellings per section: the admin API maps roles to
   admin/manager/agent, but raw DB values (sales_manager, sales_rep) pass
   through unmapped for anything outside ROLE_OUTPUT_MAP. */
export const ROLE_SECTIONS = [
  { key: 'admin', label: 'Admins', roles: ['admin', 'administrator', 'system_manager', 'superuser'] },
  { key: 'manager', label: 'Managers', roles: ['manager', 'sales_manager'] },
  { key: 'agent', label: 'Sales reps', roles: ['agent', 'sales_rep'] },
];

const SECTION_BY_ROLE = new Map(
  ROLE_SECTIONS.flatMap((section) => section.roles.map((role) => [role, section.key]))
);

const sectionKeyFor = (user) =>
  SECTION_BY_ROLE.get((user?.role || '').toString().trim().toLowerCase()) || 'other';

// Buckets users in ROLE_SECTIONS order, sorted by name. Unrecognised roles land
// in "Other" so nobody can silently vanish from the page. Empty sections dropped.
export const groupUsersByRole = (users = []) => {
  const sections = [...ROLE_SECTIONS, { key: 'other', label: 'Other' }];
  const buckets = new Map(sections.map((section) => [section.key, []]));

  users.forEach((user) => buckets.get(sectionKeyFor(user)).push(user));

  return sections
    .map((section) => ({
      key: section.key,
      label: section.label,
      users: buckets
        .get(section.key)
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')),
    }))
    .filter((section) => section.users.length > 0);
};

// A manager owns a team via teams.manager_id and normally has a NULL
// agents.team_id; reps are linked by team_id. Same two-way resolution the
// backend does — cf. COALESCE(a.team_id, tm.team_id) in utils/team_access.py.
export const buildTeamLabeler = (teams = []) => {
  const byId = new Map(teams.map((team) => [String(team.id), team.name]));
  const byManager = new Map(teams.map((team) => [String(team.manager_id), team.name]));

  return (user) => {
    const label = byManager.get(String(user?.id)) || byId.get(String(user?.team_id));
    if (label) return label;
    const section = sectionKeyFor(user);
    if (section === 'admin') return '';
    return section === 'manager' ? 'No team' : 'Unassigned';
  };
};

export const DEFAULT_PERMISSIONS = {
  dashboard: true,
  leads: true,
  deals: true,
  contacts: true,
  organizations: true,
  notes: true,
  tasks: true,
  import_data: false,
  admin_panel: false,
  admin_users: false,
  admin_permissions: false,
};

const isAdminUser = (user) => {
  if (!user) return false;
  if (user.is_admin || user.is_superuser) return true;
  const role = (user.role || '').toString().toLowerCase();
  return ['admin', 'administrator', 'system manager', 'superuser'].includes(role);
};

const isManagerUser = (user) => {
  if (!user) return false;
  const role = (user.role || '').toString().toLowerCase();
  return ['sales_manager', 'manager'].includes(role);
};

const applyDefaultPermissions = (user, storedPermissions) => {
  const defaults = { ...DEFAULT_PERMISSIONS };

  if (isAdminUser(user)) {
    defaults.import_data = true;
    defaults.admin_panel = true;
    defaults.admin_users = true;
    defaults.admin_permissions = true;
  } else if (isManagerUser(user)) {
    defaults.import_data = true;
    defaults.admin_users = true;
    defaults.admin_permissions = true;
  }

  return { ...defaults, ...(storedPermissions || {}) };
};

export const getPermissionsForUser = (user) => {
  if (!user) return { ...DEFAULT_PERMISSIONS };

  return applyDefaultPermissions(user, user.permissions);
};
