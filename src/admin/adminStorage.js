const USERS_STORAGE_KEY = 'autocrm_admin_users';

const normalizeUser = (user) => {
  const email = (user?.email || '').trim();
  const fullName = user?.full_name || user?.name || email || 'User';
  return {
    id: user?.id || email || user?.username || String(Date.now()),
    full_name: fullName,
    email: email || user?.username || '',
    role: user?.role || 'user',
    status: user?.status || 'active',
  };
};

export const getUserKey = (user) =>
  user?.email || user?.id || user?.username || 'unknown-user';

export const getStoredUsers = (currentUser) => {
  let users = [];
  const raw = localStorage.getItem(USERS_STORAGE_KEY);

  if (raw) {
    try {
      users = JSON.parse(raw);
    } catch {
      users = [];
    }
  }

  if (!Array.isArray(users)) {
    users = [];
  }

  if (currentUser) {
    const current = normalizeUser({
      id: currentUser.id,
      full_name: currentUser.full_name,
      name: currentUser.name,
      email: currentUser.email,
      username: currentUser.username,
      role: currentUser.role,
      status: 'active',
    });
    const exists = users.some((u) => getUserKey(u) === getUserKey(current));
    if (!exists) {
      users.unshift(current);
    }
  }

  return users;
};

export const saveStoredUsers = (users) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users || []));
};
