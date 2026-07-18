/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, createContext, useContext, useCallback } from 'react';

const ThemeContext = createContext({ theme: 'light', setTheme: () => {} });

const THEME_KEY = 'autocrm-theme';

export function ThemeProvider({ children, defaultTheme = 'light' }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return defaultTheme;
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Apply immediately on first render to prevent flash
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) {
      document.documentElement.setAttribute('data-theme', stored);
    }
  }, []);

  const setTheme = useCallback((newTheme) => {
    const normalizedTheme = newTheme === 'dark' ? 'dark' : 'light';
    setThemeState(normalizedTheme);
  }, []);

  const applyTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, applyTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
