'use client';

import { useEffect, useState } from 'react';
import { LoadingState } from './ui/loading-state';

interface NotificationPreference {
  category: string;
  push: boolean;
  email: boolean;
  sms: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  BOOKING: 'Booking Updates',
  PAYMENT: 'Payments & Invoices',
  PROMOTION: 'Offers & Promotions',
  SYSTEM: 'System Announcements',
  MARKETING: 'Marketing',
  SAFETY: 'Safety & Emergency',
};

type Channel = 'push' | 'email' | 'sms';
const CHANNELS: Channel[] = ['push', 'email', 'sms'];

/**
 * Shared per-category, per-channel notification preference toggles — backed
 * by the real, existing GET/PUT /api/notifications/preferences API (which
 * works identically for any authenticated user, customer or driver).
 * Used by both /customer/settings and /driver/settings so neither
 * duplicates this fetch/toggle logic.
 */
export function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/notifications/preferences')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (isMounted) setPreferences(data.preferences ?? []);
      })
      .catch(() => {
        if (isMounted) setError('Failed to load notification preferences.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = async (category: string, channel: Channel, nextValue: boolean) => {
    const key = `${category}:${channel}`;
    setSavingKey(key);
    setError(null);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, [channel]: nextValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to update preference.');
      }
      setPreferences((prev) =>
        prev.map((p) => (p.category === category ? { ...p, [channel]: nextValue } : p)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preference.');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <LoadingState message="Loading notification preferences…" />;

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-lg border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-xs">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[#87948b] uppercase text-[10px] font-['Space_Grotesk']">
              <th className="py-2 pr-4">Category</th>
              {CHANNELS.map((c) => (
                <th key={c} className="py-2 px-3 text-center capitalize">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262a33]">
            {preferences.map((pref) => {
              const isSafety = pref.category === 'SAFETY';
              return (
                <tr key={pref.category}>
                  <td className="py-3 pr-4 text-[#dfe2ee] font-medium">
                    {CATEGORY_LABELS[pref.category] ?? pref.category}
                    {isSafety && (
                      <span className="block text-[10px] text-[#87948b] font-normal">
                        Always on — cannot be disabled
                      </span>
                    )}
                  </td>
                  {CHANNELS.map((channel) => {
                    const key = `${pref.category}:${channel}`;
                    return (
                      <td key={channel} className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={pref[channel]}
                          disabled={isSafety || savingKey === key}
                          onChange={(e) =>
                            void handleToggle(pref.category, channel, e.target.checked)
                          }
                          className="w-4 h-4 rounded bg-[#0a0e16] accent-[#68dba9] disabled:opacity-50"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
