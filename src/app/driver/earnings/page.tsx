'use client';

import { useEffect, useState } from 'react';
import { DriverLayout } from '@/components/driver-layout';
import { useTranslation } from '@/i18n/context';

interface DriverEarningsSummary {
  driverProfileId: string;
  todayEarnings: string;
  completedTripsToday: number;
  averageFarePerTrip: string;
  periodEarnings: string;
  periodTrips: number;
  availableBalance: string;
  pendingBalance: string;
  totalEarned: string;
  currency: string;
}

interface DriverGoal {
  dailyTripGoal: number;
  completedTripsToday: number;
  dailyTripProgressPercentage: number;
  weeklyEarningsGoal: number;
  earningsThisWeek: number;
  weeklyEarningsProgressPercentage: number;
}

interface DriverIncentiveChallenge {
  id: string;
  campaignId: string;
  campaignName: string;
  description: string | null;
  incentiveType: string;
  status: string;
  currentValue: number;
  targetValue: number;
  rewardAmount: number;
  progressPercentage: number;
  qualifiedAt: string | null;
  rewardedAt: string | null;
  startAt: string;
  endAt: string;
}

export default function DriverEarningsPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<DriverEarningsSummary | null>(null);
  const [goal, setGoal] = useState<DriverGoal | null>(null);
  const [incentives, setIncentives] = useState<DriverIncentiveChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGoals, setEditingGoals] = useState(false);
  const [dailyGoalInput, setDailyGoalInput] = useState('');
  const [weeklyGoalInput, setWeeklyGoalInput] = useState('');
  const [savingGoals, setSavingGoals] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [sumRes, goalRes, incRes] = await Promise.all([
          fetch('/api/driver/earnings/summary'),
          fetch('/api/driver/goals'),
          fetch('/api/driver/incentives'),
        ]);

        if (isMounted && sumRes.ok) {
          const sumData = await sumRes.json();
          setSummary(sumData.data);
        }
        if (isMounted && goalRes.ok) {
          const gData = await goalRes.json();
          setGoal(gData.data);
          setDailyGoalInput(String(gData.data.dailyTripGoal));
          setWeeklyGoalInput(String(gData.data.weeklyEarningsGoal));
        }
        if (isMounted && incRes.ok) {
          const iData = await incRes.json();
          setIncentives(iData.data ?? []);
        }
      } catch {
        // Quiet fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingGoals(true);
      const res = await fetch('/api/driver/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyTripGoal: parseInt(dailyGoalInput, 10) || 8,
          weeklyEarningsGoal: parseFloat(weeklyGoalInput) || 10000,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGoal(data.data);
        setEditingGoals(false);
      }
    } catch {
      // Error handling
    } finally {
      setSavingGoals(false);
    }
  };

  return (
    <DriverLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 dark:from-emerald-950 dark:to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-emerald-500/30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-emerald-300 font-semibold font-mono">
                FINANCIAL TELEMETRY & INCENTIVES
              </span>
              <h1 className="text-2xl md:text-3xl font-bold mt-1 font-['Space_Grotesk']">{t('driver.earnings.title')}</h1>
              <p className="text-emerald-100/80 text-sm mt-1">{t('driver.earnings.subtitle')}</p>
            </div>
            <div className="bg-black/20 backdrop-blur rounded-xl px-4 py-3 border border-white/20 text-right">
              <span className="text-xs text-emerald-100/70 block font-mono">
                {t('driver.earnings.availableBalance')}
              </span>
              <span className="text-2xl font-black text-emerald-300">
                ₹{loading ? '...' : parseFloat(summary?.availableBalance ?? '0').toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-container border border-border rounded-xl p-5 shadow-sm animate-fade-in-up">
            <span className="text-xs font-medium text-on-surface-variant block">
              {t('driver.earnings.todayEarnings')}
            </span>
            <div className="text-2xl font-bold text-on-surface mt-1">
              ₹{summary?.todayEarnings ?? '0.00'}
            </div>
            <span className="text-xs text-on-surface-variant mt-1 block">
              {summary?.completedTripsToday ?? 0} services completed today
            </span>
          </div>

          <div className="bg-surface-container border border-border rounded-xl p-5 shadow-sm animate-fade-in-up">
            <span className="text-xs font-medium text-on-surface-variant block">
              {t('driver.earnings.completedTripsToday')}
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {summary?.completedTripsToday ?? 0}
            </div>
            <span className="text-xs text-on-surface-variant mt-1 block">
              Target: {goal?.dailyTripGoal ?? 8} services
            </span>
          </div>

          <div className="bg-surface-container border border-border rounded-xl p-5 shadow-sm animate-fade-in-up">
            <span className="text-xs font-medium text-on-surface-variant block">
              {t('driver.earnings.averageFarePerTrip')}
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              ₹{summary?.averageFarePerTrip ?? '0.00'}
            </div>
            <span className="text-xs text-on-surface-variant mt-1 block">Per completed service</span>
          </div>

          <div className="bg-surface-container border border-border rounded-xl p-5 shadow-sm animate-fade-in-up">
            <span className="text-xs font-medium text-on-surface-variant block">
              {t('driver.earnings.periodEarnings')}
            </span>
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">
              ₹{summary?.periodEarnings ?? '0.00'}
            </div>
            <span className="text-xs text-on-surface-variant mt-1 block">
              {summary?.periodTrips ?? 0} services past 7 days
            </span>
          </div>
        </div>

        {/* Goals & Challenges Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Driver Goal Tracking Card */}
          <div className="bg-surface-container border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-on-surface font-['Space_Grotesk']">
                    {t('driver.earnings.goalsTitle')}
                  </h2>
                  <p className="text-xs text-on-surface-variant">Personal performance targets</p>
                </div>
                <button
                  onClick={() => setEditingGoals(!editingGoals)}
                  className="min-h-[48px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-container-high hover:bg-surface-container-highest active:opacity-90 text-primary border border-border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {editingGoals ? 'Cancel' : t('driver.earnings.updateGoals')}
                </button>
              </div>

              {editingGoals ? (
                <form
                  onSubmit={handleSaveGoals}
                  className="space-y-4 bg-surface-container-high p-4 rounded-xl border border-border"
                >
                  <div>
                    <label className="text-xs text-on-surface-variant font-medium block mb-1">
                      {t('driver.earnings.dailyGoal')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={dailyGoalInput}
                      onChange={(e) => setDailyGoalInput(e.target.value)}
                      className="w-full bg-surface-container border border-border text-on-surface rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-on-surface-variant font-medium block mb-1">
                      {t('driver.earnings.weeklyGoal')}
                    </label>
                    <input
                      type="number"
                      min="100"
                      value={weeklyGoalInput}
                      onChange={(e) => setWeeklyGoalInput(e.target.value)}
                      className="w-full bg-surface-container border border-border text-on-surface rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingGoals}
                    className="w-full min-h-[48px] bg-primary hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-on-primary text-xs font-bold py-2 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {savingGoals ? 'Saving...' : t('driver.earnings.saveGoals')}
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Daily Trip Progress */}
                  <div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-on-surface font-medium">
                        {t('driver.earnings.dailyGoal')}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {goal?.completedTripsToday ?? 0} / {goal?.dailyTripGoal ?? 8} services
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${goal?.dailyTripProgressPercentage ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-on-surface-variant mt-1 block text-right">
                      {goal?.dailyTripProgressPercentage ?? 0}% Completed
                    </span>
                  </div>

                  {/* Weekly Earnings Progress */}
                  <div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-on-surface font-medium">
                        {t('driver.earnings.weeklyGoal')}
                      </span>
                      <span className="text-sky-600 dark:text-sky-400 font-bold">
                        ₹{goal?.earningsThisWeek ?? 0} / ₹{goal?.weeklyEarningsGoal ?? 10000}
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${goal?.weeklyEarningsProgressPercentage ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-on-surface-variant mt-1 block text-right">
                      {goal?.weeklyEarningsProgressPercentage ?? 0}% Completed
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Incentive Challenges List */}
          <div className="bg-surface-container border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-on-surface mb-1 font-['Space_Grotesk']">
              {t('driver.earnings.activeChallenges')}
            </h2>
            <p className="text-xs text-on-surface-variant mb-6">
              Complete requirements to unlock cash rewards directly into your wallet
            </p>

            {incentives.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-xl">
                <span className="text-on-surface-variant text-sm block">
                  {t('driver.earnings.noActiveChallenges')}
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {incentives.map((challenge) => {
                  const remaining = Math.max(0, challenge.targetValue - challenge.currentValue);
                  const isRewarded = challenge.status === 'REWARDED';

                  return (
                    <div
                      key={challenge.id}
                      className="bg-surface-container-high border border-border rounded-xl p-4 transition hover:border-primary/50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-sm font-bold text-on-surface">{challenge.campaignName}</h3>
                          {challenge.description && (
                            <p className="text-xs text-on-surface-variant mt-0.5">{challenge.description}</p>
                          )}
                        </div>
                        <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black px-2.5 py-1 rounded-lg">
                          +₹{challenge.rewardAmount}
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="text-on-surface-variant">
                            Progress: {challenge.currentValue} / {challenge.targetValue}
                          </span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {isRewarded ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                ✓ {t('driver.earnings.unlockedTag')}
                              </span>
                            ) : (
                              `${challenge.progressPercentage}%`
                            )}
                          </span>
                        </div>
                        <div className="w-full bg-surface-container-highest h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isRewarded
                                ? 'bg-emerald-500'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            }`}
                            style={{ width: `${challenge.progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      {!isRewarded && remaining > 0 && (
                        <div className="mt-3 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/30 font-medium">
                          ⚡{' '}
                          {t('driver.earnings.rewardTeaser', {
                            remaining: String(remaining),
                            reward: String(challenge.rewardAmount),
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DriverLayout>
  );
}
