'use client';

import { useEffect, useState } from 'react';
import { CorporateLayout } from '@/components/corporate-layout';

export default function CorporatePoliciesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Policy Form State
  const [name, setName] = useState('Standard Corporate Policy');
  const [maxFareAmount, setMaxFareAmount] = useState('5000');
  const [maxDistanceKm, setMaxDistanceKm] = useState('100');
  const [requireApprovalAboveAmount, setRequireApprovalAboveAmount] = useState('3000');
  const [requireApprovalAllRides, setRequireApprovalAllRides] = useState(false);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const res = await fetch('/api/corporate/policies');
        if (!res.ok) {
          throw new Error('Failed to load corporate policies');
        }
        const data = await res.json();

        if (data.policies?.[0]) {
          const p = data.policies[0];
          setName(p.name);
          setMaxFareAmount(p.maxFareAmount ? String(p.maxFareAmount) : '5000');
          setMaxDistanceKm(p.maxDistanceKm ? String(p.maxDistanceKm) : '100');
          setRequireApprovalAboveAmount(p.requireApprovalAboveAmount ? String(p.requireApprovalAboveAmount) : '3000');
          setRequireApprovalAllRides(p.requireApprovalAllRides ?? false);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading policy');
      } finally {
        setLoading(false);
      }
    }
    void loadPolicies();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/corporate/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          isDefault: true,
          maxFareAmount: maxFareAmount ? Number(maxFareAmount) : null,
          maxDistanceKm: maxDistanceKm ? Number(maxDistanceKm) : null,
          requireApprovalAboveAmount: requireApprovalAboveAmount ? Number(requireApprovalAboveAmount) : null,
          requireApprovalAllRides,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save travel policy');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving travel policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CorporateLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#68dba9] uppercase">
            GOVERNANCE RULES
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
            Corporate Travel Policies
          </h1>
          <p className="text-xs sm:text-sm text-[#bccac0] mt-1">
            Configure fare limits, distance caps, vehicle permissions, and manager approval triggers for employee bookings.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Corporate travel policy updated & active immediately across all employee bookings!</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-[#bccac0] text-sm font-mono animate-pulse">
            Loading travel policy rules...
          </div>
        ) : (
          <form onSubmit={handleSave} className="bg-[#141822] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="space-y-1">
              <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">Policy Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">Maximum Fare Amount Cap (₹)</label>
                <input
                  type="number"
                  value={maxFareAmount}
                  onChange={(e) => setMaxFareAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                />
                <span className="text-[10px] text-[#87948b] font-mono">Fares exceeding this trigger approval request</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">Maximum Distance Cap (KM)</label>
                <input
                  type="number"
                  value={maxDistanceKm}
                  onChange={(e) => setMaxDistanceKm(e.target.value)}
                  placeholder="100"
                  className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                />
                <span className="text-[10px] text-[#87948b] font-mono">Trips exceeding this distance require approval</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#262a33]">
              <div className="space-y-1">
                <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">Manager Approval Threshold (₹)</label>
                <input
                  type="number"
                  value={requireApprovalAboveAmount}
                  onChange={(e) => setRequireApprovalAboveAmount(e.target.value)}
                  placeholder="3000"
                  className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                />
                <span className="text-[10px] text-[#87948b] font-mono">Rides priced equal or above this value auto-route to approval queue</span>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="requireAll"
                  checked={requireApprovalAllRides}
                  onChange={(e) => setRequireApprovalAllRides(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0a0e16] border-[#262a33] text-[#25a475] focus:ring-[#68dba9]"
                />
                <label htmlFor="requireAll" className="text-xs font-mono text-[#dfe2ee] cursor-pointer">
                  Require manager approval on ALL corporate bookings regardless of fare
                </label>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-gradient-to-r from-[#25a475] to-[#68dba9] text-[#00311f] font-bold rounded-xl text-xs flex items-center gap-2 hover:brightness-110 shadow-lg shadow-[#25a475]/20 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">save</span>
                <span>{saving ? 'Saving...' : 'Save Policy Configuration'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </CorporateLayout>
  );
}
