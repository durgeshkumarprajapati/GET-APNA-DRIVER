'use client';

import { useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/customer-layout';
import { useTranslation } from '@/i18n/context';

interface LoyaltyAccountSummary {
  pointsBalance: number;
  lifetimePoints: number;
  tierCode: string;
  currentTier: {
    name: string;
    tierCode: string;
    multiplier: number;
    benefitsSummary: string | null;
  } | null;
  nextTier: {
    name: string;
    tierCode: string;
    minPoints: number;
  } | null;
  pointsToNextTier: number;
  tierProgressPercentage: number;
}

interface LoyaltyRewardCatalogItem {
  id: string;
  rewardCode: string;
  title: string;
  rewardType: string;
  pointsCost: number;
  minTierCode: string;
  discountType: string;
  discountValue: number;
  active: boolean;
  singleUse: boolean;
  redeemedByCustomer?: boolean;
}

interface LoyaltyPointTransaction {
  id: string;
  transactionType: string;
  points: number;
  runningBalance: number;
  reason: string;
  createdAt: string;
}

export default function CustomerRewardsPage() {
  const { t } = useTranslation();
  const [account, setAccount] = useState<LoyaltyAccountSummary | null>(null);
  const [rewards, setRewards] = useState<LoyaltyRewardCatalogItem[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyPointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemedCode, setRedeemedCode] = useState<{ id: string; code: string } | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadLoyaltyData() {
      try {
        const [accountRes, rewardsRes, txRes] = await Promise.all([
          fetch('/api/customer/loyalty'),
          fetch('/api/customer/loyalty/rewards'),
          fetch('/api/customer/loyalty/transactions'),
        ]);

        if (!accountRes.ok) {
          throw new Error('Failed to load loyalty account');
        }

        const accountData = await accountRes.json();
        const rewardsData = rewardsRes.ok ? await rewardsRes.json() : null;
        const txData = txRes.ok ? await txRes.json() : null;

        if (!ignore) {
          const summary = accountData.data || accountData.account || accountData;
          if (summary) {
            setAccount({
              pointsBalance: summary.currentPoints ?? summary.pointsBalance ?? 0,
              lifetimePoints: summary.lifetimeEarnedPoints ?? summary.lifetimePoints ?? 0,
              tierCode: summary.currentTier?.code || summary.tierCode || 'BRONZE',
              currentTier: summary.currentTier
                ? {
                    name: summary.currentTier.name,
                    tierCode: summary.currentTier.code || summary.currentTier.tierCode,
                    multiplier:
                      summary.currentTier.pointMultiplier ?? summary.currentTier.multiplier ?? 1,
                    benefitsSummary:
                      summary.currentTier.benefitsSummary ||
                      'Enjoy priority matching and points multiplier on all completed bookings.',
                  }
                : null,
              nextTier: summary.nextTier
                ? {
                    name: summary.nextTier.name,
                    tierCode: summary.nextTier.code || summary.nextTier.tierCode,
                    minPoints:
                      summary.nextTier.minimumLifetimePoints ?? summary.nextTier.minPoints ?? 0,
                  }
                : null,
              pointsToNextTier: summary.nextTier?.pointsNeeded ?? summary.pointsToNextTier ?? 0,
              tierProgressPercentage:
                summary.nextTier?.progressPercentage ?? summary.tierProgressPercentage ?? 100,
            });
          }

          const rawRewards =
            rewardsData?.data || rewardsData?.catalog || rewardsData?.rewards || [];
          if (Array.isArray(rawRewards)) {
            setRewards(
              rawRewards.map((r: Record<string, unknown>) => ({
                id: String(r.id),
                rewardCode:
                  typeof r.rewardCode === 'string'
                    ? r.rewardCode
                    : typeof r.code === 'string'
                      ? r.code
                      : `RWD-${String(r.id).substring(0, 6)}`,
                title: typeof r.title === 'string' ? r.title : String(r.name || 'Reward'),
                rewardType: typeof r.rewardType === 'string' ? r.rewardType : 'PROMOTION',
                pointsCost:
                  typeof r.pointsRequired === 'number'
                    ? r.pointsRequired
                    : typeof r.pointsCost === 'number'
                      ? r.pointsCost
                      : 100,
                minTierCode:
                  (r.minimumTier as { code?: string })?.code ||
                  (typeof r.minTierCode === 'string' ? r.minTierCode : 'BRONZE'),
                discountType: typeof r.discountType === 'string' ? r.discountType : 'FIXED',
                discountValue: Number(r.discountValue) || 50,
                active: r.status === 'ACTIVE' || r.active === true,
                singleUse: Boolean(r.singleUse),
                redeemedByCustomer:
                  r.canRedeem === false &&
                  typeof r.lockReason === 'string' &&
                  r.lockReason.includes('reached'),
                canRedeem: r.canRedeem !== false,
                lockReason: typeof r.lockReason === 'string' ? r.lockReason : null,
              })),
            );
          }

          const rawTx =
            txData?.data || txData?.transactions || (Array.isArray(txData) ? txData : []);
          if (Array.isArray(rawTx)) {
            setTransactions(rawTx);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error loading loyalty data');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadLoyaltyData();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const handleRedeem = async (rewardId: string) => {
    try {
      setRedeemingId(rewardId);
      setError(null);
      const res = await fetch(`/api/customer/loyalty/rewards/${rewardId}/redeem`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to redeem reward');
      }

      if (data.redemption?.promoCode) {
        setRedeemedCode({ id: rewardId, code: data.redemption.promoCode });
      }

      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error redeeming reward');
    } finally {
      setRedeemingId(null);
    }
  };

  const getTierBadgeStyle = (code?: string) => {
    switch (code) {
      case 'PLATINUM':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-300 shadow-sm';
      case 'GOLD':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300 shadow-sm';
      case 'SILVER':
        return 'bg-surface-container-high border-border text-on-surface';
      default:
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER TITLE */}
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-primary uppercase">
            {t('customer.rewards.eyebrow')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
            {t('customer.rewards.title')}
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">{t('customer.rewards.subtitle')}</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="min-h-[40px] px-2 py-1 bg-destructive/20 hover:bg-destructive/30 rounded text-[11px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
            >
              {t('common.actions.retry')}
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-on-surface-variant text-sm font-mono animate-pulse">
            {t('common.labels.loading')}
          </div>
        ) : (
          account && (
            <>
              {/* TIER STATUS CARD */}
              <div className="relative overflow-hidden rounded-2xl bg-surface-container border border-border p-6 shadow-sm animate-fade-in-up">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                  <span className="material-symbols-outlined text-9xl text-primary">
                    workspace_premium
                  </span>
                </div>

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* TIER & POINTS */}
                  <div className="space-y-4 md:col-span-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full border text-xs font-mono font-bold uppercase tracking-wider ${getTierBadgeStyle(
                          account.tierCode,
                        )}`}
                      >
                        {account.currentTier?.name || account.tierCode}
                      </span>
                      <span className="text-xs text-on-surface-variant font-mono">
                        {account.currentTier?.multiplier}x Points Multiplier
                      </span>
                    </div>

                    <div className="flex items-baseline gap-4">
                      <div>
                        <span className="text-3xl sm:text-4xl font-extrabold text-primary font-['Space_Grotesk']">
                          {account.pointsBalance.toLocaleString()}
                        </span>
                        <span className="text-xs text-on-surface-variant ml-2 font-mono uppercase">
                          {t('customer.rewards.tierCard.pointsBalance')}
                        </span>
                      </div>
                      <div className="border-l border-border pl-4">
                        <span className="text-lg font-bold text-on-surface">
                          {account.lifetimePoints.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-on-surface-variant ml-1.5 font-mono">
                          {t('customer.rewards.tierCard.lifetimePoints')}
                        </span>
                      </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-on-surface">
                          {account.nextTier
                            ? t('customer.rewards.tierCard.progressTo', {
                                tier: account.nextTier.name,
                              })
                            : t('customer.rewards.tierCard.maxTier')}
                        </span>
                        {account.nextTier && (
                          <span className="text-primary font-bold">
                            {t('customer.rewards.tierCard.pointsNeeded', {
                              points: account.pointsToNextTier.toLocaleString(),
                              tier: account.nextTier.name,
                            })}
                          </span>
                        )}
                      </div>
                      <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden border border-border">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, account.tierProgressPercentage)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* BENEFITS QUICK SUMMARY */}
                  <div className="bg-surface-container-high border border-border rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-primary">
                        Tier Benefits
                      </span>
                      <p className="text-xs text-on-surface mt-1 leading-relaxed">
                        {account.currentTier?.benefitsSummary ||
                          'Enjoy priority booking matching and points multiper on all completed bookings.'}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border text-[11px] text-on-surface-variant font-mono">
                      Completed bookings earn 10 points per ₹100 spent.
                    </div>
                  </div>
                </div>
              </div>

              {/* REWARDS CATALOG GRID */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-on-surface font-['Space_Grotesk']">
                    {t('customer.rewards.catalog.title')}
                  </h2>
                  <span className="text-xs text-on-surface-variant font-mono">
                    {rewards.length} rewards available
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
                  {rewards.map((reward) => {
                    const isInsufficient = account.pointsBalance < reward.pointsCost;
                    const isTierLocked =
                      account.tierCode === 'BRONZE' &&
                      reward.minTierCode !== 'BRONZE' &&
                      reward.minTierCode !== 'SILVER'
                        ? true
                        : false;
                    const isRedeemed = reward.redeemedByCustomer;
                    const isRedeeming = redeemingId === reward.id;
                    const showCode = redeemedCode?.id === reward.id ? redeemedCode.code : null;

                    return (
                      <div
                        key={reward.id}
                        className="bg-surface-container border border-border rounded-xl p-5 flex flex-col justify-between hover:border-primary/40 transition-colors space-y-4 shadow-sm"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-on-surface font-['Space_Grotesk'] leading-snug">
                              {reward.title}
                            </h3>
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 text-[10px] font-mono font-bold shrink-0">
                              {reward.pointsCost} PTS
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant">
                            <span className="px-1.5 py-0.5 rounded bg-surface-container-high border border-border">
                              Min: {reward.minTierCode}
                            </span>
                            <span>
                              {reward.discountType === 'PERCENTAGE'
                                ? `${reward.discountValue}% OFF`
                                : `₹${reward.discountValue} OFF`}
                            </span>
                          </div>
                        </div>

                        {showCode ? (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center font-mono">
                            <span className="text-[10px] text-on-surface-variant block uppercase">
                              Promo Code
                            </span>
                            <span className="text-sm font-extrabold text-primary tracking-wider select-all">
                              {showCode}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleRedeem(reward.id)}
                            disabled={isInsufficient || isTierLocked || isRedeemed || isRedeeming}
                            className={`min-h-[44px] w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed ${
                              isRedeemed
                                ? 'bg-surface-container-highest text-on-surface-variant border border-border'
                                : isInsufficient || isTierLocked
                                  ? 'bg-surface-container-high text-on-surface-variant border border-border'
                                  : 'bg-primary hover:opacity-90 active:opacity-100 text-on-primary shadow-md'
                            }`}
                          >
                            {isRedeeming ? (
                              <span>{t('customer.rewards.catalog.redeeming')}</span>
                            ) : isRedeemed ? (
                              <span>{t('customer.rewards.catalog.redeemed')}</span>
                            ) : isTierLocked ? (
                              <span>
                                {t('customer.rewards.catalog.tierRequired', {
                                  tier: reward.minTierCode,
                                })}
                              </span>
                            ) : isInsufficient ? (
                              <span>{t('customer.rewards.catalog.insufficientPoints')}</span>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-sm">redeem</span>
                                <span>{t('customer.rewards.catalog.redeemBtn')}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* POINTS TRANSACTION HISTORY */}
              <div className="space-y-4 pt-4">
                <h2 className="text-xl font-bold text-on-surface font-['Space_Grotesk']">
                  {t('customer.rewards.history.title')}
                </h2>

                <div className="bg-surface-container border border-border rounded-2xl overflow-hidden shadow-sm">
                  {transactions.length === 0 ? (
                    <div className="p-8 text-center text-on-surface-variant text-xs font-mono">
                      {t('customer.rewards.history.noHistory')}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-surface-container-high/60 text-[11px] font-mono text-on-surface-variant uppercase tracking-wider">
                            <th className="p-3.5">{t('customer.rewards.history.type')}</th>
                            <th className="p-3.5">{t('customer.rewards.history.points')}</th>
                            <th className="p-3.5">{t('customer.rewards.history.description')}</th>
                            <th className="p-3.5">{t('customer.rewards.history.date')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-xs font-mono">
                          {transactions.map((tx) => {
                            const isPositive = tx.points > 0;
                            return (
                              <tr key={tx.id} className="hover:bg-surface-container-high/50 transition-colors">
                                <td className="p-3.5 font-bold text-on-surface">
                                  {tx.transactionType}
                                </td>
                                <td
                                  className={`p-3.5 font-bold ${
                                    isPositive ? 'text-primary' : 'text-destructive'
                                  }`}
                                >
                                  {isPositive ? `+${tx.points}` : tx.points}
                                </td>
                                <td className="p-3.5 text-on-surface-variant max-w-xs truncate">
                                  {tx.reason}
                                </td>
                                <td className="p-3.5 text-on-surface-variant">
                                  {new Date(tx.createdAt).toLocaleDateString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )
        )}
      </div>
    </CustomerLayout>
  );
}
