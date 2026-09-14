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
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-emerald-500/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                FINANCIAL TELEMETRY & INCENTIVES
              </span>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">{t('driver.earnings.title')}</h1>
              <p className="text-slate-300 text-sm mt-1">{t('driver.earnings.subtitle')}</p>
            </div>
            <div className="bg-slate-800/80 backdrop-blur rounded-xl px-4 py-3 border border-slate-700 text-right">
              <span className="text-xs text-slate-400 block">{t('driver.earnings.availableBalance')}</span>
              <span className="text-2xl font-black text-emerald-400">
                ₹{loading ? '...' : parseFloat(summary?.availableBalance ?? '0').toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-[#121212] grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <span className="text-xs font-medium text-slate-400 block">{t('driver.earnings.todayEarnings')}</span>
            <div className="text-2xl font-bold text-white mt-1">₹{summary?.todayEarnings ?? '0.00'}</div>
            <span className="text-xs text-slate-500 mt-1 block">{summary?.completedTripsToday ?? 0} trips completed today</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <span className="text-xs font-medium text-slate-400 block">{t('driver.earnings.completedTripsToday')}</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{summary?.completedTripsToday ?? 0}</div>
            <span className="text-xs text-slate-500 mt-1 block">Target: {goal?.dailyTripGoal ?? 8} trips</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <span className="text-xs font-medium text-slate-400 block">{t('driver.earnings.averageFarePerTrip')}</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">₹{summary?.averageFarePerTrip ?? '0.00'}</div>
            <span className="text-xs text-slate-500 mt-1 block">Per completed ride</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <span className="text-xs font-medium text-slate-400 block">{t('driver.earnings.periodEarnings')}</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">₹{summary?.periodEarnings ?? '0.00'}</div>
            <span className="text-xs text-slate-500 mt-1 block">{summary?.periodTrips ?? 0} trips past 7 days</span>
          </div>
        </div>

        {/* Goals & Challenges Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Driver Goal Tracking Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">{t('driver.earnings.goalsTitle')}</h2>
                  <p className="text-xs text-slate-400">Personal performance targets</p>
                </div>
                <button
                  onClick={() => setEditingGoals(!editingGoals)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition"
                >
                  {editingGoals ? 'Cancel' : t('driver.earnings.updateGoals')}
                </button>
              </div>

              {editingGoals ? (
                <form onSubmit={handleSaveGoals} className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">
                      {t('driver.earnings.dailyGoal')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={dailyGoalInput}
                      onChange={(e) => setDailyGoalInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">
                      {t('driver.earnings.weeklyGoal')}
                    </label>
                    <input
                      type="number"
                      min="100"
                      value={weeklyGoalInput}
                      onChange={(e) => setWeeklyGoalInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingGoals}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition"
                  >
                    {savingGoals ? 'Saving...' : t('driver.earnings.saveGoals')}
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Daily Trip Progress */}
                  <div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-slate-300 font-medium">{t('driver.earnings.dailyGoal')}</span>
                      <span className="text-emerald-400 font-bold">
                        {goal?.completedTripsToday ?? 0} / {goal?.dailyTripGoal ?? 8} trips
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${goal?.dailyTripProgressPercentage ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block text-right">
                      {goal?.dailyTripProgressPercentage ?? 0}% Completed
                    </span>
                  </div>

                  {/* Weekly Earnings Progress */}
                  <div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-slate-300 font-medium">{t('driver.earnings.weeklyGoal')}</span>
                      <span className="text-cyan-400 font-bold">
                        ₹{goal?.earningsThisWeek ?? 0} / ₹{goal?.weeklyEarningsGoal ?? 10000}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${goal?.weeklyEarningsProgressPercentage ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block text-right">
                      {goal?.weeklyEarningsProgressPercentage ?? 0}% Completed
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Incentive Challenges List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-1">{t('driver.earnings.activeChallenges')}</h2>
            <p className="text-xs text-slate-400 mb-6">Complete requirements to unlock cash rewards directly into your wallet</p>

            {incentives.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                <span className="text-slate-500 text-sm block">
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
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 transition hover:border-slate-700"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-sm font-bold text-white">{challenge.campaignName}</h3>
                          {challenge.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{challenge.description}</p>
                          )}
                        </div>
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/50 text-xs font-black px-2.5 py-1 rounded-lg">
                          +₹{challenge.rewardAmount}
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="text-slate-400">
                            Progress: {challenge.currentValue} / {challenge.targetValue}
                          </span>
                          <span className="font-semibold text-emerald-400">
                            {isRewarded ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                ✓ {t('driver.earnings.unlockedTag')}
                              </span>
                            ) : (
                              `${challenge.progressPercentage}%`
                            )}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isRewarded ? 'bg-emerald-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            }`}
                            style={{ width: `${challenge.progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      {!isRewarded && remaining > 0 && (
                        <div className="mt-3 text-xs bg-slate-900/90 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/20 font-medium">
                          ⚡ {t('driver.earnings.rewardTeaser', {
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
