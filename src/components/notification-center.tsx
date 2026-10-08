'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface NotificationItem {
  id: string;
  type: string;
  category?: string | null;
  title: string;
  body: string;
  actionUrl?: string | null;
  imageAsset?: string | null;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'UNREAD' | 'READ';
  createdAt: string;
}

export function NotificationCenter() {
  const router = useRouter();
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
        // Fallback network error ignored
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
      const res = await fetch('/api/notifications?limit=8');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items ?? []);
      }
    } catch {
      // Fallback
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

  const markAsRead = async (id: string, actionUrl?: string | null) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n)));
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch {
      // Ignore network fallback
    }

    if (actionUrl) {
      setIsOpen(false);
      router.push(actionUrl);
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
        className="relative p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-border text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none min-w-[48px] min-h-[48px] flex items-center justify-center"
        title="Notifications"
        type="button"
        aria-label="Notification Center"
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-on-error font-mono text-[11px] font-bold shadow-md">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface-container border border-border shadow-2xl z-50 overflow-hidden font-sans">
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-surface-container-high">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                notifications_active
              </span>
              <span className="font-bold text-sm text-on-surface font-['Space_Grotesk']">
                Notifications
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-mono text-primary hover:underline px-2 py-1 rounded bg-primary/10"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="p-6 text-center text-xs font-mono text-on-surface-variant">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-on-surface-variant">
                No notifications yet. Important updates and rewards will appear here.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id, item.actionUrl)}
                  className={`p-3.5 transition-colors cursor-pointer flex gap-3 items-start ${
                    item.status === 'UNREAD'
                      ? 'bg-primary/10 hover:bg-primary/20 border-l-4 border-l-primary'
                      : 'hover:bg-surface-container-high'
                  }`}
                >
                  {item.imageAsset ? (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-container-high border border-border">
                      <Image src={item.imageAsset} alt="Engagement" fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-border flex items-center justify-center shrink-0 text-primary">
                      <span className="material-symbols-outlined text-[20px]">
                        {item.priority === 'URGENT'
                          ? 'warning'
                          : item.priority === 'HIGH'
                            ? 'priority_high'
                            : 'notifications'}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-bold text-xs text-on-surface font-['Space_Grotesk'] truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono text-on-surface-variant shrink-0">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-snug line-clamp-2">{item.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-border bg-surface-container-high text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-mono font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-[36px] items-center justify-center"
            >
              View Full Notification Center{' '}
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
