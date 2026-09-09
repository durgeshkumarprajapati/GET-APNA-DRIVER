'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { LoadingState } from '@/components/ui/loading-state';
import { formatDateTime } from '@/shared/formatting/date';

interface CommissionPolicy {
  percentage: string;
  updatedAt: string;
  updatedBy: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  actorUserId: string | null;
  beforeState: unknown;
  afterState: unknown;
  createdAt: string;
}

export default function AdminCommissionMatrixPage() {
  const [policy, setPolicy] = useState<CommissionPolicy | null>(null);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/commission');
      if (res.ok) {
        const data = await res.json();
        setPolicy(data.policy);
        setEditValue(data.policy.percentage);
        setHistory(data.history.entries ?? []);
        setError(null);
      } else {
        setError('Failed to load commission policy.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commission policy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  const handleSave = async () => {
    const pct = Number(editValue);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError('Commission percentage must be a number between 0 and 100.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/commission', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage: editValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to update commission policy.');
      }
      setMessage('Commission rate updated. Already-captured payments keep their original rate.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update commission policy.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <PageHeader
          eyebrow="Finance"
          title="Commission Matrix"
          subtitle="A single platform commission rate, applied to every captured payment. Rate changes never affect a payment that was already captured — each payment freezes the rate that applied to it at capture time."
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
          <LoadingState message="Loading commission policy…" />
        ) : (
          policy && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MetricCard
                  label="Current Platform Commission"
                  value={`${Number(policy.percentage).toFixed(2)}%`}
                />
                <MetricCard
                  label="Last Updated"
                  value={formatDateTime(policy.updatedAt)}
                  hint="See history below for who changed it"
                />
              </div>

              <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] space-y-4 max-w-md">
                <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Update Commission Rate
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-28 px-3 py-2 rounded-lg bg-[#0a0e16] border border-[#262a33] text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                  />
                  <span className="text-[#87948b] text-sm">%</span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className="px-4 py-2 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] text-xs font-bold disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
                <p className="text-[10px] text-[#87948b]">
                  This is the only commission dimension the platform currently supports — there is
                  no per-booking-type or per-driver-tier rate yet, since neither concept exists
                  elsewhere in the domain.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Rate Change History
                </h2>
                {history.length === 0 ? (
                  <p className="text-xs text-[#87948b]">No changes recorded yet.</p>
                ) : (
                  <div className="space-y-2 font-mono text-xs">
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-lg bg-[#181c24] border border-[#262a33] flex items-center justify-between"
                      >
                        <span className="text-[#dfe2ee]">{entry.action}</span>
                        <span className="text-[#87948b]">{formatDateTime(entry.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>
    </AdminLayout>
  );
}
