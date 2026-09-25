'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/i18n/context';
import { formatLanguagesList } from '@/shared/constants/languages';

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

  const customerQuickReplies = [
    t('booking.communication.custPickupLocation', { defaultValue: 'I am at the pickup location.' }),
    t('booking.communication.custPleaseCall', { defaultValue: 'Please call me.' }),
    t('booking.communication.custNearMainGate', { defaultValue: 'I am near the main gate.' }),
    t('booking.communication.custWait5Min', { defaultValue: 'Please wait 5 minutes.' }),
    t('booking.communication.custCannotFindPickup', { defaultValue: 'I cannot find the pickup point.' }),
    t('booking.communication.custCheckInstructions', { defaultValue: 'Please check the pickup instructions.' }),
    t('booking.communication.custWaitingReception', { defaultValue: 'I am waiting near the reception.' }),
    t('booking.communication.custWearingBlueShirt', { defaultValue: 'I am wearing a blue shirt.' }),
  ];

  const driverQuickReplies = [
    t('booking.communication.driverOnWay', { defaultValue: 'I am on my way.' }),
    t('booking.communication.driverArrived', { defaultValue: 'I have arrived at the pickup point.' }),
    t('booking.communication.driverPleaseCome', { defaultValue: 'Please come to the pickup location.' }),
    t('booking.communication.driverWaitingGate', { defaultValue: 'I am waiting near the gate.' }),
    t('booking.communication.driverPleaseCall', { defaultValue: 'Please call me.' }),
    t('booking.communication.driverCannotLocate', { defaultValue: 'I cannot locate the pickup point.' }),
  ];

  const quickReplies = viewerRole === 'CUSTOMER' ? customerQuickReplies : driverQuickReplies;

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(apiBasePath);
      if (res.ok) {
        const data = await res.json();
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
          void fetch(`${apiBasePath}/read`, { method: 'POST' });
        }
      }
    } catch {
      // Silent error fallback
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
    }, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchMessages]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleSend = async (textToSend?: string, type: 'TEXT' | 'QUICK_REPLY' = 'TEXT') => {
    const body = (textToSend ?? draft).trim();
    if (!body || sending || !canCommunicate.allowed) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(apiBasePath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, messageType: type }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send message.');
      }
      if (!textToSend) setDraft('');
      setMessages((prev) => [...prev, data.message]);
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
        throw new Error(data.message || 'Call connection failed.');
      }
      alert(`Masked call initiated: ${data.maskedNumber || 'Connecting...'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Call connection failed.');
    } finally {
      setCalling(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-lg">forum</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                {title || t('booking.communication.panelTitle')}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950">
                  {unreadCount} new
                </span>
              )}
            </div>
            {bookingStatus && (
              <p className="text-[11px] text-slate-400">
                Status:{' '}
                <span className="text-slate-300 font-medium">
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-emerald-400 text-xs font-medium border border-slate-700/60 transition-colors min-h-[36px]"
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
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="material-symbols-outlined text-sm text-emerald-400">translate</span>
            <span className="font-semibold text-slate-200">
              {t('booking.communication.spokenLanguages')}:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {driverLangs.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-slate-300">
                👨‍✈️ {t('booking.communication.driverLanguages')}: {formatLanguagesList(driverLangs)}
              </span>
            )}
            {customerLangs.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-slate-300">
                👤 {t('booking.communication.customerLanguages')}: {formatLanguagesList(customerLangs)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Message Timeline */}
      <div className="flex flex-col gap-3 p-4 min-h-[220px] max-h-[320px] overflow-y-auto bg-slate-950/40">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-xs text-slate-500 gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Loading service communication…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">
              chat_bubble_outline
            </span>
            <p className="text-xs font-medium text-slate-400">
              {t('booking.communication.panelTitle')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              {t('booking.communication.panelSubtitle')}
            </p>
          </div>
        ) : (
          messages.map((m) => {
            if (m.senderRole === 'SYSTEM' || m.messageType === 'SYSTEM') {
              return (
                <div key={m.id} className="flex justify-center my-1">
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-full px-3 py-1 text-[11px] text-slate-300 font-medium text-center shadow-sm">
                    ⚡ {m.body}
                  </div>
                </div>
              );
            }

            const isMine = m.senderRole === viewerRole;
            const isRead = !!m.readAt;

            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs ${
                    isMine
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                  <div
                    className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                      isMine ? 'text-emerald-100/75' : 'text-slate-400'
                    }`}
                  >
                    <span>
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isMine && (
                      <span
                        className={isRead ? 'text-emerald-200 font-bold' : 'text-emerald-300/60'}
                      >
                        {isRead ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Quick Reply Chips */}
      {canCommunicate.allowed && (
        <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap mr-1">
            {t('booking.communication.quickHeader')}:
          </span>
          {quickReplies.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => void handleSend(text, 'QUICK_REPLY')}
              disabled={sending}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition-colors disabled:opacity-50 min-h-[32px]"
            >
              {text}
            </button>
          ))}
        </div>
      )}

      {/* Closed State Banner */}
      {!canCommunicate.allowed && (
        <div className="px-4 py-2.5 bg-slate-800/60 border-t border-slate-800 text-center text-xs text-slate-400">
          🔒 {canCommunicate.reason || 'Communication is closed for this service.'}
        </div>
      )}

      {/* Input Composer */}
      {canCommunicate.allowed && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <div className="flex items-center gap-2">
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
              placeholder={t('booking.communication.messagePlaceholder', {
                defaultValue: `Message ${viewerRole === 'CUSTOMER' ? 'driver' : 'customer'}…`,
              })}
              maxLength={500}
              className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/80 min-h-[44px]"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !draft.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors flex items-center justify-center min-h-[44px] min-w-[48px]"
            >
              {sending ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-base">send</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
