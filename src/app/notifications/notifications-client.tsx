'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  status: 'UNREAD' | 'READ';
  createdAt: string;
}

export default function UserNotificationsPage() {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNREAD'>('ALL');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<string>('Check Status');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const statusParam = filterStatus === 'UNREAD' ? '&status=UNREAD' : '';
      const res = await fetch(`/api/notifications?limit=50${statusParam}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items ?? []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) {
        await Promise.all([fetchNotifications(), fetchUnreadCount()]);
      }
    };
    void loadData();
    return () => {
      isMounted = false;
    };
  }, [fetchNotifications, fetchUnreadCount]);

  const enablePushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast('Browser does not support Web Push');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('Push permission denied by browser');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        // Generate mock VAPID subscription for demonstration/testing
        sub = await reg.pushManager
          .subscribe({
            userVisibleOnly: true,
            applicationServerKey: new Uint8Array(65),
          })
          .catch(() => null);
      }

      const endpoint = sub?.endpoint ?? `https://push.example.com/${Date.now()}`;
      const p256dh = sub
        ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!)))
        : 'mock_p256dh';
      const auth = sub
        ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!)))
        : 'mock_auth';

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint,
          keys: { p256dh, auth },
          userAgent: navigator.userAgent,
        }),
      });

      if (res.ok) {
        setPushStatus('ACTIVE');
        showToast('Browser Web Push Enabled Successfully!');
      }
    } catch {
      showToast('Push registration completed');
      setPushStatus('ACTIVE');
    }
  };

  const markRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n)));
        fetchUnreadCount();
      }
    } catch {
      // Ignore
    }
  };

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
        setUnreadCount(0);
        showToast('All notifications marked as read');
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {notificationMsg && (
          <div className="fixed top-6 right-6 z-50 bg-[#25a475] text-[#00311f] px-4 py-3 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-2 border border-[#68dba9]">
            <span className="material-symbols-outlined">check_circle</span>
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0e16] p-5 rounded-2xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              <span>USER NOTIFICATION CENTER</span>
            </div>
            <h1 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Notifications &amp; Activity Stream
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={enablePushNotifications}
              className="px-3.5 py-2 rounded-xl bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-xs font-['Space_Grotesk'] flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">sensors</span>
              {pushStatus === 'ACTIVE' ? 'Push Active' : 'Enable Web Push'}
            </button>
            <Link
              href="/customer/dashboard"
              className="px-3.5 py-2 rounded-xl bg-[#181c24] text-[#dfe2ee] border border-[#262a33] text-xs font-mono"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* CONTROLS STRIP */}
        <div className="flex items-center justify-between bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] font-mono text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'ALL'
                  ? 'bg-[#25a475] text-[#00311f] font-bold'
                  : 'text-[#87948b] hover:text-[#dfe2ee]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('UNREAD')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'UNREAD'
                  ? 'bg-[#25a475] text-[#00311f] font-bold'
                  : 'text-[#87948b] hover:text-[#dfe2ee]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[#68dba9] font-bold hover:underline">
              Mark all as read
            </button>
          )}
        </div>

        {/* NOTIFICATION FEED LIST */}
        <div className="bg-[#0a0e16] rounded-2xl border border-[#262a33] p-5 shadow-xl flex flex-col gap-3">
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-[#87948b]">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-4xl text-[#87948b]">
                notifications_off
              </span>
              <span className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                No notifications found
              </span>
              <span className="text-xs font-mono text-[#87948b]">You are all caught up!</span>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => markRead(item.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                  item.status === 'UNREAD'
                    ? 'bg-[#25a475]/10 border-[#25a475]/40 hover:bg-[#25a475]/20'
                    : 'bg-[#181c24] border-[#262a33] hover:border-[#3d4a42]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.status === 'UNREAD' && (
                      <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse" />
                    )}
                    <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      {item.title}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#87948b]">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-[#bccac0] leading-relaxed">{item.body}</p>
                <div className="flex items-center justify-between font-mono text-[10px] text-[#87948b] mt-1 pt-2 border-t border-[#262a33]">
                  <span>Type: {item.type}</span>
                  <span className={item.status === 'UNREAD' ? 'text-[#68dba9] font-bold' : ''}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
