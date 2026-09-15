'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/i18n/context';

interface AchievementUnlock {
  id: string;
  definition: {
    code: string;
    name: string;
    category: string;
    icon: string;
  };
  unlockedAt: string;
}

interface AchievementProgress {
  definitionId: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
  definition: {
    code: string;
    name: string;
    category: string;
    icon: string;
  };
}

interface DriverEngagementSummary {
  currentStreak: number;
  longestStreak: number;
  lastQualifyingDate: string | null;
  unlockedCount: number;
  totalDefinitions: number;
  recentUnlocks: AchievementUnlock[];
  nextMilestones: AchievementProgress[];
}

export function DriverEngagementWidget() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<DriverEngagementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchEngagement() {
      try {
        const res = await fetch('/api/driver/engagement');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setSummary(data.data);
          }
        } else {
          if (isMounted) setError('Failed to load engagement');
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Error loading engagement');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void fetchEngagement();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] animate-pulse flex flex-col gap-3">
        <div className="h-4 w-36 bg-slate-800 rounded" />
        <div className="h-12 bg-slate-800/50 rounded-lg" />
      </div>
    );
  }

  if (error || !summary) {
    return null;
  }

  const nextMilestone = summary.nextMilestones?.[0];

  return (
    <div className="p-5 rounded-xl bg-gradient-to-r from-[#181c24] to-[#1e2430] border border-[#262a33] shadow-lg flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              {t('driverEngagement.widgetTitle')}
            </h3>
            <p className="text-xs text-[#87948b]">{t('driverEngagement.widgetSubtitle')}</p>
          </div>
        </div>
        <Link
          href="/driver/achievements"
          className="flex items-center gap-1 text-xs font-bold text-[#68dba9] hover:underline"
        >
          {t('driverEngagement.viewAllAchievements')}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Streak Card */}
        <div className="p-3.5 rounded-lg bg-[#12151c] border border-[#262a33] flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
            <span className="text-2xl animate-pulse">🔥</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">
              {t('driverEngagement.streakActive')}
            </span>
            <span className="text-lg font-black text-white">
              {t('driverEngagement.currentStreak', { count: summary.currentStreak })}
            </span>
            <span className="text-[11px] text-[#87948b] block">
              {t('driverEngagement.longestStreak', { count: summary.longestStreak })}
            </span>
          </div>
        </div>

        {/* Next Milestone Card */}
        <div className="p-3.5 rounded-lg bg-[#12151c] border border-[#262a33] flex flex-col justify-center gap-1.5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {t('driverEngagement.nextMilestone')}
            </span>
            {nextMilestone && (
              <span className="text-xs font-semibold text-[#dfe2ee]">
                {nextMilestone.definition.name}
              </span>
            )}
          </div>

          {nextMilestone ? (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[#87948b]">
                <span>Progress</span>
                <span className="font-mono text-white">
                  {nextMilestone.currentValue} / {nextMilestone.targetValue}
                </span>
              </div>
              <div className="w-full bg-[#1e2430] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, nextMilestone.percentage)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#87948b]">
              <span className="text-base text-amber-400">🏆</span>
              <span>
                {t('driverEngagement.achievementsUnlocked', {
                  unlocked: summary.unlockedCount,
                  total: summary.totalDefinitions,
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
