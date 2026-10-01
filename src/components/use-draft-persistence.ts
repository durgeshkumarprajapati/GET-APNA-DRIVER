'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';

interface StoredDraft<T> {
  savedAt: string;
  data: T;
}

/** A draft older than this is treated as stale and ignored — resuming a
 * multi-day-old half-filled booking form would more likely confuse than help. */
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Dispatched after a same-tab save/clear so useSyncExternalStore re-reads —
// localStorage writes don't fire the native 'storage' event in the tab that
// made the change, only in other tabs.
const DRAFT_EVENT = 'gad:draft-persistence-changed';

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseDraft<T>(raw: string): T | null {
  try {
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (Date.now() - new Date(parsed.savedAt).getTime() > DRAFT_MAX_AGE_MS) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(DRAFT_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(DRAFT_EVENT, callback);
  };
}

/**
 * Resumable-draft primitive for the Phase 87 "resume incomplete bookings"
 * requirement — client-side only (no new backend/DB state), so it's a pure
 * addition that can't affect the actual booking-creation flow.
 *
 * `restoredDraft` is read from localStorage via `useSyncExternalStore`
 * (server snapshot `null`, reconciled with the real value right after
 * hydration) rather than an effect-driven `useState`, since the underlying
 * data genuinely lives outside React. The caller decides whether/how to
 * apply a restored draft — e.g. behind a "Resume?" banner rather than
 * silently overwriting fresh form state. Call `saveDraft` whenever the
 * form's meaningful fields change, and `clearDraft` once the flow completes.
 */
export function useDraftPersistence<T>(key: string) {
  const cacheRef = useRef<{ raw: string | null; parsed: T | null }>({
    raw: undefined as unknown as string | null,
    parsed: null,
  });

  const getSnapshot = useCallback((): T | null => {
    const raw = readRaw(key);
    if (raw !== cacheRef.current.raw) {
      cacheRef.current = { raw, parsed: raw ? parseDraft<T>(raw) : null };
    }
    return cacheRef.current.parsed;
  }, [key]);

  const restoredDraft = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const saveDraft = useCallback(
    (data: T) => {
      try {
        const payload: StoredDraft<T> = { savedAt: new Date().toISOString(), data };
        window.localStorage.setItem(key, JSON.stringify(payload));
      } catch {
        // Private browsing / storage disabled / quota exceeded — the draft
        // simply won't be resumable, which is a no-op degradation, not an error.
      }
      window.dispatchEvent(new Event(DRAFT_EVENT));
    },
    [key],
  );

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // See saveDraft.
    }
    window.dispatchEvent(new Event(DRAFT_EVENT));
  }, [key]);

  return { restoredDraft, saveDraft, clearDraft };
}
