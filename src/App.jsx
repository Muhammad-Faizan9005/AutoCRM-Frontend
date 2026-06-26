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
import Contacts from './pages/Contacts';
import Organizations from './pages/Organizations';
import OrganizationDetail from './pages/OrganizationDetail';
import Notes from './pages/Notes';
import Tasks from './pages/Tasks';
import ImportData from './pages/ImportData';
import AdminLayout from './admin/AdminLayout';
import { API_BASE, apiFetch, clearTokens, getAccessToken, getRefreshToken } from './api/client';
import { getPermissionsForUser } from './admin/permissionsStore';
import { logger } from './utils/logger';
import { LoadingScreen } from './components/LoadingScreen';

const USER_PROFILE_KEY = 'user_profile';
const LOGOUT_ANIMATION_MS = 1200;
const LOGOUT_ROUTE_SETTLE_MS = 300;
const LOGIN_LOADER_MS = 5000;

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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(() => getPermissionsForUser(null));
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [inactiveNotice, setInactiveNotice] = useState(null);
  const [showLoginLoader, setShowLoginLoader] = useState(false);
  const loginLoaderTimerRef = useRef(null);
  const isSigningOutRef = useRef(false);

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
    setUser(userData);
    setPermissions(getPermissionsForUser(userData));
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userData));
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
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(nextUser));
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

    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    logger.info('auth.logout', { reason: 'user' });

    if (refreshToken && accessToken) {
      fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
        keepalive: true,
      }).catch((error) => {
        logger.warn('auth.logout.request_failed', { message: error?.message });
      });
    }

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
