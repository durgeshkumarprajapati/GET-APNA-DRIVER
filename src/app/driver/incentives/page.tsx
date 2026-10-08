'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DriverLayout } from '@/components/driver-layout';
import { useTranslation } from '@/i18n/context';

interface DriverIncentiveProgress {
  id: string;
  campaignId: string;
  campaignName: string;
  description: string | null;
  incentiveType: 'TRIP_COUNT' | 'PEAK_HOURS' | 'STREAK' | 'RATING_TIER' | string;
  status: 'IN_PROGRESS' | 'QUALIFIED' | 'REWARDED' | 'EXPIRED' | string;
  currentValue: number;
  targetValue: number;
  rewardAmount: number;
  progressPercentage: number;
  qualifiedAt: string | null;
  rewardedAt: string | null;
  startAt: string;
  endAt: string;
}

export default function DriverIncentivesPage() {
  const { t } = useTranslation();
  const [incentives, setIncentives] = useState<DriverIncentiveProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  const fetchIncentives = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/driver/incentives');
      if (res.ok) {
        const data = await res.json();
        setIncentives(data.data || []);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to fetch active incentives.');
      }
    } catch {
      setError('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchIncentives();
  }, []);

  const totalPotentialRewards = incentives.reduce((acc, item) => acc + item.rewardAmount, 0);
  const totalEarnedRewards = incentives
    .filter((item) => item.status === 'REWARDED' || item.status === 'QUALIFIED')
    .reduce((acc, item) => acc + item.rewardAmount, 0);

  const filteredIncentives = incentives.filter((item) => {
    if (activeTab === 'IN_PROGRESS') return item.status === 'IN_PROGRESS';
    if (activeTab === 'COMPLETED') return item.status === 'QUALIFIED' || item.status === 'REWARDED';
    return true;
  });

  const getIncentiveBadge = (type: string) => {
    switch (type) {
      case 'PEAK_HOURS':
        return { label: 'Peak Hour Bonus', icon: 'bolt', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'STREAK':
        return { label: 'Streak Target', icon: 'local_fire_department', color: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30' };
      case 'RATING_TIER':
        return { label: 'Rating Tier', icon: 'stars', color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30' };
      default:
        return { label: 'Trip Target', icon: 'flag', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    }
  };

  return (
    <DriverLayout>
      <div className="flex flex-col w-full gap-6 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-1">
              <Link href="/driver" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                {t('driver.nav.cockpit', { defaultValue: 'Driver Cockpit' })}
              </Link>
              <span>/</span>
              <span className="text-on-surface font-medium">
                {t('driver.nav.incentives', { defaultValue: 'Incentives & Bonuses' })}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-on-surface font-['Space_Grotesk']">
              {t('driver.nav.incentives', { defaultValue: 'Incentives & Bonuses' })}
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Earn extra payouts by hitting ride milestones, peak-hour missions, and weekly streaks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchIncentives()}
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-border text-on-surface text-xs font-semibold transition-colors shadow-sm self-start sm:self-auto flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh Incentives
          </button>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-surface-container border border-border shadow-lg flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <span className="material-symbols-outlined text-2xl">workspace_premium</span>
            </div>
            <div>
              <span className="text-xs text-on-surface-variant font-medium block">Total Active Campaigns</span>
              <span className="text-2xl font-bold text-on-surface">{incentives.length}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container border border-border shadow-lg flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <span className="material-symbols-outlined text-2xl">savings</span>
            </div>
            <div>
              <span className="text-xs text-on-surface-variant font-medium block">Potential Bonus Pool</span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                ₹{totalPotentialRewards.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container border border-border shadow-lg flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
              <span className="material-symbols-outlined text-2xl">task_alt</span>
            </div>
            <div>
              <span className="text-xs text-on-surface-variant font-medium block">Earned Rewards</span>
              <span className="text-2xl font-extrabold text-on-surface font-mono">
                ₹{totalEarnedRewards.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          {(['ALL', 'IN_PROGRESS', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-md'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-border'
              }`}
            >
              {tab === 'ALL' && 'All Campaigns'}
              {tab === 'IN_PROGRESS' && 'In Progress'}
              {tab === 'COMPLETED' && 'Completed & Qualified'}
            </button>
          ))}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Content List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-6 rounded-2xl bg-surface-container border border-border animate-pulse space-y-4">
                <div className="h-5 w-40 bg-surface-container-high rounded" />
                <div className="h-10 bg-surface-container-high rounded-xl" />
                <div className="h-4 w-24 bg-surface-container-high rounded" />
              </div>
            ))}
          </div>
        ) : filteredIncentives.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-surface-container border border-border space-y-3">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">military_tech</span>
            <h3 className="text-base font-bold text-on-surface">No Active Campaigns Right Now</h3>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto">
              New daily and weekly incentive campaigns are posted regularly. Keep completing trips to stay eligible!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIncentives.map((item) => {
              const badge = getIncentiveBadge(item.incentiveType);
              const isQualified = item.status === 'QUALIFIED' || item.status === 'REWARDED';

              return (
                <div
                  key={item.id}
                  className="p-6 rounded-2xl bg-surface-container border border-border shadow-lg space-y-4 flex flex-col justify-between transition-all hover:border-emerald-500/40"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${badge.color}`}>
                        <span className="material-symbols-outlined text-xs">{badge.icon}</span>
                        {badge.label}
                      </span>

                      {isQualified ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          ✓ Qualified
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-on-surface-variant">
                          Ends {new Date(item.endAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-on-surface">{item.campaignName}</h3>
                      {item.description && (
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border">
                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-on-surface-variant">
                          Progress: <strong className="text-on-surface">{item.currentValue}</strong> / {item.targetValue}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {item.progressPercentage}%
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-surface-container-highest overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${item.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Reward Amount Footer */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-on-surface-variant">Bonus Reward</span>
                      <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                        +₹{item.rewardAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DriverLayout>
  );
}
