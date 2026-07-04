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
  if (currentUser) {
    return [normalizeUser({
      id: currentUser.id,
      full_name: currentUser.full_name,
      name: currentUser.name,
      email: currentUser.email,
      username: currentUser.username,
      role: currentUser.role,
      status: 'active',
    })];
  }

  return [];
};

export const saveStoredUsers = () => {};
