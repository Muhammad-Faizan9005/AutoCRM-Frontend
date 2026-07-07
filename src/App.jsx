import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import CallJoin from './pages/CallJoin';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Deals from './pages/Deals';
import DealDetail from './pages/DealDetail';
import Contacts from './pages/Contacts';
import Organizations from './pages/Organizations';
import OrganizationDetail from './pages/OrganizationDetail';
import Notes from './pages/Notes';
import Tasks from './pages/Tasks';
import ImportData from './pages/ImportData';
import AdminLayout from './admin/AdminLayout';
import { API_BASE, apiFetch, setCacheUserScope } from './api/client';
import { getPermissionsForUser } from './admin/permissionsStore';
import { logger } from './utils/logger';
import { LoadingScreen } from './components/LoadingScreen';
import { useTheme } from './hooks/useTheme';

const LOGOUT_ANIMATION_MS = 1200;
const LOGOUT_ROUTE_SETTLE_MS = 300;
const LOGIN_LOADER_MS = 5000;

const isConsoleLandingUser = (user) => {
  if (!user) return false;
  if (user.is_admin || user.is_superuser) return true;
  const role = (user.role || '').toString().toLowerCase().replace(/[-\s]+/g, '_');
  return ['admin', 'administrator', 'system_manager', 'superuser', 'sales_manager', 'manager'].includes(role);
};

const getLandingPath = (user, userPermissions) => {
  if (
    isConsoleLandingUser(user) &&
    (
      userPermissions?.admin_panel === true ||
      userPermissions?.admin_users === true ||
      userPermissions?.admin_permissions === true ||
      userPermissions?.import_data === true
    )
  ) {
    return '/admin';
  }
  return '/';
};

const CRM_ROUTES = [
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

const CrmShell = ({ user, permissions, onLogout, onUserUpdate }) => {
  const location = useLocation();
  const canAccess = (permissionKey) => permissions?.[permissionKey] === true;
  const fallbackRoute =
    CRM_ROUTES.find((route) => canAccess(route.permission))?.path || null;

  const guardRoute = (permissionKey, element) => {
    if (canAccess(permissionKey)) return element;
    if (!fallbackRoute || location.pathname === fallbackRoute) {
      return <NoAccess />;
    }
    return <Navigate to={fallbackRoute} replace />;
  };

  return (
    <div className="crm-shell">
      <Sidebar onLogout={onLogout} user={user} permissions={permissions} onUserUpdate={onUserUpdate} />

      <div className="crm-content">
        <main className="crm-main">
          <div className="crm-container">
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={guardRoute('dashboard', <Dashboard />)} />
                <Route path="/leads" element={guardRoute('leads', <Leads user={user} />)} />
                <Route path="/leads/:leadId" element={guardRoute('leads', <LeadDetail user={user} />)} />
                <Route path="/deals" element={guardRoute('deals', <Deals user={user} />)} />
                <Route path="/deals/:dealId" element={guardRoute('deals', <DealDetail user={user} />)} />
                <Route
                  path="/contacts"
                  element={guardRoute('contacts', <Contacts user={user} />)}
                />
                <Route
                  path="/orgs"
                  element={guardRoute('organizations', <Organizations user={user} />)}
                />
                <Route
                  path="/orgs/:organizationId"
                  element={guardRoute('organizations', <OrganizationDetail user={user} />)}
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

function App() {
  const { applyTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(() => getPermissionsForUser(null));
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [inactiveNotice, setInactiveNotice] = useState(null);
  const [showLoginLoader, setShowLoginLoader] = useState(false);
  const loginLoaderTimerRef = useRef(null);
  const isSigningOutRef = useRef(false);

  const clearSession = () => {
    setCacheUserScope(null);
    setUser(null);
    setPermissions(getPermissionsForUser(null));
  };

  // Check if user is already logged in. The access token lives in an httpOnly
  // cookie, so the only way to know is to ask the backend with a fresh /me call.
  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      try {
        const me = await apiFetch('/api/auth/me', {}, { timeoutMs: 3000 });
        if (isMounted) {
          setCacheUserScope(me?.id);
          setUser(me);
          setPermissions(getPermissionsForUser(me));
        }
      } catch (error) {
        if (isMounted) {
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
    const savedTheme = user?.settings?.theme;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      applyTheme(savedTheme);
    }
  }, [applyTheme, user?.settings?.theme]);

  useEffect(() => {
    const handleThemeChanged = async (event) => {
      const nextTheme = event?.detail?.theme;
      if (!user || (nextTheme !== 'light' && nextTheme !== 'dark')) return;
      try {
        const updatedUser = await apiFetch('/api/auth/profile', {
          method: 'PATCH',
          body: JSON.stringify({ settings: { theme: nextTheme } }),
        }, { cache: false, timeoutMs: 10000 });
        setUser((currentUser) => ({ ...(currentUser || {}), ...(updatedUser || {}) }));
      } catch (error) {
        logger.warn('profile.theme_save_failed', { message: error?.message });
      }
    };

    window.addEventListener('autocrm-theme-changed', handleThemeChanged);
    return () => window.removeEventListener('autocrm-theme-changed', handleThemeChanged);
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

  useEffect(() => {
    const handleInactive = (event) => {
      const detail = event?.detail || {};
      clearSession();
      setInactiveNotice({
        title: 'Account disabled',
        message:
          detail.message ||
          'This account has been disabled. Please contact your administrator to regain access.',
      });
    };

    window.addEventListener('autocrm-inactive', handleInactive);
    return () => {
      window.removeEventListener('autocrm-inactive', handleInactive);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const checkActive = async () => {
      if (isSigningOutRef.current) return;
      try {
        await apiFetch('/api/auth/me', {}, { timeoutMs: 3000 });
      } catch (error) {
        if (!isMounted) return;
        if (error?.status === 403 && /inactive/i.test(error?.message || '')) {
          clearSession();
          setInactiveNotice({
            title: 'Account disabled',
            message:
              'This account has been disabled. Please contact your administrator to regain access.',
          });
        }
      }
    };

    checkActive();
    const intervalId = setInterval(checkActive, 6000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [user]);


  useEffect(() => {
    return () => {
      if (loginLoaderTimerRef.current) {
        clearTimeout(loginLoaderTimerRef.current);
      }
    };
  }, []);

  const handleLogin = (userData) => {
    setCacheUserScope(userData?.id);
    setUser(userData);
    setPermissions(getPermissionsForUser(userData));
    setShowLoginLoader(true);
    if (loginLoaderTimerRef.current) {
      clearTimeout(loginLoaderTimerRef.current);
    }
    loginLoaderTimerRef.current = setTimeout(() => {
      setShowLoginLoader(false);
      loginLoaderTimerRef.current = null;
    }, LOGIN_LOADER_MS);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser((currentUser) => {
      const nextUser = {
        ...(currentUser || {}),
        ...(updatedUser || {}),
      };
      setPermissions(getPermissionsForUser(nextUser));
      return nextUser;
    });
  };

  const handleLogout = () => {
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;

    if (loginLoaderTimerRef.current) {
      clearTimeout(loginLoaderTimerRef.current);
      loginLoaderTimerRef.current = null;
    }

    // Correct sequencing:
    // 1. Show the sign-out overlay first and let the animation cover the current page.
    // 2. Revoke tokens in the background while the overlay is visible.
    // 3. Only after the animation is basically done, clear auth state and route to login.
    // 4. Keep the overlay up briefly during the route swap so login never flashes behind it.
    window.__AUTOCRM_SIGNING_OUT__ = true;
    setShowLoginLoader(false);
    setIsLoggingOut(true);

    logger.info('auth.logout', { reason: 'user' });

    const csrfMatch = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
    const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : '';

    fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      keepalive: true,
    }).catch((error) => {
      logger.warn('auth.logout.request_failed', { message: error?.message });
    });

    window.setTimeout(() => {
      clearSession();

      window.setTimeout(() => {
        setIsLoggingOut(false);
        window.__AUTOCRM_SIGNING_OUT__ = false;
        isSigningOutRef.current = false;
      }, LOGOUT_ROUTE_SETTLE_MS);
    }, LOGOUT_ANIMATION_MS);
  };

  // During silent session restore, avoid showing the full branded loader.
  // The branded loader is reserved for the intentional post-login dashboard transition.
  if (loading) {
    return null;
  }

  if (showLoginLoader) {
    return <LoadingScreen message="Preparing your workspace..." hint="Loading your permissions, modules, and latest CRM context." />;
  }

  return (
    <Router>
      {isLoggingOut && (
        <div className="app-loading-overlay">
          <LoadingScreen
            message="Signing you out from the workspace..."
            hint="Closing your session and securing your CRM workspace."
          />
        </div>
      )}
      {inactiveNotice && (
        <div className="logout-overlay" role="dialog" aria-live="polite">
          <div className="inactive-card">
            <button
              className="inactive-close"
              type="button"
              aria-label="Close"
              onClick={() => setInactiveNotice(null)}
            >
              <span aria-hidden="true">×</span>
            </button>
            <div className="inactive-title">{inactiveNotice.title}</div>
            <div className="inactive-body">{inactiveNotice.message}</div>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/call/join" element={<CallJoin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/login"
          element={user ? <Navigate to={getLandingPath(user, permissions)} replace /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/admin/*"
          element={
            user ? (
              <AdminLayout
                user={user}
                onLogout={handleLogout}
                permissions={permissions}
                onUserUpdate={handleUserUpdate}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/*"
          element={
            user ? (
              <CrmShell
                user={user}
                permissions={permissions}
                onLogout={handleLogout}
                onUserUpdate={handleUserUpdate}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
