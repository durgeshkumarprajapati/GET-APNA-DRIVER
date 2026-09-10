'use client';

import { useCallback, useRef, useState } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastState {
  message: string;
  tone: ToastTone;
}

const TONE_CLASSES: Record<ToastTone, string> = {
  success: 'border-[#25a475] bg-[#00311f] text-[#68dba9]',
  error: 'border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab]',
  info: 'border-[#262a33] bg-[#181c24] text-[#dfe2ee]',
};

const TONE_ICON: Record<ToastTone, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
};

/**
 * Replaces both `alert(...)` and the several hand-rolled, slightly-different
 * local toast implementations previously copy-pasted across admin/customer
 * pages (own useState + setTimeout + inline fixed div each). One hook, one
 * renderer, reused everywhere a short-lived non-blocking message is needed.
 */
export function useToast(durationMs = 3500) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setToast({ message, tone });
      timeoutRef.current = setTimeout(() => setToast(null), durationMs);
    },
    [durationMs],
  );

  const dismissToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
}

export function ToastViewport({
  toast,
  onDismiss,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
}) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md px-4 sm:px-0">
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-2xl text-sm ${TONE_CLASSES[toast.tone]}`}
      >
        <span className="material-symbols-outlined text-lg shrink-0">{TONE_ICON[toast.tone]}</span>
        <span className="flex-1">{toast.message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 opacity-70 hover:opacity-100"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  );
}
