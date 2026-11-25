import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/auth.js';
import settingsService from '../services/settingsService.js';

export const ALLOWED_THEMES = ['dark', 'light', 'system'];
const USER_THEMES_MAP_KEY = 'mm_user_themes';
const USER_KEY = 'mm_auth_user';

const normalizeTheme = (val) => (ALLOWED_THEMES.includes(val) ? val : 'dark');

const isDashboardPath = (path = '') => /^\/(admin|trainer|client|account)(\/|$)/.test(path);

const getSystemTheme = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const readUserThemesMap = () => {
  try {
    const raw = localStorage.getItem(USER_THEMES_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const getUserId = (user) => user?.id || user?._id || null;

const getCachedThemeForUser = (user) => {
  if (!user) return 'dark';
  const dbTheme = user?.preferences?.theme;
  if (ALLOWED_THEMES.includes(dbTheme)) return dbTheme;
  const id = getUserId(user);
  if (id) {
    const map = readUserThemesMap();
    if (ALLOWED_THEMES.includes(map[id])) return map[id];
  }
  return 'dark';
};

const persistCachedThemeForUser = (user, theme) => {
  const validTheme = normalizeTheme(theme);
  const id = getUserId(user);
  if (id) {
    try {
      const map = readUserThemesMap();
      map[id] = validTheme;
      localStorage.setItem(USER_THEMES_MAP_KEY, JSON.stringify(map));
    } catch {
      // ignore storage quota errors
    }
  }

  try {
    const rawUser = localStorage.getItem(USER_KEY);
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      parsed.preferences = { ...(parsed.preferences || {}), theme: validTheme };
      localStorage.setItem(USER_KEY, JSON.stringify(parsed));
    }
  } catch {
    // ignore storage errors
  }
};

const ThemeContext = createContext({
  theme: 'dark',
  resolvedTheme: 'dark',
  systemTheme: 'dark',
  isDashboardRoute: false,
  isSaving: false,
  saveStatus: null,
  error: null,
  setTheme: async () => {},
  setRoutePath: () => {},
  syncFromAuth: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [routePath, setRoutePath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [authUser, setAuthUser] = useState(() => authService.getUser());
  const [theme, setThemeState] = useState(() => getCachedThemeForUser(authService.getUser()));
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [error, setError] = useState(null);

  const isDashboardRoute = isDashboardPath(routePath);
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  // Subscribe to OS color scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Keep DOM attribute synchronized: public pages stay dark, dashboards apply resolvedTheme
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const effective = isDashboardRoute ? resolvedTheme : 'dark';
    root.dataset.theme = effective;
    root.classList.toggle('dark', effective === 'dark');
  }, [isDashboardRoute, resolvedTheme]);

  // Sync from localStorage auth user and remote MongoDB /api/settings
  const syncFromAuth = useCallback(async () => {
    const isAuthed = authService.isAuthenticated();
    const currentUser = authService.getUser();
    setAuthUser(currentUser);

    if (!isAuthed || !currentUser) {
      setThemeState('dark');
      return;
    }

    const initialTheme = getCachedThemeForUser(currentUser);
    setThemeState(initialTheme);
    persistCachedThemeForUser(currentUser, initialTheme);

    try {
      const data = await settingsService.getSettings();
      const serverTheme = normalizeTheme(data?.preferences?.theme);
      setThemeState(serverTheme);
      persistCachedThemeForUser(currentUser, serverTheme);
    } catch {
      // Keep local cached user preference if offline/transient error
    }
  }, []);

  // Re-sync when route enters/switches dashboard or auth changes
  useEffect(() => {
    syncFromAuth();
  }, [routePath, syncFromAuth]);

  useEffect(() => {
    const handleAuthOrStorage = () => {
      syncFromAuth();
    };
    window.addEventListener('mm-auth-changed', handleAuthOrStorage);
    window.addEventListener('storage', handleAuthOrStorage);
    return () => {
      window.removeEventListener('mm-auth-changed', handleAuthOrStorage);
      window.removeEventListener('storage', handleAuthOrStorage);
    };
  }, [syncFromAuth]);

  // Immediate theme update + MongoDB persistence
  const setTheme = useCallback(
    async (nextTheme) => {
      const validTheme = normalizeTheme(nextTheme);
      const previousTheme = theme;
      const currentUser = authService.getUser() || authUser;

      setError(null);
      setSaveStatus(null);
      setThemeState(validTheme);
      if (currentUser) {
        persistCachedThemeForUser(currentUser, validTheme);
      }

      if (!authService.isAuthenticated()) {
        return;
      }

      try {
        setIsSaving(true);
        const res = await settingsService.updateSettings(validTheme);
        const confirmed = normalizeTheme(res?.preferences?.theme || validTheme);
        setThemeState(confirmed);
        if (currentUser) {
          persistCachedThemeForUser(currentUser, confirmed);
        }
        setSaveStatus('Appearance preference saved.');
      } catch (err) {
        // Roll back on persistence failure so UI matches persisted state
        setThemeState(previousTheme);
        if (currentUser) {
          persistCachedThemeForUser(currentUser, previousTheme);
        }
        setError(err.message || 'Unable to save theme preference.');
      } finally {
        setIsSaving(false);
      }
    },
    [theme, authUser]
  );

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      isDashboardRoute,
      isSaving,
      saveStatus,
      error,
      setTheme,
      setRoutePath,
      syncFromAuth,
    }),
    [theme, resolvedTheme, systemTheme, isDashboardRoute, isSaving, saveStatus, error, setTheme, syncFromAuth]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeContext;
