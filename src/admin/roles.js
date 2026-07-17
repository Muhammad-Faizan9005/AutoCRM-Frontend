export const isAdminUser = (user) => {
  if (!user) return false;
  if (user.is_admin || user.is_superuser) return true;
  const role = (user.role || '').toString().toLowerCase();
  return ['admin', 'administrator', 'system manager', 'superuser'].includes(role);
};

export const isManagerUser = (user) => {
  const role = (user?.role || '').toString().toLowerCase();
  return role === 'sales_manager' || role === 'manager';
};
