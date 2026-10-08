'use client';

import { useEffect, useState } from 'react';
import { DriverLayout } from '@/components/driver-layout';
import { useTranslation } from '@/i18n/context';

interface AchievementItem {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  targetValue: number;
  icon: string;
  rewardType: string | null;
  rewardMetadata: Record<string, unknown> | null;
  currentValue: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

interface EngagementSummary {
  currentStreak: number;
  longestStreak: number;
  lastQualifyingDate: string | null;
  unlockedCount: number;
  totalDefinitions: number;
}

export default function DriverAchievementsPage() {
  const { t } = useTranslation();
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [summary, setSummary] = useState<EngagementSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadAchievements() {
      try {
        const [achRes, engRes] = await Promise.all([
          fetch('/api/driver/achievements'),
          fetch('/api/driver/engagement'),
        ]);

        if (isMounted) {
          if (achRes.ok) {
            const data = await achRes.json();
            setAchievements(data.data ?? []);
          } else {
            setError('Failed to fetch achievements');
          }

          if (engRes.ok) {
            const data = await engRes.json();
            setSummary({
              currentStreak: data.data.currentStreak,
              longestStreak: data.data.longestStreak,
              lastQualifyingDate: data.data.lastQualifyingDate,
              unlockedCount: data.data.unlockedCount,
              totalDefinitions: data.data.totalDefinitions,
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading achievements');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadAchievements();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = [
    { key: 'ALL', label: t('driverEngagement.categories.all') },
    { key: 'TRIPS', label: t('driverEngagement.categories.trips') },
    { key: 'STREAK', label: t('driverEngagement.categories.streak') },
    { key: 'RATING', label: t('driverEngagement.categories.rating') },
    { key: 'EARNINGS', label: t('driverEngagement.categories.earnings') },
    { key: 'SCHEDULE', label: t('driverEngagement.categories.schedule') },
    { key: 'COMPLIANCE', label: t('driverEngagement.categories.compliance') },
    { key: 'GOAL', label: t('driverEngagement.categories.goal') },
  ];

  const filteredAchievements =
    selectedCategory === 'ALL'
      ? achievements
      : achievements.filter((a) => a.category === selectedCategory);

  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        {/* Header Banner */}
        <section className="p-6 rounded-xl bg-surface-container border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl text-amber-400">🏆</span>
              <h1 className="text-2xl font-bold text-on-surface font-['Space_Grotesk']">
                {t('driverEngagement.achievementsTitle')}
              </h1>
            </div>
            <p className="text-sm text-on-surface-variant">{t('driverEngagement.achievementsSubtitle')}</p>
          </div>

          {summary && (
            <div className="flex items-center gap-4 shrink-0 bg-surface-container-high p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <span className="text-xl animate-pulse">🔥</span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-orange-500 dark:text-orange-400 block">
                    Streak
                  </span>
                  <span className="text-sm font-black text-on-surface">
                    {t('driverEngagement.currentStreak', { count: summary.currentStreak })}
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-border" />

              <div className="flex items-center gap-2">
                <span className="text-xl text-emerald-500 dark:text-emerald-400">🏅</span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                    Unlocked
                  </span>
                  <span className="text-sm font-black text-on-surface">
                    {summary.unlockedCount} / {summary.totalDefinitions}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {error && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                selectedCategory === cat.key
                  ? 'bg-primary text-on-primary font-bold'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high active:bg-surface-container-highest border border-border'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Achievements Grid */}
        {loading ? (
          <div className="py-16 text-center text-on-surface-variant text-sm">Loading achievements...</div>
        ) : filteredAchievements.length === 0 ? (
          <div className="p-12 text-center border border-border bg-surface-container rounded-xl text-on-surface-variant shadow-sm">
            No achievements found for this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((ach) => {
              const pct = Math.min(100, Math.round((ach.currentValue / ach.targetValue) * 100));

              return (
                <div
                  key={ach.id}
                  className={`animate-fade-in-up p-5 rounded-xl border transition-all flex flex-col justify-between gap-4 shadow-sm ${
                    ach.isUnlocked
                      ? 'bg-gradient-to-b from-emerald-500/10 to-surface-container border-emerald-500/40 shadow-emerald-500/5'
                      : 'bg-surface-container border-border opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold border ${
                            ach.isUnlocked
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-surface-container-high border-border text-on-surface-variant'
                          }`}
                        >
                          {ach.icon || '🏆'}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-on-surface font-['Space_Grotesk']">
                            {ach.name}
                          </h3>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                            {ach.category}
                          </span>
                        </div>
                      </div>

                      {ach.isUnlocked ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full shrink-0">
                          {t('driverEngagement.unlockedTag')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-on-surface-variant bg-surface-container-high border border-border px-2.5 py-1 rounded-full shrink-0">
                          {t('driverEngagement.lockedTag')}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed">{ach.description}</p>
                  </div>

                  {/* Progress Section */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">
                        {ach.isUnlocked ? 'Target Reached' : 'Progress'}
                      </span>
                      <span className="font-mono text-on-surface font-semibold">
                        {ach.currentValue} / {ach.targetValue}
                      </span>
                    </div>

                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden border border-border">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ach.isUnlocked ? 'bg-emerald-500' : 'bg-primary'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {ach.isUnlocked && ach.unlockedAt && (
                      <div className="flex items-center gap-1 text-[11px] text-on-surface-variant pt-1">
                        <span>
                          {t('driverEngagement.completedDate', {
                            date: new Date(ach.unlockedAt).toLocaleDateString(),
                          })}
                        </span>
                      </div>
                    )}
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
