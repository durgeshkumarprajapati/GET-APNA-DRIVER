'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeMode = 'LIGHT' | 'DARK' | 'SYSTEM';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_COOKIE_NAME = 'theme_preference';
export const THEME_STORAGE_KEY = 'gad_theme_preference';

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeMode;
}

export function ThemeProvider({ children, initialTheme = 'LIGHT' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');


  // Load stored theme preference on mount
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored && ['LIGHT', 'DARK', 'SYSTEM'].includes(stored)) {
      setThemeState(stored);
    }
  }, []);

  // Update DOM classes and resolve theme
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (mode: ThemeMode) => {
      let active: 'light' | 'dark' = 'dark';
      if (mode === 'SYSTEM') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        active = systemDark ? 'dark' : 'light';
      } else {
        active = mode === 'DARK' ? 'dark' : 'light';
      }

      setResolvedTheme(active);

      if (active === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);

    if (theme === 'SYSTEM') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('SYSTEM');
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
    return undefined;
  }, [theme]);


  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    document.cookie = `${THEME_COOKIE_NAME}=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;

    // Fire non-blocking profile preference sync if user is logged in
    fetch('/api/customer/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback if called outside provider
    return {
      theme: 'DARK' as ThemeMode,
      resolvedTheme: 'dark' as const,
      setTheme: () => {},
    };
  }
  return context;
}
