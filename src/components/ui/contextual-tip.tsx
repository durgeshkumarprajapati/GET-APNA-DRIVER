'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

const DISMISSED_KEY_PREFIX = 'gad.contextual-tip.dismissed.';
// Dispatched after a same-tab dismissal so useSyncExternalStore re-reads —
// localStorage.setItem doesn't fire the native 'storage' event in the tab
// that made the change, only in other tabs.
const DISMISS_EVENT = 'gad:contextual-tip-dismissed';

function getSnapshot(id: string): boolean {
  try {
    return window.localStorage.getItem(`${DISMISSED_KEY_PREFIX}${id}`) === '1';
  } catch {
    return false;
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(DISMISS_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(DISMISS_EVENT, callback);
  };
}

function markDismissed(id: string): void {
  try {
    window.localStorage.setItem(`${DISMISSED_KEY_PREFIX}${id}`, '1');
  } catch {
    // Private browsing / storage disabled — the tip will just reappear next
    // visit, which is harmless.
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

interface ContextualTipProps {
  /** Stable, unique id — used as the localStorage key, so changing it makes a tip reappear. */
  id: string;
  icon?: string;
  children: ReactNode;
  className?: string;
}

/**
 * A short, dismiss-once hint — the "contextual tips instead of lengthy
 * tutorials" primitive from the Phase 87 spec. Dismissal state lives in
 * localStorage (external to React), read via `useSyncExternalStore` rather
 * than an effect-driven `mounted` flag — the server snapshot is always
 * "not dismissed", and React reconciles with the real client value right
 * after hydration, which is exactly the SSR-safe behavior a mount-gated
 * `useState` was working around, without the synchronous setState-in-effect
 * React's own lint rules flag that pattern for.
 */
export function ContextualTip({
  id,
  icon = 'lightbulb',
  children,
  className = '',
}: ContextualTipProps) {
  const dismissed = useSyncExternalStore(
    subscribe,
    () => getSnapshot(id),
    () => false,
  );

  if (dismissed) return null;

  return (
    <div
      className={`rounded-xl border border-[#68dba9]/30 bg-[#003825]/30 p-3 flex items-start gap-2.5 text-xs ${className}`}
    >
      <span
        className="material-symbols-outlined text-base text-[#68dba9] shrink-0"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-[#dfe2ee] leading-relaxed">{children}</div>
      <button
        type="button"
        onClick={() => markDismissed(id)}
        aria-label="Dismiss tip"
        className="shrink-0 -m-1.5 p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center text-[#87948b] hover:text-[#dfe2ee] rounded-lg hover:bg-white/10 transition-colors"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}
