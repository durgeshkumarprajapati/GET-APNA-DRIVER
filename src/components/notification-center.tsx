'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  status: 'UNREAD' | 'READ';
  createdAt: string;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadUnreadCount = async () => {
      try {
        const res = await fetch('/api/notifications/unread-count');
        if (res.ok && isMounted) {
          const data = await res.json();
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {
        // Ignore network fallback
      }
    };

    void loadUnreadCount();
    const interval = setInterval(() => {
      void loadUnreadCount();
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const fetchRecentNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=5');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items ?? []);
      }
    } catch {
      // Ignore network fallback
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      void fetchRecentNotifications();
    }
    setIsOpen(!isOpen);
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n)));
        setUnreadCount((count) => Math.max(0, count - 1));
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
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-xl bg-[#181c24] hover:bg-[#262a33] border border-[#262a33] text-[#bccac0] hover:text-[#dfe2ee] transition-colors"
        title="Notifications"
        type="button"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#93000a] text-[#ffdad6] font-mono text-[10px] font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#0a0e16] border border-[#262a33] shadow-2xl z-50 overflow-hidden font-sans">
          <div className="p-3 border-b border-[#262a33] flex items-center justify-between bg-[#181c24]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#68dba9] text-[18px]">
                notifications_active
              </span>
              <span className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                Notifications
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-mono text-[#68dba9] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#262a33]">
            {loading ? (
              <div className="p-4 text-center text-xs font-mono text-[#87948b]">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-[#87948b]">
                No notifications yet.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  className={`p-3 transition-colors cursor-pointer flex flex-col gap-1 ${
                    item.status === 'UNREAD'
                      ? 'bg-[#25a475]/10 hover:bg-[#25a475]/20'
                      : 'hover:bg-[#181c24]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#dfe2ee] font-['Space_Grotesk']">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono text-[#87948b]">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-[#bccac0] leading-snug">{item.body}</p>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 border-t border-[#262a33] bg-[#181c24] text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-mono font-bold text-[#68dba9] hover:underline inline-flex items-center gap-1"
            >
              View All Notifications{' '}
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
