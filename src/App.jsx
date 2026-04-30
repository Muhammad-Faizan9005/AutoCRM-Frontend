import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Deals from './pages/Deals';
import Contacts from './pages/Contacts';
import Organizations from './pages/Organizations';
import Notes from './pages/Notes';
import Tasks from './pages/Tasks';
import ImportData from './pages/ImportData';
import { apiFetch, clearTokens, getAccessToken, getRefreshToken } from './api/client';

const USER_PROFILE_KEY = 'user_profile';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
          localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(me));
        }
      } catch (error) {
        const status = error?.status;

        if (status === 401 || status === 403) {
          clearTokens();
          localStorage.removeItem(USER_PROFILE_KEY);
          if (isMounted) {
            setUser(null);
          }
        } else if (cachedUser) {
          if (isMounted) {
            setUser(cachedUser);
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

  const handleLogin = (userData) => {
    setUser(userData);
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
      // Ignore logout errors and clear local session.
    }

    clearTokens();
    localStorage.removeItem(USER_PROFILE_KEY);
    setUser(null);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // If not logged in, show login page
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // If logged in, show main app with routing
  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar hamesha fixed rahega */}
        <Sidebar onLogout={handleLogout} user={user} />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<Leads user={user} />} />
              <Route path="/deals" element={<Deals user={user} />} />
              <Route path="/contacts" element={<Contacts user={user} />} />
              <Route path="/orgs" element={<Organizations user={user} />} />
              <Route path="/tasks" element={<Notes user={user} />} />
              <Route path="/todo" element={<Tasks user={user} />} />
              <Route
                path="/import"
                element={user?.role === 'admin' ? <ImportData /> : <Navigate to="/" replace />}
              />
              {/* Redirect any unknown route to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;