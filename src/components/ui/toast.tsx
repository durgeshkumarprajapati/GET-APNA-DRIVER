'use client';

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { useTranslation } from '@/i18n/context';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  tone: ToastTone;
  durationMs?: number;
}

export interface ToastContextType {
  showToast: (message: string, tone?: ToastTone, title?: string, durationMs?: number) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  dismissToast: (id?: string) => void;
  activeToast: ToastItem | null;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Global event bus for non-react or outside-context callers
type GlobalToastListener = (item: ToastItem) => void;
const globalListeners: Set<GlobalToastListener> = new Set();

export const toast = {
  success: (message: string, title = 'Success') => {
    emitGlobalToast({ id: Math.random().toString(), message, title, tone: 'success' });
  },
  error: (message: string, title = 'Error') => {
    emitGlobalToast({ id: Math.random().toString(), message, title, tone: 'error' });
  },
  info: (message: string, title = 'Information') => {
    emitGlobalToast({ id: Math.random().toString(), message, title, tone: 'info' });
  },
  warning: (message: string, title = 'Warning') => {
    emitGlobalToast({ id: Math.random().toString(), message, title, tone: 'warning' });
  },
};

function emitGlobalToast(item: ToastItem) {
  globalListeners.forEach((listener) => listener(item));
}

const TONE_CONFIG: Record<
  ToastTone,
  {
    badgeBg: string;
    badgeText: string;
    border: string;
    icon: string;
    glow: string;
    titleColor: string;
    barColor: string;
  }
> = {
  success: {
    badgeBg: 'bg-[#003825]',
    badgeText: 'text-[#68dba9]',
    border: 'border-[#25a475]/40',
    icon: 'check_circle',
    glow: 'shadow-[0_8px_32px_rgba(37,164,117,0.25)]',
    titleColor: 'text-[#68dba9]',
    barColor: 'bg-[#25a475]',
  },
  error: {
    badgeBg: 'bg-[#4c0519]',
    badgeText: 'text-[#fda4af]',
    border: 'border-[#f43f5e]/40',
    icon: 'error',
    glow: 'shadow-[0_8px_32px_rgba(244,63,94,0.3)]',
    titleColor: 'text-[#fda4af]',
    barColor: 'bg-[#f43f5e]',
  },
  info: {
    badgeBg: 'bg-[#0c4a6e]',
    badgeText: 'text-[#38bdf8]',
    border: 'border-[#0284c7]/40',
    icon: 'info',
    glow: 'shadow-[0_8px_32px_rgba(56,189,248,0.25)]',
    titleColor: 'text-[#38bdf8]',
    barColor: 'bg-[#0284c7]',
  },
  warning: {
    badgeBg: 'bg-[#451a03]',
    badgeText: 'text-[#fcd34d]',
    border: 'border-[#d97706]/40',
    icon: 'warning',
    glow: 'shadow-[0_8px_32px_rgba(245,158,11,0.25)]',
    titleColor: 'text-[#fcd34d]',
    barColor: 'bg-[#d97706]',
  },
};

/** Cap on simultaneously visible toasts — oldest is dropped rather than
 * letting an unbounded queue build up or overflow the viewport. */
const MAX_VISIBLE_TOASTS = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id?: string) => {
    setToasts((prev) => {
      if (!id) {
        // No id given: dismiss the oldest (first-shown) toast, matching the
        // single-active-toast API's original "dismiss the current one" intent.
        const target = prev[0];
        if (!target) return prev;
        const t = timeoutsRef.current.get(target.id);
        if (t) clearTimeout(t);
        timeoutsRef.current.delete(target.id);
        return prev.filter((toastItem) => toastItem.id !== target.id);
      }
      const t = timeoutsRef.current.get(id);
      if (t) clearTimeout(t);
      timeoutsRef.current.delete(id);
      return prev.filter((toastItem) => toastItem.id !== id);
    });
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'info', title?: string, durationMs = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const item: ToastItem = { id, message, tone, title, durationMs };
      setToasts((prev) => {
        // Each toast is independently timed and dismissed — a new one never
        // cancels an earlier one still waiting to be read, it just stacks
        // above it (capped at MAX_VISIBLE_TOASTS so the viewport never
        // overflows with a long backlog).
        const next = [...prev, item];
        return next.length > MAX_VISIBLE_TOASTS
          ? next.slice(next.length - MAX_VISIBLE_TOASTS)
          : next;
      });
      const timeoutId = setTimeout(() => dismissToast(id), durationMs);
      timeoutsRef.current.set(id, timeoutId);
    },
    [dismissToast],
  );

  const showSuccess = useCallback(
    (message: string, title?: string) => showToast(message, 'success', title),
    [showToast],
  );
  const showError = useCallback(
    (message: string, title?: string) => showToast(message, 'error', title),
    [showToast],
  );
  const showInfo = useCallback(
    (message: string, title?: string) => showToast(message, 'info', title),
    [showToast],
  );
  const showWarning = useCallback(
    (message: string, title?: string) => showToast(message, 'warning', title),
    [showToast],
  );

  useEffect(() => {
    const handleGlobal = (item: ToastItem) => {
      showToast(item.message, item.tone, item.title, item.durationMs);
    };
    globalListeners.add(handleGlobal);
    return () => {
      globalListeners.delete(handleGlobal);
    };
  }, [showToast]);

  // Clear any pending timers on unmount so a dismiss never fires against an
  // unmounted provider.
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((t) => clearTimeout(t));
      timeouts.clear();
    };
  }, []);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        dismissToast,
        activeToast: toasts[0] ?? null,
      }}
    >
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

/**
 * Universal hook for accessing Toast controls in any component.
 * Fallback to standalone mode if called outside ToastProvider.
 */
export function useToast(durationMs = 4000) {
  const ctx = useContext(ToastContext);
  const [localToast, setLocalToast] = useState<ToastItem | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const localDismiss = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLocalToast(null);
  }, []);

  const localShow = useCallback(
    (message: string, tone: ToastTone = 'info', title?: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const item: ToastItem = {
        id: Math.random().toString(),
        message,
        tone,
        title,
        durationMs,
      };
      setLocalToast(item);
      timeoutRef.current = setTimeout(() => setLocalToast(null), durationMs);
    },
    [durationMs],
  );

  if (ctx) {
    return {
      toast: ctx.activeToast
        ? { message: ctx.activeToast.message, tone: ctx.activeToast.tone }
        : null,
      showToast: (msg: string, tone: ToastTone = 'info') => ctx.showToast(msg, tone),
      showSuccess: ctx.showSuccess,
      showError: ctx.showError,
      showInfo: ctx.showInfo,
      showWarning: ctx.showWarning,
      dismissToast: ctx.dismissToast,
    };
  }

  return {
    toast: localToast ? { message: localToast.message, tone: localToast.tone } : null,
    showToast: localShow,
    showSuccess: (msg: string, title?: string) => localShow(msg, 'success', title),
    showError: (msg: string, title?: string) => localShow(msg, 'error', title),
    showInfo: (msg: string, title?: string) => localShow(msg, 'info', title),
    showWarning: (msg: string, title?: string) => localShow(msg, 'warning', title),
    dismissToast: localDismiss,
  };
}

/**
 * The visual toast card itself — shared by the single-toast `ToastViewport`
 * (standalone `useToast()` mode, used by pages not wrapped in a
 * `ToastProvider`) and the stacking `ToastStack` (provider mode), so both
 * render identically and pick up motion/fix updates together.
 */
function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem | { message: string; tone: ToastTone };
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const tone = item.tone || 'info';
  const config = TONE_CONFIG[tone] || TONE_CONFIG.info;
  const title = 'title' in item && item.title ? item.title : null;
  const durationMs = 'durationMs' in item && item.durationMs ? item.durationMs : 4000;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative overflow-hidden rounded-2xl bg-[#0d121d]/95 backdrop-blur-xl border ${config.border} ${config.glow} p-4 text-sm flex items-start gap-3.5 animate-[toast-in_0.25s_ease-out_both]`}
    >
      {/* Glowing tone indicator icon */}
      <div
        className={`w-9 h-9 rounded-xl ${config.badgeBg} ${config.badgeText} flex items-center justify-center shrink-0 border border-white/10 shadow-inner mt-0.5`}
      >
        <span className="material-symbols-outlined text-xl">{config.icon}</span>
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0 pr-2">
        {title && (
          <h4
            className={`text-xs font-bold uppercase tracking-wider ${config.titleColor} font-mono mb-0.5`}
          >
            {title}
          </h4>
        )}
        <p className="text-xs sm:text-sm text-[#dfe2ee] font-medium leading-relaxed break-words">
          {item.message}
        </p>
      </div>

      {/* Close Button — minimum 44px hit area even though the visible icon is smaller */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('common.labels.dismiss', { defaultValue: 'Dismiss' })}
        className="shrink-0 -m-1.5 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#87948b] hover:text-[#dfe2ee] rounded-lg hover:bg-white/10 transition-colors"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>

      {/* Animated Countdown Bar — shrinks over the toast's real auto-dismiss
          duration, whatever it was called with, not a hardcoded 4s. */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden">
        <div
          className={`h-full w-full origin-left ${config.barColor} animate-toast-progress`}
          style={{ animationDuration: `${durationMs}ms` }}
        />
      </div>
    </div>
  );
}

export function ToastViewport({
  toast: item,
  onDismiss,
}: {
  toast: ToastItem | { message: string; tone: ToastTone } | null;
  onDismiss: () => void;
}) {
  if (!item) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md px-4 sm:px-0 pointer-events-none">
      <div className="pointer-events-auto">
        <ToastCard item={item} onDismiss={onDismiss} />
      </div>
    </div>
  );
}

/**
 * Stacked variant used by `ToastProvider` — renders every currently-active
 * toast (capped at MAX_VISIBLE_TOASTS), newest at the bottom, each with its
 * own independent auto-dismiss timer. `motion-reduce`/prefers-reduced-motion
 * handling is global (see globals.css), not per-component.
 */
function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md px-4 sm:px-0 flex flex-col gap-2 pointer-events-none">
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastCard item={item} onDismiss={() => onDismiss(item.id)} />
        </div>
      ))}
    </div>
  );
}
