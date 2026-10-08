'use client';

import { useTheme, ThemeMode } from '../theme-provider';


interface ThemeToggleProps {
  variant?: 'compact' | 'expanded';
  className?: string;
}

export function ThemeToggle({ variant = 'compact', className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (variant === 'expanded') {
    const modes: { key: ThemeMode; label: string; icon: string }[] = [
      { key: 'LIGHT', label: 'Light', icon: 'light_mode' },
      { key: 'DARK', label: 'Dark', icon: 'dark_mode' },
      { key: 'SYSTEM', label: 'System', icon: 'desktop_windows' },
    ];

    return (
      <div className={`flex items-center gap-1 p-1 rounded-xl bg-surface-container border border-border ${className}`}>
        {modes.map((m) => {
          const isActive = theme === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setTheme(m.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact variant (1-tap toggle button)
  const isDark = theme === 'DARK';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'LIGHT' : 'DARK')}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      className={`p-2 rounded-lg bg-surface-container border border-border text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors ${className}`}
    >
      <span className="material-symbols-outlined text-lg block">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
}
