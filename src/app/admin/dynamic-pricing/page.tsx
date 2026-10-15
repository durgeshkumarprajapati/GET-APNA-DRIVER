'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n/context';
import { EmptyState } from '@/components/ui/empty-state';

interface PricingPolicy {
  id: string;
  name: string;
  description: string | null;
  version: number;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'ARCHIVED';
  bookingType: string | null;
  minimumPressure: string;
  maximumPressure: string;
  adjustmentPercentage: number;
  maxAdjustmentPercentage: number;
  flatSurgeAmount: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
}

interface CurrentPressure {
  pressureLevel: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  supplyDemandRatio: number;
  healthScore: number;
  reason: string;
  expectedEligibleSupply: number;
  forecastedDemand: number;
}

interface SimulationResult {
  pressureLevel: string;
  supplyDemandRatio: number;
  matchedPolicy: PricingPolicy | null;
  calculatedAdjustmentAmount: number;
  finalSimulatedFareAmount: number;
  wasCapped: boolean;
}

export default function AdminDynamicPricingPage() {
  const { t } = useTranslation();
  const [policies, setPolicies] = useState<PricingPolicy[]>([]);
  const [pressure, setPressure] = useState<CurrentPressure | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New policy form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bookingType, setBookingType] = useState<string>('POINT_TO_POINT');
  const [minimumPressure, setMinimumPressure] = useState('ELEVATED');
  const [maximumPressure, setMaximumPressure] = useState('CRITICAL');
  const [adjustmentPercentage, setAdjustmentPercentage] = useState('15.0');
  const [maxAdjustmentPercentage, setMaxAdjustmentPercentage] = useState('50.0');

  // Dry-run simulation state
  const [simBaseFare, setSimBaseFare] = useState('300');
  const [simSupply, setSimSupply] = useState('5');
  const [simDemand, setSimDemand] = useState('12');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/dynamic-pricing');
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies ?? []);
        setPressure(data.currentPressure ?? null);
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/dynamic-pricing');
        if (res.ok && isMounted) {
          const data = await res.json();
          setPolicies(data.policies ?? []);
          setPressure(data.currentPressure ?? null);
        }
      } catch {
        // Ignore network errors
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/dynamic-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          bookingType: bookingType === 'ALL' ? null : bookingType,
          minimumPressure,
          maximumPressure,
          adjustmentPercentage: parseFloat(adjustmentPercentage) || 0,
          maxAdjustmentPercentage: parseFloat(maxAdjustmentPercentage) || 50,
        }),
      });

      if (res.ok) {
        setName('');
        setDescription('');
        await fetchData();
      }
    } catch {
      // Error handling
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (policyId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/dynamic-pricing/${policyId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      // Error handling
    }
  };

  const handleRunSimulation = async () => {
    try {
      setSimulating(true);
      const res = await fetch('/api/admin/dynamic-pricing/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingType: bookingType === 'ALL' ? 'POINT_TO_POINT' : bookingType,
          baseFareAmount: parseFloat(simBaseFare) || 300,
          simulatedSupply: parseInt(simSupply, 10) || 0,
          simulatedDemand: parseInt(simDemand, 10) || 0,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimulation(data.simulation ?? null);
      }
    } catch {
      // Error handling
    } finally {
      setSimulating(false);
    }
  };

  const getPressureBadgeClass = (lvl?: string) => {
    switch (lvl) {
      case 'CRITICAL':
        return 'bg-error-container/80 text-on-error-container border-error';
      case 'HIGH':
        return 'bg-warning-container/80 text-on-warning-container border-warning';
      case 'ELEVATED':
        return 'bg-warning-container/80 text-on-warning-container border-warning';
      default:
        return 'bg-on-primary-container/80 text-primary border-primary-container';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface font-['Space_Grotesk'] tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            {t('admin.nav.dynamicPricing', { defaultValue: 'Controlled Dynamic Pricing' })}
          </h1>
          <p className="text-xs text-outline mt-1">
            Policy-governed marketplace fare pressure management with hard cap protection.
          </p>
        </div>
        <button
          onClick={() => void fetchData()}
          disabled={loading}
          className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface rounded-lg border border-surface-container-high flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh Signals
        </button>
      </div>

      {/* Real-time Pressure Monitor */}
      {pressure && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider font-['Space_Grotesk']">
              Marketplace Pressure
            </span>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${getPressureBadgeClass(pressure.pressureLevel)}`}
              >
                {pressure.pressureLevel}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-2 truncate">{pressure.reason}</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider font-['Space_Grotesk']">
              Supply/Demand Ratio
            </span>
            <div className="text-2xl font-bold text-primary font-mono mt-1">
              {pressure.supplyDemandRatio.toFixed(2)}
            </div>
            <p className="text-[11px] text-outline mt-1">
              {pressure.expectedEligibleSupply} eligible supply / {pressure.forecastedDemand} active
              demand
            </p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider font-['Space_Grotesk']">
              Marketplace Health Score
            </span>
            <div className="text-2xl font-bold text-on-surface font-mono mt-1">
              {pressure.healthScore} / 100
            </div>
            <p className="text-[11px] text-outline mt-1">Derived health index</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider font-['Space_Grotesk']">
              Active Policies
            </span>
            <div className="text-2xl font-bold text-on-surface font-mono mt-1">
              {policies.filter((p) => p.status === 'ACTIVE').length} / {policies.length}
            </div>
            <p className="text-[11px] text-outline mt-1">Active pricing rules</p>
          </div>
        </div>
      )}

      {/* Main Content Grid: Policy Manager & Dry-Run Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy List & Creation (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create Policy Card */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-high space-y-4">
            <h2 className="text-sm font-bold text-on-surface font-['Space_Grotesk'] flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">add_chart</span>
              Create Pricing Policy
            </h2>
            <form
              onSubmit={(e) => void handleCreatePolicy(e)}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="text-xs text-outline">Policy Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Peak Surge Policy"
                  className="w-full mt-1 bg-surface-container border border-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs text-outline">Booking Type</label>
                <select
                  value={bookingType}
                  onChange={(e) => setBookingType(e.target.value)}
                  className="w-full mt-1 bg-surface-container border border-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="ALL">All Booking Types</option>
                  <option value="POINT_TO_POINT">Point-to-Point</option>
                  <option value="HOURLY">Hourly Hire</option>
                  <option value="DAILY">Daily Hire</option>
                  <option value="WEEKLY">Weekly Hire</option>
                  <option value="MONTHLY">Monthly Hire</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-outline">Min Pressure Threshold</label>
                <select
                  value={minimumPressure}
                  onChange={(e) => setMinimumPressure(e.target.value)}
                  className="w-full mt-1 bg-surface-container border border-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="ELEVATED">ELEVATED</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-outline">Max Pressure Threshold</label>
                <select
                  value={maximumPressure}
                  onChange={(e) => setMaximumPressure(e.target.value)}
                  className="w-full mt-1 bg-surface-container border border-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="ELEVATED">ELEVATED</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-outline">Adjustment (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={adjustmentPercentage}
                  onChange={(e) => setAdjustmentPercentage(e.target.value)}
                  className="w-full mt-1 bg-surface-container border border-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs text-outline">Max Cap (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={maxAdjustmentPercentage}
                  onChange={(e) => setMaxAdjustmentPercentage(e.target.value)}
                  className="w-full mt-1 bg-surface-container border border-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary-container hover:bg-primary-container text-xs font-bold text-on-primary-container rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Policy (Draft)'}
                </button>
              </div>
            </form>
          </div>

          {/* Policy List Table */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-high space-y-4">
            <h2 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
              Pricing Policies
            </h2>
            {policies.length === 0 ? (
              <EmptyState icon="payments" message="No pricing policies configured yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-on-surface">
                  <thead className="bg-surface-container text-[10px] font-bold text-outline uppercase tracking-wider font-['Space_Grotesk']">
                    <tr>
                      <th className="px-3 py-2.5">Name</th>
                      <th className="px-3 py-2.5">Booking Type</th>
                      <th className="px-3 py-2.5">Pressure Range</th>
                      <th className="px-3 py-2.5">Adjustment</th>
                      <th className="px-3 py-2.5">Max Cap</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {policies.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-container/50">
                        <td className="px-3 py-3 font-semibold">{p.name}</td>
                        <td className="px-3 py-3 font-mono text-[11px] text-outline">
                          {p.bookingType || 'ALL'}
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px]">
                          {p.minimumPressure} → {p.maximumPressure}
                        </td>
                        <td className="px-3 py-3 font-mono text-primary font-bold">
                          +{p.adjustmentPercentage}%
                        </td>
                        <td className="px-3 py-3 font-mono text-error">
                          {p.maxAdjustmentPercentage}%
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              p.status === 'ACTIVE'
                                ? 'bg-on-primary-container text-primary border border-primary-container'
                                : 'bg-surface-container-high text-on-surface-variant border border-border'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => void handleToggleStatus(p.id, p.status)}
                            className="px-2.5 py-1 text-[10px] font-mono font-bold rounded bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container-high"
                          >
                            {p.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Dry-Run Fare Simulator (1 Column) */}
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-high space-y-4">
            <h2 className="text-sm font-bold text-on-surface font-['Space_Grotesk'] flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">science</span>
              Dry-Run Fare Simulator
            </h2>
            <p className="text-xs text-outline">
              Simulate dynamic fare calculations under different supply/demand pressure scenarios.
              No database or ledger records are modified.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-outline">Base Fare Amount (₹)</label>
                <input
                  type="number"
                  value={simBaseFare}
                  onChange={(e) => setSimBaseFare(e.target.value)}
                  className="w-full mt-1 bg-surface-container border border-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs text-outline">Simulated Supply (Drivers)</label>
                <input
                  type="number"
                  value={simSupply}
                  onChange={(e) => setSimSupply(e.target.value)}
                  className="w-full mt-1 bg-surface-container border border-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs text-outline">Simulated Demand (Requests)</label>
                <input
                  type="number"
                  value={simDemand}
                  onChange={(e) => setSimDemand(e.target.value)}
                  className="w-full mt-1 bg-surface-container border border-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="button"
                onClick={() => void handleRunSimulation()}
                disabled={simulating}
                className="w-full py-2.5 bg-primary-container hover:bg-primary-container text-xs font-bold text-on-primary-container rounded-lg transition-colors disabled:opacity-50 mt-2"
              >
                {simulating ? 'Calculating Simulation...' : 'Run Fare Simulation'}
              </button>
            </div>

            {/* Simulation Result Output */}
            {simulation && (
              <div className="mt-4 p-4 bg-surface-container rounded-xl border border-surface-container-high space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-outline">Calculated Pressure</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getPressureBadgeClass(simulation.pressureLevel)}`}
                  >
                    {simulation.pressureLevel}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-outline">Matched Policy</span>
                  <span className="font-semibold text-on-surface">
                    {simulation.matchedPolicy ? simulation.matchedPolicy.name : 'None'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-outline">Dynamic Adjustment</span>
                  <span className="font-mono text-primary font-bold">
                    +₹{simulation.calculatedAdjustmentAmount.toFixed(2)}
                  </span>
                </div>

                {simulation.wasCapped && (
                  <div className="p-2 bg-warning-container/60 border border-warning text-[10px] text-on-warning-container rounded-lg">
                    Adjustment was capped at maximum policy limit.
                  </div>
                )}

                <div className="border-t border-surface-container-high pt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">Simulated Gross Fare</span>
                  <span className="text-base font-bold font-mono text-primary">
                    ₹{simulation.finalSimulatedFareAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
