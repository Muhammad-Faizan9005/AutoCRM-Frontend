import { getUserKey } from './adminStorage';

const PERMISSIONS_STORAGE_KEY = 'autocrm_user_permissions';

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

const getStoredPermissions = () => {
  const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveStoredPermissions = (permissionsByUser) => {
  localStorage.setItem(
    PERMISSIONS_STORAGE_KEY,
    JSON.stringify(permissionsByUser || {}),
  );
};

const isAdminUser = (user) => {
  if (!user) return false;
  if (user.is_admin || user.is_superuser) return true;
  const role = (user.role || '').toString().toLowerCase();
  return ['admin', 'administrator', 'system manager', 'superuser'].includes(role);
};

const applyDefaultPermissions = (user, storedPermissions) => {
  const defaults = { ...DEFAULT_PERMISSIONS };

  if (isAdminUser(user)) {
    defaults.import_data = true;
    defaults.admin_panel = true;
    defaults.admin_users = true;
    defaults.admin_permissions = true;
  }

  return { ...defaults, ...(storedPermissions || {}) };
};

export const getPermissionsForUser = (user) => {
  if (!user) return { ...DEFAULT_PERMISSIONS };

  if (user.permissions && typeof user.permissions === 'object') {
    return applyDefaultPermissions(user, user.permissions);
  }

  const allPermissions = getStoredPermissions();
  const userKey = getUserKey(user);
  const stored = allPermissions[userKey];

  return applyDefaultPermissions(user, stored);
};

export const setPermissionsForUser = (userKey, permissions) => {
  const allPermissions = getStoredPermissions();
  allPermissions[userKey] = { ...permissions };
  saveStoredPermissions(allPermissions);
};
