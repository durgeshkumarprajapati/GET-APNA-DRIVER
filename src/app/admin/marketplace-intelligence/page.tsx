'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CampaignSignalCard } from '@/components/marketplace/CampaignSignalCard';
import { CampaignSignalCardDTO } from '@/modules/marketplace-intelligence/domain/campaign-signals-service';

interface MarketplaceRecommendationDTO {
  id: string;
  type: string;
  severity: string;
  reason: string;
  explanation: {
    what: string;
    where: string;
    why: string;
  };
  suggestedAction: string;
  fingerprint: string;
}

interface ZoneBreakdownDTO {
  zoneId: string;
  zoneName: string;
  zoneCode: string;
  requests: number;
  completed: number;
  cancelled: number;
  availableSupply: number;
}

interface MarketplaceOverviewData {
  health: {
    healthState: string;
    healthScore: number;
    explanation: string;
  };
  supply: {
    supplyDemandRatio: number;
    dispatchEligibleDrivers: number;
    supplyDemandRatioExplanation: string;
  };
  demand: {
    totalRequests: number;
    observedDemandTrendPercent: number;
    completedRides: number;
    cancelledRides: number;
    zoneBreakdown: ZoneBreakdownDTO[];
  };
  forecast: {
    confidence: string;
    forecastedDemand: number;
    explanation: string;
  };
  recommendations: MarketplaceRecommendationDTO[];
  campaignSignals: {
    cards: CampaignSignalCardDTO[];
  };
}

export default function AdminMarketplaceIntelligencePage() {
  const [data, setData] = useState<MarketplaceOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ range: timeRange });
      if (selectedZone !== 'all') query.set('zoneId', selectedZone);

      const res = await fetch(`/api/admin/marketplace-intelligence?${query.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as MarketplaceOverviewData;
      setData(json);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load marketplace intelligence data');
    } finally {
      setLoading(false);
    }
  }, [timeRange, selectedZone]);

  useEffect(() => {
    let ignore = false;
    const fetchMarketplaceData = async () => {
      try {
        const query = new URLSearchParams({ range: timeRange });
        if (selectedZone !== 'all') query.set('zoneId', selectedZone);

        const res = await fetch(`/api/admin/marketplace-intelligence?${query.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as MarketplaceOverviewData;
        if (!ignore) {
          setData(json);
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError((err as Error).message || 'Failed to load marketplace intelligence data');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void fetchMarketplaceData();
    return () => {
      ignore = true;
    };
  }, [timeRange, selectedZone]);

  const handleRecommendationAction = async (
    fingerprint: string,
    action: 'ACKNOWLEDGED' | 'DISMISSED',
    recId: string,
  ) => {
    setActionLoadingId(recId);
    try {
      const res = await fetch(
        `/api/admin/marketplace-intelligence/recommendations/${recId}/action`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            recommendationFingerprint: fingerprint,
          }),
        },
      );
      if (!res.ok) throw new Error('Action failed');
      await loadData();
    } catch (err) {
      console.error('Recommendation action error:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getHealthBadge = (healthState: string) => {
    switch (healthState) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>HEALTHY</span>
          </span>
        );
      case 'WATCH':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span>WATCH</span>
          </span>
        );
      case 'STRAINED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <span className="material-symbols-outlined text-sm">warning</span>
            <span>STRAINED</span>
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="material-symbols-outlined text-sm">cancel</span>
            <span>CRITICAL</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="material-symbols-outlined text-sm">monitoring</span>
            <span>INSUFFICIENT DATA</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Console Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-emerald-400">monitoring</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Marketplace Intelligence Console
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                PHASE 42
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Executive decision support layer, real-time demand forecasting & campaign signals
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Zone */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-slate-950 text-slate-200 text-sm border border-slate-800 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="all">All Zones</option>
            {data?.demand?.zoneBreakdown?.map((z) => (
              <option key={z.zoneId} value={z.zoneId}>
                {z.zoneName}
              </option>
            ))}
          </select>

          {/* Filter Time Range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-slate-950 text-slate-200 text-sm border border-slate-800 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 disabled:opacity-50 flex items-center justify-center"
            title="Refresh Analytics"
          >
            <span
              className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}
            >
              refresh
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center space-x-2">
          <span className="material-symbols-outlined text-lg">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* 1. Health Header Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Health State */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
            <span className="text-xs font-medium text-slate-400 block mb-2">
              Marketplace Health
            </span>
            <div className="flex items-center justify-between">
              {getHealthBadge(data.health.healthState)}
              <span className="text-2xl font-bold font-mono text-white">
                {data.health.healthScore}/100
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-3 line-clamp-2">{data.health.explanation}</p>
          </div>

          {/* Supply-Demand Ratio */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
            <span className="text-xs font-medium text-slate-400 block mb-1">
              Supply/Demand Ratio
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {data.supply.supplyDemandRatio}x
              </span>
              <span className="text-xs text-slate-400">
                ({data.supply.dispatchEligibleDrivers} supply / {data.demand.totalRequests} demand)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-3 line-clamp-2">
              {data.supply.supplyDemandRatioExplanation}
            </p>
          </div>

          {/* Total Demand */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
            <span className="text-xs font-medium text-slate-400 block mb-1">Observed Demand</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-white">
                {data.demand.totalRequests}
              </span>
              <span className="text-xs text-emerald-400 font-semibold">
                {data.demand.observedDemandTrendPercent >= 0
                  ? `+${data.demand.observedDemandTrendPercent}%`
                  : `${data.demand.observedDemandTrendPercent}%`}{' '}
                vs baseline
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-3">
              <span>Completed: {data.demand.completedRides}</span>
              <span>Cancelled: {data.demand.cancelledRides}</span>
            </div>
          </div>

          {/* Active Forecast */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-400">1-Hour Forecast</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {data.forecast.confidence} CONFIDENCE
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-blue-400">
                {data.forecast.forecastedDemand}
              </span>
              <span className="text-xs text-slate-400">expected rides</span>
            </div>
            <p className="text-xs text-slate-400 mt-3 line-clamp-2">{data.forecast.explanation}</p>
          </div>
        </div>
      )}

      {/* 2. Operational Recommendations Panel */}
      {data && data.recommendations && data.recommendations.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-amber-400">
                  shield_with_heart
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Active Operational Recommendations</h3>
                <p className="text-xs text-slate-400">
                  Advisory decision-support alerts for live ops optimization
                </p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
              {data.recommendations.length} Active Alerts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.recommendations.map((rec: MarketplaceRecommendationDTO) => (
              <div
                key={rec.id}
                className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold font-mono text-amber-400 uppercase">
                        {rec.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                        {rec.severity}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-200 mt-1">{rec.reason}</h4>
                  </div>
                </div>

                <div className="text-xs text-slate-400 bg-slate-900 p-3 rounded-lg border border-slate-800/80 space-y-1">
                  <p>
                    <strong className="text-slate-300">WHAT:</strong> {rec.explanation.what}
                  </p>
                  <p>
                    <strong className="text-slate-300">WHERE:</strong> {rec.explanation.where}
                  </p>
                  <p>
                    <strong className="text-slate-300">WHY:</strong> {rec.explanation.why}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  <span className="text-slate-400 italic">{rec.suggestedAction}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        handleRecommendationAction(rec.fingerprint, 'ACKNOWLEDGED', rec.id)
                      }
                      disabled={actionLoadingId === rec.id}
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors flex items-center justify-center"
                      title="Acknowledge Recommendation"
                    >
                      <span className="material-symbols-outlined text-base">check</span>
                    </button>
                    <button
                      onClick={() =>
                        handleRecommendationAction(rec.fingerprint, 'DISMISSED', rec.id)
                      }
                      disabled={actionLoadingId === rec.id}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                      title="Dismiss Recommendation"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Campaign & Engagement Signals Section */}
      {data && data.campaignSignals && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-purple-400">
                  auto_awesome
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Campaign & Engagement Signals</h3>
                <p className="text-xs text-slate-400">
                  Observed demand correlation & usage signals across active growth campaigns
                </p>
              </div>
            </div>
            <Link
              href="/admin/marketplace-intelligence/campaigns"
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center space-x-1"
            >
              <span>View Full Campaign Intelligence</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Link>
          </div>

          {/* Card Grid featuring Image Assets */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {data.campaignSignals.cards.map((card: CampaignSignalCardDTO) => (
              <CampaignSignalCard key={card.campaignId} signal={card} />
            ))}
          </div>
        </div>
      )}

      {/* 4. Demand & Supply Grid by Zone */}
      {data && data.demand && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-blue-400">location_on</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Zone Intelligence Grid</h3>
                <p className="text-xs text-slate-400">
                  Server-authoritative geographic demand vs driver supply distribution
                </p>
              </div>
            </div>
            <Link
              href="/admin/marketplace-intelligence/forecast"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
            >
              <span>Forecast Horizons</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs font-semibold text-slate-400 uppercase font-mono">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Zone</th>
                  <th className="px-4 py-3">Requests</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Cancelled</th>
                  <th className="px-4 py-3">Available Supply</th>
                  <th className="px-4 py-3 rounded-r-lg text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.demand.zoneBreakdown.map((zone: ZoneBreakdownDTO) => (
                  <tr key={zone.zoneId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-white">
                      <div className="flex items-center space-x-2">
                        <span className="material-symbols-outlined text-base text-slate-400">
                          location_on
                        </span>
                        <span>{zone.zoneName}</span>
                        <span className="text-xs text-slate-500 font-mono">({zone.zoneCode})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-200">
                      {zone.requests}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-emerald-400">{zone.completed}</td>
                    <td className="px-4 py-3.5 font-mono text-red-400">{zone.cancelled}</td>
                    <td className="px-4 py-3.5 font-mono text-blue-400">
                      {zone.requests > 0 ? Math.max(1, Math.round(zone.requests * 0.8)) : 0}{' '}
                      eligible
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/admin/marketplace-intelligence/zones/${zone.zoneId}`}
                        className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                      >
                        View Zone →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
