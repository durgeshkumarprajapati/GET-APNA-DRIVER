'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { LoadingState } from '@/components/ui/loading-state';
import { formatCurrency } from '@/shared/formatting/money';

interface ReferralConfigEntry {
  id: string;
  key: string;
  value: string;
  valueType: string;
  description: string | null;
}

interface ReferralMetrics {
  totalReferrals: number;
  byStatus: Record<string, number>;
  totalRewardedAmount: string;
}

const CONFIG_LABELS: Record<string, string> = {
  'referral.customer_reward_amount': 'Customer Referral Reward (INR)',
  'referral.driver_reward_amount': 'Driver Referral Reward (INR)',
};

export default function AdminReferralEnginesPage() {
  const [configs, setConfigs] = useState<ReferralConfigEntry[]>([]);
  const [metrics, setMetrics] = useState<ReferralMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      const [configRes, metricsRes] = await Promise.all([
        fetch('/api/admin/configuration?category=referral'),
        fetch('/api/admin/referrals/metrics'),
      ]);
      if (configRes.ok) {
        const data = await configRes.json();
        setConfigs(data.configurations ?? []);
        setEditValues(
          Object.fromEntries(
            (data.configurations ?? []).map((c: ReferralConfigEntry) => [c.key, c.value]),
          ),
        );
      }
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referral configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  const handleSave = async (config: ReferralConfigEntry) => {
    const nextValue = editValues[config.key];
    if (!nextValue || Number.isNaN(Number(nextValue)) || Number(nextValue) < 0) {
      setError('Reward amount must be a valid non-negative number.');
      return;
    }
    setSavingKey(config.key);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: config.key,
          value: Number(nextValue).toFixed(4),
          valueType: config.valueType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to update referral configuration.');
      }
      setMessage(`${CONFIG_LABELS[config.key] ?? config.key} updated.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update referral configuration.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <PageHeader
          eyebrow="Growth"
          title="Referral Program"
          subtitle="Configure reward amounts and view referral program performance — single source of truth via System Configuration."
        />

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="p-4 rounded-xl border border-[#25a475] bg-[#00311f]/40 text-[#68dba9] text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading referral program data…" />
        ) : (
          <>
            {metrics && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard label="Total Referrals" value={metrics.totalReferrals} />
                <MetricCard
                  label="Rewarded"
                  value={metrics.byStatus.REWARDED ?? 0}
                  accent="positive"
                />
                <MetricCard
                  label="Total Rewarded Amount"
                  value={formatCurrency(metrics.totalRewardedAmount)}
                  accent="positive"
                />
              </div>
            )}

            <div className="flex flex-col gap-3">
              <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Reward Configuration
              </h2>
              {configs.map((config) => (
                <div
                  key={config.key}
                  className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center justify-between gap-4 flex-wrap"
                >
                  <div>
                    <p className="text-sm font-bold text-[#dfe2ee]">
                      {CONFIG_LABELS[config.key] ?? config.key}
                    </p>
                    {config.description && (
                      <p className="text-[10px] text-[#87948b] mt-0.5">{config.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#87948b] text-sm">₹</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={editValues[config.key] ?? ''}
                      onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, [config.key]: e.target.value }))
                      }
                      className="w-28 px-3 py-2 rounded-lg bg-[#0a0e16] border border-[#262a33] text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                    />
                    <button
                      type="button"
                      disabled={savingKey === config.key}
                      onClick={() => void handleSave(config)}
                      className="px-4 py-2 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] text-xs font-bold disabled:opacity-50 transition-colors"
                    >
                      {savingKey === config.key ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
