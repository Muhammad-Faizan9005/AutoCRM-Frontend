import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import AcceptInvite from './pages/AcceptInvite';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Deals from './pages/Deals';
import Contacts from './pages/Contacts';
import Organizations from './pages/Organizations';
import Notes from './pages/Notes';
import Tasks from './pages/Tasks';
import ImportData from './pages/ImportData';
import AdminLayout from './admin/AdminLayout';
import { apiFetch, clearTokens, getAccessToken, getRefreshToken } from './api/client';
import { getPermissionsForUser } from './admin/permissionsStore';
import { logger } from './utils/logger';
import { SkeletonDashboard } from './components/Skeleton';

const USER_PROFILE_KEY = 'user_profile';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(() => getPermissionsForUser(null));

  const clearSession = () => {
    clearTokens();
    localStorage.removeItem(USER_PROFILE_KEY);
    setUser(null);
    setPermissions(getPermissionsForUser(null));
  };

  // Check if user is already logged in
  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();
      const cachedProfile = localStorage.getItem(USER_PROFILE_KEY);
      const cachedUser = cachedProfile ? JSON.parse(cachedProfile) : null;

      if (!accessToken && !refreshToken) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const me = await apiFetch('/api/auth/me', {}, { timeoutMs: 3000 });
        if (isMounted) {
          setUser(me);
          setPermissions(getPermissionsForUser(me));
          localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(me));
        }
      } catch (error) {
        const status = error?.status;

        if (status === 401 || status === 403) {
          if (isMounted) {
            clearSession();
          }
        } else if (cachedUser) {
          if (isMounted) {
            setUser(cachedUser);
            setPermissions(getPermissionsForUser(cachedUser));
          }
        } else if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setPermissions(getPermissionsForUser(user));
  }, [user]);

  useEffect(() => {
    const handlePermissionsUpdate = (event) => {
      const detail = event?.detail;
      const updatedUserId = detail?.userId ? String(detail.userId) : '';
      const currentUserId = user?.id ? String(user.id) : '';
      const updatedPermissions = detail?.permissions;

      if (
        user &&
        updatedUserId &&
        currentUserId &&
        updatedUserId === currentUserId &&
        updatedPermissions &&
        typeof updatedPermissions === 'object'
      ) {
        const nextUser = {
          ...user,
          permissions: { ...updatedPermissions },
        };
        setUser(nextUser);
        setPermissions(getPermissionsForUser(nextUser));
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(nextUser));
        return;
      }

      setPermissions(getPermissionsForUser(user));
    };
    window.addEventListener('autocrm-permissions-updated', handlePermissionsUpdate);
    return () => {
      window.removeEventListener('autocrm-permissions-updated', handlePermissionsUpdate);
    };
  }, [user]);

  useEffect(() => {
    const handleAutoLogout = () => {
      clearSession();
    };

    window.addEventListener('autocrm-logout', handleAutoLogout);
    return () => {
      window.removeEventListener('autocrm-logout', handleAutoLogout);
    };
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setPermissions(getPermissionsForUser(userData));
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try {
      const refreshToken = getRefreshToken();
      await apiFetch(
        '/api/auth/logout',
        {
          method: 'POST',
          body: refreshToken ? JSON.stringify({ refresh_token: refreshToken }) : undefined,
        },
        { timeoutMs: 3000 }
      );
    } catch (error) {
      logger.warn('auth.logout.request_failed', { message: error?.message });
      // Ignore logout errors and clear local session.
    }

    clearSession();
    logger.info('auth.logout', { reason: 'user' });
  };

  const canAccess = (permissionKey) => permissions?.[permissionKey] === true;

  const crmRoutes = [
    { permission: 'dashboard', path: '/' },
    { permission: 'leads', path: '/leads' },
    { permission: 'deals', path: '/deals' },
    { permission: 'contacts', path: '/contacts' },
    { permission: 'organizations', path: '/orgs' },
    { permission: 'notes', path: '/tasks' },
    { permission: 'tasks', path: '/todo' },
    { permission: 'import_data', path: '/import' },
  ];

  const NoAccess = () => (
    <div style={{
      display: 'flex',
      minHeight: '70vh',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      fontSize: 'var(--text-sm)',
      color: 'var(--color-text-tertiary)',
    }}>
      No modules are enabled for this account yet.
    </div>
  );

  const CrmShell = () => {
    const location = useLocation();
    const fallbackRoute =
      crmRoutes.find((route) => canAccess(route.permission))?.path || null;

    const guardRoute = (permissionKey, element) => {
      if (canAccess(permissionKey)) return element;
      if (!fallbackRoute || location.pathname === fallbackRoute) {
        return <NoAccess />;
      }
      return <Navigate to={fallbackRoute} replace />;
    };

    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--color-bg-base)',
      }}>
        <Sidebar onLogout={handleLogout} user={user} permissions={permissions} />

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <main style={{
            flex: 1,
            overflowX: 'hidden',
            overflowY: 'auto',
            padding: '24px 32px',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={guardRoute('dashboard', <Dashboard />)} />
                  <Route path="/leads" element={guardRoute('leads', <Leads user={user} />)} />
                  <Route path="/leads/:leadId" element={guardRoute('leads', <LeadDetail user={user} />)} />
                  <Route path="/deals" element={guardRoute('deals', <Deals user={user} />)} />
                  <Route
                    path="/contacts"
                    element={guardRoute('contacts', <Contacts user={user} />)}
                  />
                  <Route
                    path="/orgs"
                    element={guardRoute('organizations', <Organizations user={user} />)}
                  />
                  <Route path="/tasks" element={guardRoute('notes', <Notes user={user} />)} />
                  <Route path="/todo" element={guardRoute('tasks', <Tasks user={user} />)} />
                  <Route path="/import" element={guardRoute('import_data', <ImportData />)} />
                  <Route path="*" element={<Navigate to={fallbackRoute || '/'} replace />} />
                </Routes>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-bg-base)',
      }}>
        <div style={{ width: '100%', maxWidth: 800, padding: 32 }}>
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/admin/*"
          element={
            user ? (
              <AdminLayout
                user={user}
                onLogout={handleLogout}
                permissions={permissions}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/*"
          element={user ? <CrmShell /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
