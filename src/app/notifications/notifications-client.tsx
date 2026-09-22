'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CustomerLayout } from '@/components/customer-layout';
import { DriverLayout } from '@/components/driver-layout';
import { AdminLayout } from '@/components/admin-layout';
import { useAutoWebPush } from '@/components/use-auto-web-push';

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

type Portal = 'CUSTOMER' | 'DRIVER' | 'ADMIN';

const PORTAL_HOME: Record<Portal, string> = {
  CUSTOMER: '/customer/dashboard',
  DRIVER: '/driver',
  ADMIN: '/admin',
};

const PORTAL_LAYOUT: Record<Portal, React.ComponentType<{ children: React.ReactNode }>> = {
  CUSTOMER: CustomerLayout,
  DRIVER: DriverLayout,
  ADMIN: AdminLayout,
};

const PORTAL_CATEGORIES: Record<Portal, { label: string; value: string }[]> = {
  CUSTOMER: [
    { label: 'All', value: 'ALL' },
    { label: 'Bookings', value: 'BOOKING' },
    { label: 'Rewards & Loyalty', value: 'REWARD' },
    { label: 'Offers & Coupons', value: 'PROMOTION' },
    { label: 'Referral', value: 'REFERRAL' },
    { label: 'Support', value: 'SUPPORT' },
    { label: 'Safety', value: 'SAFETY' },
  ],
  DRIVER: [
    { label: 'All', value: 'ALL' },
    { label: 'Trip Offers', value: 'BOOKING' },
    { label: 'Earnings & Payouts', value: 'PAYMENT' },
    { label: 'Incentives & Goals', value: 'INCENTIVE' },
    { label: 'Compliance & Docs', value: 'DOCUMENT' },
    { label: 'Support', value: 'SUPPORT' },
    { label: 'Safety Alerts', value: 'SAFETY' },
  ],
  ADMIN: [
    { label: 'All', value: 'ALL' },
    { label: 'Safety / SOS', value: 'SAFETY' },
    { label: 'Support Escalations', value: 'SUPPORT' },
    { label: 'Finance & Settlements', value: 'FINANCE' },
    { label: 'Driver Compliance', value: 'DRIVER_COMPLIANCE' },
    { label: 'Referral Campaigns', value: 'REFERRAL' },
    { label: 'System Alerts', value: 'SYSTEM' },
  ],
};

export default function UserNotificationsPage({ portal }: { portal: Portal }) {
  const router = useRouter();
  const PortalLayout = PORTAL_LAYOUT[portal];
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNREAD'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isSupported, isPushActive, enablePush } = useAutoWebPush();
  const [notificationMsg, setNotificationMsg] = useState<{
    text: string;
    tone: 'success' | 'error';
  } | null>(null);

  const showToast = (text: string, tone: 'success' | 'error' = 'success') => {
    setNotificationMsg({ text, tone });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const fetchNotifications = useCallback(async () => {
    try {
      let query = '/api/notifications?limit=50';
      if (filterStatus === 'UNREAD') query += '&status=UNREAD';
      if (filterCategory !== 'ALL') query += `&category=${filterCategory}`;

      const res = await fetch(query);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items ?? []);
      }
    } catch {
      // Ignore fallback
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // Ignore fallback
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
    if (!isSupported) {
      showToast('Browser does not support Web Push', 'error');
      return;
    }

    const success = await enablePush();
    if (success) {
      showToast('Browser Web Push Enabled & Synchronized!');
    } else {
      showToast('Could not enable push notifications. Check browser permissions.', 'error');
    }
  };

  const markRead = async (id: string, actionUrl?: string | null) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n)));
        void fetchUnreadCount();
      }
    } catch {
      // Ignore
    }

    if (actionUrl) {
      router.push(actionUrl);
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
    <PortalLayout>
      <div className="flex flex-col w-full gap-6">
        {notificationMsg && (
          <div
            role="status"
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-2 border ${
              notificationMsg.tone === 'error'
                ? 'bg-[#93000a]/20 text-[#ffb4ab] border-[#93000a]'
                : 'bg-[#25a475] text-[#00311f] border-[#68dba9]'
            }`}
          >
            <span className="material-symbols-outlined">
              {notificationMsg.tone === 'error' ? 'error' : 'check_circle'}
            </span>
            <span>{notificationMsg.text}</span>
          </div>
        )}

        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0e16] p-6 rounded-2xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              <span>{portal} NOTIFICATION &amp; ENGAGEMENT CENTER</span>
            </div>
            <h1 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Notifications &amp; Activity Stream
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={enablePushNotifications}
              className="px-4 py-2.5 rounded-xl bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-xs font-['Space_Grotesk'] flex items-center gap-2 transition-all min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[18px]">sensors</span>
              {isPushActive ? 'Web Push Active' : 'Enable Web Push'}
            </button>
            <Link
              href={PORTAL_HOME[portal]}
              className="px-4 py-2.5 rounded-xl bg-[#181c24] hover:bg-[#262a33] text-[#dfe2ee] border border-[#262a33] text-xs font-mono min-h-[44px] flex items-center"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* FILTER BAR & TABS */}
        <div className="flex flex-col gap-3 bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs border-b border-[#262a33] pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'ALL'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#87948b] hover:text-[#dfe2ee]'
                }`}
              >
                All Stream
              </button>
              <button
                onClick={() => setFilterStatus('UNREAD')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'UNREAD'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#87948b] hover:text-[#dfe2ee]'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[#68dba9] font-bold hover:underline px-3 py-1.5 rounded bg-[#25a475]/10"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* CATEGORY TABS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {PORTAL_CATEGORIES[portal].map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all ${
                  filterCategory === cat.value
                    ? 'bg-[#181c24] text-[#68dba9] border border-[#25a475] font-bold'
                    : 'bg-[#0a0e16] text-[#87948b] border border-transparent hover:text-[#dfe2ee]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* NOTIFICATION FEED LIST */}
        <div className="bg-[#0a0e16] rounded-2xl border border-[#262a33] p-5 shadow-xl flex flex-col gap-3">
          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-[#87948b]">
              Loading activity stream...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-5xl text-[#87948b]">
                notifications_off
              </span>
              <span className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                No notifications found
              </span>
              <span className="text-xs font-mono text-[#87948b]">
                You are all caught up! Important updates and rewards will appear here.
              </span>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => markRead(item.id, item.actionUrl)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row gap-4 sm:items-center justify-between ${
                  item.status === 'UNREAD'
                    ? 'bg-[#25a475]/10 border-[#25a475]/40 hover:bg-[#25a475]/20 border-l-4 border-l-[#25a475]'
                    : 'bg-[#181c24] border-[#262a33] hover:border-[#3d4a42]'
                }`}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {item.imageAsset ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#0a0e16] border border-[#262a33]">
                      <Image
                        src={item.imageAsset}
                        alt="Notification asset"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#0a0e16] border border-[#262a33] flex items-center justify-center shrink-0 text-[#68dba9]">
                      <span className="material-symbols-outlined text-[24px]">
                        {item.priority === 'URGENT'
                          ? 'warning'
                          : item.priority === 'HIGH'
                            ? 'priority_high'
                            : 'notifications'}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.status === 'UNREAD' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#68dba9] animate-pulse shrink-0" />
                      )}
                      <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] truncate">
                        {item.title}
                      </h3>
                      {item.category && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181c24] text-[#87948b] border border-[#262a33] shrink-0">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#bccac0] leading-relaxed">{item.body}</p>
                    <span className="text-[10px] font-mono text-[#87948b] mt-1 inline-block">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {item.actionUrl && (
                  <div className="shrink-0 self-end sm:self-center">
                    <span className="px-3.5 py-1.5 rounded-lg bg-[#25a475]/10 text-[#68dba9] hover:bg-[#25a475]/20 font-mono text-xs font-bold inline-flex items-center gap-1 border border-[#25a475]/30">
                      View{' '}
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
