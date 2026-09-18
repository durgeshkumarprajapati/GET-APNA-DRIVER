'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface BookingMessage {
  id: string;
  senderUserId: string;
  senderRole: 'CUSTOMER' | 'DRIVER';
  body: string;
  createdAt: string;
}

interface BookingMessagePanelProps {
  /** Which side this viewer is on — used only to align "me" vs "them" bubbles. */
  viewerRole: 'CUSTOMER' | 'DRIVER';
  /** e.g. '/api/customer/bookings/:id/messages' or '/api/driver/bookings/:id/messages' */
  apiBasePath: string;
  title?: string;
}

/**
 * Minimal text-message thread between a booking's customer and its
 * assigned/offered driver. Polls for new messages every 5s while mounted —
 * matches the existing driver assignment-offers page's own polling cadence,
 * good enough for a two-person, low-volume thread without adding a new
 * real-time transport.
 */
export function BookingMessagePanel({
  viewerRole,
  apiBasePath,
  title = 'Messages',
}: BookingMessagePanelProps) {
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(apiBasePath);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
        setError(null);
      }
    } catch {
      // Silent — the panel just keeps showing the last-known messages.
    } finally {
      setLoading(false);
    }
  }, [apiBasePath]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (isMounted) await fetchMessages();
    })();
    const interval = setInterval(() => {
      if (isMounted) void fetchMessages();
    }, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchMessages]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(apiBasePath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send message.');
      }
      setDraft('');
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-700/60 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/60 flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400 text-lg">chat</span>
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</span>
      </div>

      <div className="flex flex-col gap-2 p-4 max-h-72 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-slate-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-slate-500">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => {
            const isMine = m.senderRole === viewerRole;
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    isMine
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-100 border border-slate-700'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={`text-[10px] mt-1 ${isMine ? 'text-emerald-100/80' : 'text-slate-400'}`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {error && <p className="px-4 text-xs text-red-400 pb-1">{error}</p>}

      <div className="p-3 border-t border-slate-700/60 flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Type a message…"
          className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !draft.trim()}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
