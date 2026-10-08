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
interface IntelligenceConfig {
  quietHours: {
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    timezone: string;
  };
  frequencyCap: {
    frequencyCapEnabled: boolean;
    maxNonUrgentPerDay: number;
  };
}

export function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [intelligence, setIntelligence] = useState<IntelligenceConfig>({
    quietHours: { quietHoursEnabled: true, quietHoursStart: '22:00', quietHoursEnd: '07:00', timezone: 'Asia/Kolkata' },
    frequencyCap: { frequencyCapEnabled: true, maxNonUrgentPerDay: 3 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/notifications/preferences')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (isMounted) {
          setPreferences(data.preferences ?? []);
          if (data.intelligenceConfig) {
            setIntelligence(data.intelligenceConfig);
          }
        }
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

  const handleUpdateIntelligence = async (updatePayload: Record<string, unknown>) => {
    setSavingKey('intelligence');
    setError(null);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to update settings.');
      }
      if (data.intelligenceConfig) {
        setIntelligence(data.intelligenceConfig);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings.');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <LoadingState message="Loading notification preferences…" />;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* 1. Quiet Hours & Fatigue Controls */}
      <div className="p-4 rounded-lg bg-surface-container-high border border-border space-y-4">
        <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-['Space_Grotesk']">
          🌙 Quiet Hours & Fatigue Controls
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-on-surface">
          {/* Quiet Hours */}
          <div className="p-3 rounded-lg bg-surface-container-highest border border-border space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="quiet-hours-toggle" className="font-semibold text-on-surface">
                Quiet Hours (Night Mode)
              </label>
              <input
                id="quiet-hours-toggle"
                type="checkbox"
                checked={intelligence.quietHours.quietHoursEnabled}
                onChange={(e) =>
                  void handleUpdateIntelligence({ quietHoursEnabled: e.target.checked })
                }
                className="w-4 h-4 rounded accent-emerald-600 dark:accent-emerald-400"
              />
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Non-urgent offer & promotional alerts are paused during quiet hours. Emergency & active ride alerts always bypass.
            </p>
            {intelligence.quietHours.quietHoursEnabled && (
              <div className="flex items-center gap-3 pt-2">
                <div>
                  <label htmlFor="quiet-start-input" className="block text-[10px] text-on-surface-variant">Start Time</label>
                  <input
                    id="quiet-start-input"
                    type="time"
                    value={intelligence.quietHours.quietHoursStart}
                    onChange={(e) =>
                      void handleUpdateIntelligence({ quietHoursStart: e.target.value })
                    }
                    className="mt-1 px-2 py-1 bg-surface border border-border rounded text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="quiet-end-input" className="block text-[10px] text-on-surface-variant">End Time</label>
                  <input
                    id="quiet-end-input"
                    type="time"
                    value={intelligence.quietHours.quietHoursEnd}
                    onChange={(e) =>
                      void handleUpdateIntelligence({ quietHoursEnd: e.target.value })
                    }
                    className="mt-1 px-2 py-1 bg-surface border border-border rounded text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Daily Frequency Cap */}
          <div className="p-3 rounded-lg bg-surface-container-highest border border-border space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="frequency-cap-toggle" className="font-semibold text-on-surface">
                Daily Frequency Cap
              </label>
              <input
                id="frequency-cap-toggle"
                type="checkbox"
                checked={intelligence.frequencyCap.frequencyCapEnabled}
                onChange={(e) =>
                  void handleUpdateIntelligence({ frequencyCapEnabled: e.target.checked })
                }
                className="w-4 h-4 rounded accent-emerald-600 dark:accent-emerald-400"
              />
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Caps non-essential promotional and loyalty notifications to prevent notification overload.
            </p>
            {intelligence.frequencyCap.frequencyCapEnabled && (
              <div className="pt-2">
                <label htmlFor="max-non-urgent-select" className="block text-[10px] text-on-surface-variant">Max Non-Urgent Messages Per Day</label>
                <select
                  id="max-non-urgent-select"
                  value={intelligence.frequencyCap.maxNonUrgentPerDay}
                  onChange={(e) =>
                    void handleUpdateIntelligence({ maxNonUrgentPerDay: Number(e.target.value) })
                  }
                  className="mt-1 px-3 py-1 bg-surface border border-border rounded text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={1} className="bg-surface text-on-surface">1 notification per day</option>
                  <option value={2} className="bg-surface text-on-surface">2 notifications per day</option>
                  <option value={3} className="bg-surface text-on-surface">3 notifications per day (Recommended)</option>
                  <option value={5} className="bg-surface text-on-surface">5 notifications per day</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Category Channel Toggles */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-on-surface-variant uppercase text-[10px] font-['Space_Grotesk'] border-b border-border">
              <th className="py-2 pr-4">Category</th>
              {CHANNELS.map((c) => (
                <th key={c} className="py-2 px-3 text-center capitalize">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {preferences.map((pref) => {
              const isSafety = pref.category === 'SAFETY';
              return (
                <tr key={pref.category}>
                  <td className="py-3 pr-4 text-on-surface font-medium">
                    {CATEGORY_LABELS[pref.category] ?? pref.category}
                    {isSafety && (
                      <span className="block text-[10px] text-on-surface-variant font-normal">
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
                          className="w-4 h-4 rounded accent-emerald-600 dark:accent-emerald-400 disabled:opacity-50"
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
