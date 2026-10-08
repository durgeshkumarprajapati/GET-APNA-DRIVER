'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/i18n/context';
import { formatLanguagesList } from '@/shared/constants/languages';
import { useRealTimeStream } from '@/components/use-realtime-stream';
import { useMultiTabSync } from '@/components/use-multi-tab-sync';

export interface BookingMessage {
  id: string;
  bookingId: string;
  senderUserId: string;
  senderRole: 'CUSTOMER' | 'DRIVER' | 'SYSTEM';
  messageType: 'TEXT' | 'QUICK_REPLY' | 'SYSTEM';
  body: string;
  readAt: string | null;
  createdAt: string;
}

function generateIdempotencyKey(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export interface BookingMessagePanelProps {
  /** Which side this viewer is on — used to align "me" vs "them" bubbles. */
  viewerRole: 'CUSTOMER' | 'DRIVER';
  /** e.g. '/api/customer/bookings/:id/messages' or '/api/driver/bookings/:id/messages' */
  apiBasePath: string;
  title?: string;
  bookingStatus?: string;
  maskedCallPhone?: string | null;
}

export function BookingMessagePanel({
  viewerRole,
  apiBasePath,
  title,
  bookingStatus,
  maskedCallPhone: _maskedCallPhone,
}: BookingMessagePanelProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canCommunicate, setCanCommunicate] = useState<{ allowed: boolean; reason?: string }>({
    allowed: true,
  });
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [driverLangs, setDriverLangs] = useState<string[]>([]);
  const [customerLangs, setCustomerLangs] = useState<string[]>([]);
  const [calling, setCalling] = useState(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  // Holds the latest `fetchMessages` so the multi-tab sync callback below
  // (registered before `fetchMessages` exists) can call it without a
  // forward reference — that would break the React Compiler's static
  // dependency analysis even though it's safe at runtime via closures.
  const fetchMessagesRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const bookingId = apiBasePath.match(/\/bookings\/([^\/]+)/)?.[1] ?? null;

  // Smart Contextual Quick Replies based on Lifecycle State
  const customerQuickReplies =
    bookingStatus === 'DRIVER_ARRIVED'
      ? [
          t('booking.communication.custWait5Min', { defaultValue: 'Please wait 5 minutes.' }),
          t('booking.communication.custWaitingReception', {
            defaultValue: 'I am waiting near the reception.',
          }),
          t('booking.communication.custWearingBlueShirt', {
            defaultValue: 'I am wearing a blue shirt.',
          }),
          t('booking.communication.custPickupLocation', {
            defaultValue: 'I am at the pickup location.',
          }),
        ]
      : [
          t('booking.communication.custPickupLocation', {
            defaultValue: 'I am at the pickup location.',
          }),
          t('booking.communication.custPleaseCall', { defaultValue: 'Please call me.' }),
          t('booking.communication.custNearMainGate', { defaultValue: 'I am near the main gate.' }),
          t('booking.communication.custWait5Min', { defaultValue: 'Please wait 5 minutes.' }),
          t('booking.communication.custCannotFindPickup', {
            defaultValue: 'I cannot find the pickup point.',
          }),
          t('booking.communication.custCheckInstructions', {
            defaultValue: 'Please check the pickup instructions.',
          }),
        ];

  const driverQuickReplies =
    bookingStatus === 'DRIVER_ARRIVED'
      ? [
          t('booking.communication.driverArrived', {
            defaultValue: 'I have arrived at the pickup point.',
          }),
          t('booking.communication.driverPleaseCome', {
            defaultValue: 'Please come to the pickup location.',
          }),
          t('booking.communication.driverWaitingGate', {
            defaultValue: 'I am waiting near the gate.',
          }),
        ]
      : [
          t('booking.communication.driverOnWay', { defaultValue: 'I am on my way.' }),
          t('booking.communication.driverArrived', {
            defaultValue: 'I have arrived at the pickup point.',
          }),
          t('booking.communication.driverPleaseCall', { defaultValue: 'Please call me.' }),
          t('booking.communication.driverCannotLocate', {
            defaultValue: 'I cannot locate the pickup point.',
          }),
        ];

  const quickReplies = viewerRole === 'CUSTOMER' ? customerQuickReplies : driverQuickReplies;

  // Multi-tab sync hook
  const { broadcast } = useMultiTabSync(bookingId, (event) => {
    if (event.type === 'MESSAGES_READ') {
      setUnreadCount(0);
    } else if (event.type === 'MESSAGE_SENT') {
      void fetchMessagesRef.current();
    }
  });

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(apiBasePath);
      if (res.ok) {
        const data = await res.json();
        // Merge without duplicates
        setMessages(data.messages ?? []);
        setUnreadCount(data.unreadCount ?? 0);
        if (data.canCommunicate) {
          setCanCommunicate(data.canCommunicate);
        }
        if (data.driverLanguagesSpoken) setDriverLangs(data.driverLanguagesSpoken);
        if (data.customerLanguagesSpoken) setCustomerLangs(data.customerLanguagesSpoken);
        setError(null);

        // Mark incoming messages read if unread count > 0
        if (data.unreadCount > 0) {
          void fetch(`${apiBasePath}/read`, { method: 'POST' }).then(() => {
            broadcast('MESSAGES_READ');
          });
        }
      }
    } catch {
      // Silent fallback
    } finally {
      setLoading(false);
    }
  }, [apiBasePath, broadcast]);

  useEffect(() => {
    fetchMessagesRef.current = fetchMessages;
  }, [fetchMessages]);

  // Realtime stream with exponential backoff & event deduplication
  const { connectionState, forceReconnect } = useRealTimeStream({
    bookingId,
    enabled: !!bookingId,
    onBookingUpdate: () => {
      void fetchMessages();
    },
    onReconcile: () => {
      void fetchMessages();
    },
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (isMounted) await fetchMessages();
    })();
    // Fallback polling interval (10s) only if SSE is disconnected
    const interval = setInterval(() => {
      if (isMounted && connectionState !== 'CONNECTED') {
        void fetchMessages();
      }
    }, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchMessages, connectionState]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleSend = async (textToSend?: string, type: 'TEXT' | 'QUICK_REPLY' = 'TEXT') => {
    const body = (textToSend ?? draft).trim();
    if (!body || sending || !canCommunicate.allowed) return;

    setSending(true);
    setError(null);

    // Client-generated idempotency key
    const idempotencyKey = generateIdempotencyKey();

    try {
      const res = await fetch(apiBasePath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, messageType: type, idempotencyKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send message.');
      }
      if (!textToSend) setDraft('');

      setMessages((prev) => {
        // Prevent duplicate appending
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });

      broadcast('MESSAGE_SENT');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleCall = async () => {
    const callUrl = apiBasePath.replace(/\/messages$/, '/call-driver');
    const driverCallUrl = apiBasePath.replace(/\/messages$/, '/call-customer');
    const targetUrl = viewerRole === 'CUSTOMER' ? callUrl : driverCallUrl;

    setCalling(true);
    try {
      const res = await fetch(targetUrl, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to initiate call.');
      }
      if (data.callUrl) {
        window.location.href = data.callUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not initiate masked telephony call.');
    } finally {
      setCalling(false);
    }
  };

  return (
    <div className="rounded-2xl bg-surface-container border border-border flex flex-col overflow-hidden shadow-xl">
      {/* Realtime Connection Status Banner */}
      {connectionState !== 'CONNECTED' && (
        <div
          className={`px-4 py-1.5 text-[11px] font-mono flex items-center justify-between transition-colors ${
            connectionState === 'RECONNECTING'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-b border-amber-500/30'
              : connectionState === 'FAILED'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-b border-rose-500/30'
                : 'bg-surface-container-high text-on-surface-variant border-b border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>
              {connectionState === 'RECONNECTING'
                ? 'Reconnecting to live channel…'
                : connectionState === 'FAILED'
                  ? 'Connection interrupted.'
                  : 'Connecting stream…'}
            </span>
          </div>
          {connectionState === 'FAILED' && (
            <button
              type="button"
              onClick={forceReconnect}
              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 border border-rose-500 text-[10px] font-bold text-white transition-colors"
            >
              Retry Connection
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3.5 bg-surface-container-high border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <span className="material-symbols-outlined text-lg">forum</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                {title || t('booking.communication.panelTitle')}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950">
                  {unreadCount} new
                </span>
              )}
            </div>
            {bookingStatus && (
              <p className="text-[11px] text-on-surface-variant">
                Status:{' '}
                <span className="text-on-surface font-medium">
                  {bookingStatus.replace(/_/g, ' ')}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Masked Call Shortcut */}
        <button
          type="button"
          onClick={() => void handleCall()}
          disabled={calling || !canCommunicate.allowed}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-highest hover:bg-surface-container disabled:opacity-40 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-border transition-colors min-h-[36px]"
          title="Call via Secure Masked Telephony"
        >
          <span className="material-symbols-outlined text-base">call</span>
          <span>
            {viewerRole === 'CUSTOMER'
              ? t('booking.communication.callDriver')
              : t('booking.communication.callCustomer')}
          </span>
        </button>
      </div>

      {/* Spoken Languages Compatibility Bar */}
      {(driverLangs.length > 0 || customerLangs.length > 0) && (
        <div className="px-4 py-2 bg-surface-container-highest/80 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <span className="material-symbols-outlined text-sm text-emerald-600 dark:text-emerald-400">translate</span>
            <span className="font-semibold text-on-surface">
              {t('booking.communication.spokenLanguages')}:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {driverLangs.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-surface-container border border-border text-on-surface-variant">
                👨‍✈️ {t('booking.communication.driverLanguages')}: {formatLanguagesList(driverLangs)}
              </span>
            )}
            {customerLangs.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-surface-container border border-border text-on-surface-variant">
                👤 {t('booking.communication.customerLanguages')}:{' '}
                {formatLanguagesList(customerLangs)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Message Timeline */}
      <div className="flex flex-col gap-3 p-4 min-h-[220px] max-h-[320px] overflow-y-auto bg-surface-container-high/40">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-xs text-on-surface-variant gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Loading service communication…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2">
              chat_bubble_outline
            </span>
            <p className="text-xs font-medium text-on-surface-variant">
              {t('booking.communication.panelTitle')}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-1 max-w-xs">
              {t('booking.communication.panelSubtitle')}
            </p>
          </div>
        ) : (
          messages.map((m) => {
            if (m.senderRole === 'SYSTEM' || m.messageType === 'SYSTEM') {
              return (
                <div key={m.id} className="flex justify-center my-1">
                  <div className="bg-surface-container-high border border-border rounded-full px-3 py-1 text-[11px] text-on-surface font-medium text-center shadow-sm">
                    ⚡ {m.body}
                  </div>
                </div>
              );
            }

            const isMe = m.senderRole === viewerRole;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${
                  isMe ? 'self-end' : 'self-start'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-semibold text-on-surface-variant">
                    {isMe ? 'You' : m.senderRole === 'CUSTOMER' ? 'Customer' : 'Driver'}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div
                  className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-none font-medium'
                      : 'bg-surface-container-high text-on-surface rounded-bl-none border border-border'
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Quick Reply Chips */}
      {canCommunicate.allowed && (
        <div className="px-3 py-2 bg-surface-container border-t border-border flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant whitespace-nowrap mr-1">
            {t('booking.communication.quickHeader')}:
          </span>
          {quickReplies.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => void handleSend(text, 'QUICK_REPLY')}
              disabled={sending}
              className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest border border-border text-[11px] text-on-surface-variant hover:text-on-surface whitespace-nowrap transition-colors disabled:opacity-50 min-h-[32px]"
            >
              {text}
            </button>
          ))}
        </div>
      )}

      {/* Error Message & Retry Banner */}
      {error && (
        <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void handleSend()}
            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-[10px] font-bold text-white transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Message Input Box */}
      <div className="p-3 bg-surface-container border-t border-border">
        {!canCommunicate.allowed ? (
          <div className="px-3 py-2 rounded-xl bg-surface-container-high border border-border text-on-surface-variant text-xs text-center font-medium">
            🔒 {canCommunicate.reason || 'Communication closed for this booking status.'}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message driver..."
              disabled={sending}
              maxLength={500}
              className="flex-1 px-3.5 py-2 rounded-xl bg-surface-container-high border border-border text-on-surface placeholder-on-surface-variant text-xs focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 transition-all disabled:opacity-50 min-h-[40px]"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0 font-bold"
            >
              {sending ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-lg">send</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
