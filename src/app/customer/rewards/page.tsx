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
                      'Enjoy priority matching and points multiplier on all completed rides.',
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
        return 'bg-purple-950/60 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]';
      case 'GOLD':
        return 'bg-amber-950/60 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
      case 'SILVER':
        return 'bg-slate-800/80 border-slate-400/50 text-slate-200';
      default:
        return 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300';
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER TITLE */}
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#68dba9] uppercase">
            {t('customer.rewards.eyebrow')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
            {t('customer.rewards.title')}
          </h1>
          <p className="text-xs sm:text-sm text-[#bccac0] mt-1">{t('customer.rewards.subtitle')}</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="px-2 py-1 bg-red-900/60 hover:bg-red-800/80 rounded text-[11px] font-bold"
            >
              {t('common.actions.retry')}
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-[#bccac0] text-sm font-mono animate-pulse">
            {t('common.labels.loading')}
          </div>
        ) : (
          account && (
            <>
              {/* TIER STATUS CARD */}
              <div className="relative overflow-hidden rounded-2xl bg-[#141822] border border-[#262a33] p-6 shadow-2xl">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                  <span className="material-symbols-outlined text-9xl text-[#68dba9]">
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
                      <span className="text-xs text-[#bccac0] font-mono">
                        {account.currentTier?.multiplier}x Points Multiplier
                      </span>
                    </div>

                    <div className="flex items-baseline gap-4">
                      <div>
                        <span className="text-3xl sm:text-4xl font-extrabold text-[#68dba9] font-['Space_Grotesk']">
                          {account.pointsBalance.toLocaleString()}
                        </span>
                        <span className="text-xs text-[#bccac0] ml-2 font-mono uppercase">
                          {t('customer.rewards.tierCard.pointsBalance')}
                        </span>
                      </div>
                      <div className="border-l border-[#262a33] pl-4">
                        <span className="text-lg font-bold text-[#dfe2ee]">
                          {account.lifetimePoints.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-[#87948b] ml-1.5 font-mono">
                          {t('customer.rewards.tierCard.lifetimePoints')}
                        </span>
                      </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#dfe2ee]">
                          {account.nextTier
                            ? t('customer.rewards.tierCard.progressTo', {
                                tier: account.nextTier.name,
                              })
                            : t('customer.rewards.tierCard.maxTier')}
                        </span>
                        {account.nextTier && (
                          <span className="text-[#68dba9]">
                            {t('customer.rewards.tierCard.pointsNeeded', {
                              points: account.pointsToNextTier.toLocaleString(),
                              tier: account.nextTier.name,
                            })}
                          </span>
                        )}
                      </div>
                      <div className="h-2.5 w-full bg-[#1e2330] rounded-full overflow-hidden border border-[#262a33]">
                        <div
                          className="h-full bg-gradient-to-r from-[#25a475] to-[#68dba9] transition-all duration-500"
                          style={{
                            width: `${Math.min(100, account.tierProgressPercentage)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* BENEFITS QUICK SUMMARY */}
                  <div className="bg-[#1a1f2e] border border-[#262a33] rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-[#68dba9]">
                        Tier Benefits
                      </span>
                      <p className="text-xs text-[#dfe2ee] mt-1 leading-relaxed">
                        {account.currentTier?.benefitsSummary ||
                          'Enjoy priority booking matching and points multiper on all completed rides.'}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#262a33] text-[11px] text-[#bccac0] font-mono">
                      Completed trips earn 10 points per ₹100 spent.
                    </div>
                  </div>
                </div>
              </div>

              {/* REWARDS CATALOG GRID */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    {t('customer.rewards.catalog.title')}
                  </h2>
                  <span className="text-xs text-[#bccac0] font-mono">
                    {rewards.length} rewards available
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        className="bg-[#141822] border border-[#262a33] rounded-xl p-5 flex flex-col justify-between hover:border-[#384052] transition-colors space-y-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] leading-snug">
                              {reward.title}
                            </h3>
                            <span className="px-2 py-0.5 rounded bg-[#68dba9]/10 text-[#68dba9] border border-[#68dba9]/30 text-[10px] font-mono font-bold shrink-0">
                              {reward.pointsCost} PTS
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono text-[#bccac0]">
                            <span className="px-1.5 py-0.5 rounded bg-[#1e2330] border border-[#262a33]">
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
                          <div className="p-3 bg-[#00311f] border border-[#25a475] rounded-lg text-center font-mono">
                            <span className="text-[10px] text-[#bccac0] block uppercase">
                              Promo Code
                            </span>
                            <span className="text-sm font-extrabold text-[#68dba9] tracking-wider select-all">
                              {showCode}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleRedeem(reward.id)}
                            disabled={isInsufficient || isTierLocked || isRedeemed || isRedeeming}
                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
                              isRedeemed
                                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                                : isInsufficient || isTierLocked
                                  ? 'bg-[#181c24] text-[#87948b] cursor-not-allowed border border-[#262a33]'
                                  : 'bg-[#25a475] hover:bg-[#208e65] text-[#00311f] shadow-lg shadow-[#25a475]/20'
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
                <h2 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  {t('customer.rewards.history.title')}
                </h2>

                <div className="bg-[#141822] border border-[#262a33] rounded-2xl overflow-hidden shadow-xl">
                  {transactions.length === 0 ? (
                    <div className="p-8 text-center text-[#bccac0] text-xs font-mono">
                      {t('customer.rewards.history.noHistory')}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#262a33] bg-[#0a0e16]/60 text-[11px] font-mono text-[#bccac0] uppercase tracking-wider">
                            <th className="p-3.5">{t('customer.rewards.history.type')}</th>
                            <th className="p-3.5">{t('customer.rewards.history.points')}</th>
                            <th className="p-3.5">{t('customer.rewards.history.description')}</th>
                            <th className="p-3.5">{t('customer.rewards.history.date')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#262a33] text-xs font-mono">
                          {transactions.map((tx) => {
                            const isPositive = tx.points > 0;
                            return (
                              <tr key={tx.id} className="hover:bg-[#1c2028] transition-colors">
                                <td className="p-3.5 font-bold text-[#dfe2ee]">
                                  {tx.transactionType}
                                </td>
                                <td
                                  className={`p-3.5 font-bold ${
                                    isPositive ? 'text-[#68dba9]' : 'text-rose-400'
                                  }`}
                                >
                                  {isPositive ? `+${tx.points}` : tx.points}
                                </td>
                                <td className="p-3.5 text-[#bccac0] max-w-xs truncate">
                                  {tx.reason}
                                </td>
                                <td className="p-3.5 text-[#87948b]">
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
