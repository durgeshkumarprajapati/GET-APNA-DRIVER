'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { LoadingState } from '@/components/ui/loading-state';
import { formatCurrency } from '@/shared/formatting/money';

interface ReferralCampaign {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'ARCHIVED';
  audience: 'ALL' | 'CUSTOMER' | 'DRIVER';
  rewardType: 'MONETARY' | 'LOYALTY_POINTS' | 'PROMOTION_DISCOUNT';
  referrerRewardValue: string;
  refereeRewardValue: string | null;
  maxRewardsTotal: number | null;
  currentRewardCount: number;
  currentRewardSpent: string;
  startsAt: string | null;
  endsAt: string | null;
}

interface ReferralGrowthAnalytics {
  totalAttributed: number;
  totalRegistered: number;
  totalQualified: number;
  totalRewarded: number;
  totalRejected: number;
  conversionRatePercent: number;
  totalRewardedSpend: number;
  avgTimeToConversionHours: number;
  activeCampaignsCount: number;
  customerReferrals: {
    total: number;
    rewarded: number;
    totalEarned: number;
  };
  driverReferrals: {
    total: number;
    rewarded: number;
    totalEarned: number;
  };
}

export default function AdminReferralGrowthPage() {
  const [analytics, setAnalytics] = useState<ReferralGrowthAnalytics | null>(null);
  const [campaigns, setCampaigns] = useState<ReferralCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal Form State
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAudience, setNewAudience] = useState<'ALL' | 'CUSTOMER' | 'DRIVER'>('ALL');
  const [newRewardType, setNewRewardType] = useState<
    'MONETARY' | 'LOYALTY_POINTS' | 'PROMOTION_DISCOUNT'
  >('MONETARY');
  const [newReferrerReward, setNewReferrerReward] = useState('');
  const [newRefereeReward, setNewRefereeReward] = useState('');
  const [newMaxRewards, setNewMaxRewards] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [growthRes, campRes] = await Promise.all([
        fetch('/api/admin/referral-growth'),
        fetch('/api/admin/referral-campaigns'),
      ]);

      if (growthRes.ok) {
        const data = await growthRes.json();
        setAnalytics(data.analytics);
      }
      if (campRes.ok) {
        const data = await campRes.json();
        setCampaigns(data.campaigns);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referral growth data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetch('/api/admin/referral-growth'), fetch('/api/admin/referral-campaigns')])
      .then(async ([growthRes, campRes]) => {
        if (!active) return;
        if (growthRes.ok) {
          const data = await growthRes.json();
          setAnalytics(data.analytics);
        }
        if (campRes.ok) {
          const data = await campRes.json();
          setCampaigns(data.campaigns);
        }
      })
      .catch((err) => {
        if (active)
          setError(err instanceof Error ? err.message : 'Failed to load referral growth data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/referral-campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Failed to update campaign status.');
      }
      setMessage(`Campaign status updated to ${newStatus}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName || !newReferrerReward) {
      setError('Please fill out all required campaign fields.');
      return;
    }
    setCreating(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/referral-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          name: newName,
          description: newDesc || undefined,
          audience: newAudience,
          rewardType: newRewardType,
          referrerRewardValue: Number(newReferrerReward),
          refereeRewardValue: newRefereeReward ? Number(newRefereeReward) : undefined,
          maxRewardsTotal: newMaxRewards ? Number(newMaxRewards) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to create campaign.');
      }

      setMessage(`Campaign ${data.campaign.code} created successfully.`);
      setIsModalOpen(false);
      setNewCode('');
      setNewName('');
      setNewDesc('');
      setNewReferrerReward('');
      setNewRefereeReward('');
      setNewMaxRewards('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign.');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#00311f] text-[#68dba9] border border-[#25a475]">
            ACTIVE
          </span>
        );
      case 'PAUSED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#3d2e00] text-[#ffc847] border border-[#8a6800]">
            PAUSED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1f2430] text-[#87948b] border border-[#262a33]">
            DRAFT
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#341115] text-[#ffb4ab] border border-[#93000a]">
            {status}
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
        <PageHeader
          eyebrow="Growth & Marketing"
          title="Referral 2.0 & Growth Campaign Engine"
          subtitle="Configure referral campaigns, track customer & driver acquisition funnels, and monitor referral reward expenditure."
          actions={
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs font-['Space_Grotesk'] transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Create Campaign
            </button>
          }
        />

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="p-4 rounded-xl border border-[#25a475] bg-[#00311f]/40 text-[#68dba9] text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading Referral 2.0 Growth Engine data…" />
        ) : (
          <>
            {/* Growth Analytics Funnel Cards */}
            {analytics && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Attributed"
                  value={analytics.totalAttributed}
                  accent="default"
                />
                <MetricCard
                  label="Qualified & Rewarded"
                  value={analytics.totalQualified}
                  accent="positive"
                />
                <MetricCard
                  label="Funnel Conversion Rate"
                  value={`${analytics.conversionRatePercent}%`}
                  accent="positive"
                />
                <MetricCard
                  label="Total Reward Spend"
                  value={formatCurrency(analytics.totalRewardedSpend)}
                  accent="positive"
                />
              </div>
            )}

            {/* Customer vs Driver Performance Breakdown */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#181c24] border border-[#262a33] flex flex-col gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#68dba9] font-['Space_Grotesk']">
                    Customer Referral Growth
                  </span>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-3 bg-[#0a0e16] rounded-xl border border-[#262a33]">
                      <span className="text-[10px] text-[#87948b] uppercase block font-bold">
                        Total
                      </span>
                      <span className="text-lg font-bold text-[#dfe2ee]">
                        {analytics.customerReferrals.total}
                      </span>
                    </div>
                    <div className="p-3 bg-[#0a0e16] rounded-xl border border-[#262a33]">
                      <span className="text-[10px] text-[#87948b] uppercase block font-bold">
                        Rewarded
                      </span>
                      <span className="text-lg font-bold text-[#68dba9]">
                        {analytics.customerReferrals.rewarded}
                      </span>
                    </div>
                    <div className="p-3 bg-[#0a0e16] rounded-xl border border-[#262a33]">
                      <span className="text-[10px] text-[#87948b] uppercase block font-bold">
                        Spent
                      </span>
                      <span className="text-lg font-bold text-[#68dba9]">
                        {formatCurrency(analytics.customerReferrals.totalEarned)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#181c24] border border-[#262a33] flex flex-col gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#70baff] font-['Space_Grotesk']">
                    Driver Partner Referral Growth
                  </span>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-3 bg-[#0a0e16] rounded-xl border border-[#262a33]">
                      <span className="text-[10px] text-[#87948b] uppercase block font-bold">
                        Total
                      </span>
                      <span className="text-lg font-bold text-[#dfe2ee]">
                        {analytics.driverReferrals.total}
                      </span>
                    </div>
                    <div className="p-3 bg-[#0a0e16] rounded-xl border border-[#262a33]">
                      <span className="text-[10px] text-[#87948b] uppercase block font-bold">
                        Rewarded
                      </span>
                      <span className="text-lg font-bold text-[#70baff]">
                        {analytics.driverReferrals.rewarded}
                      </span>
                    </div>
                    <div className="p-3 bg-[#0a0e16] rounded-xl border border-[#262a33]">
                      <span className="text-[10px] text-[#87948b] uppercase block font-bold">
                        Spent
                      </span>
                      <span className="text-lg font-bold text-[#70baff]">
                        {formatCurrency(analytics.driverReferrals.totalEarned)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Campaign Management Engine */}
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Referral Growth Campaigns ({campaigns.length})
                </h2>
              </div>

              {campaigns.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#87948b] bg-[#181c24] rounded-2xl border border-[#262a33]">
                  No referral campaigns configured yet. Create a campaign to start growth
                  acquisition incentives.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#262a33] bg-[#181c24]">
                  <table className="w-full text-left text-xs text-[#dfe2ee]">
                    <thead className="bg-[#0a0e16] text-[#87948b] uppercase tracking-wider text-[10px] font-bold border-b border-[#262a33]">
                      <tr>
                        <th className="p-4">Code</th>
                        <th className="p-4">Name</th>
                        <th className="p-4">Audience</th>
                        <th className="p-4">Reward</th>
                        <th className="p-4">Spent / Cap</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262a33]">
                      {campaigns.map((camp) => (
                        <tr key={camp.id} className="hover:bg-[#1f2430] transition-colors">
                          <td className="p-4 font-mono font-bold text-[#68dba9]">{camp.code}</td>
                          <td className="p-4 font-bold">
                            <div>{camp.name}</div>
                            {camp.description && (
                              <span className="text-[10px] text-[#87948b] font-normal">
                                {camp.description}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-[#87948b] font-mono">{camp.audience}</td>
                          <td className="p-4 font-mono text-[#68dba9]">
                            {formatCurrency(Number(camp.referrerRewardValue))}
                          </td>
                          <td className="p-4 text-[#87948b]">
                            {formatCurrency(Number(camp.currentRewardSpent))} /{' '}
                            {camp.maxRewardsTotal ? `${camp.maxRewardsTotal} max` : '∞'}
                          </td>
                          <td className="p-4">{getStatusBadge(camp.status)}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {camp.status !== 'ACTIVE' && (
                                <button
                                  type="button"
                                  disabled={updatingId === camp.id}
                                  onClick={() => handleStatusChange(camp.id, 'ACTIVE')}
                                  className="px-2.5 py-1 rounded-lg bg-[#00311f] hover:bg-[#25a475]/30 text-[#68dba9] text-[10px] font-bold border border-[#25a475] disabled:opacity-50"
                                >
                                  Activate
                                </button>
                              )}
                              {camp.status === 'ACTIVE' && (
                                <button
                                  type="button"
                                  disabled={updatingId === camp.id}
                                  onClick={() => handleStatusChange(camp.id, 'PAUSED')}
                                  className="px-2.5 py-1 rounded-lg bg-[#3d2e00] hover:bg-[#8a6800]/30 text-[#ffc847] text-[10px] font-bold border border-[#8a6800] disabled:opacity-50"
                                >
                                  Pause
                                </button>
                              )}
                              {camp.status !== 'ARCHIVED' && (
                                <button
                                  type="button"
                                  disabled={updatingId === camp.id}
                                  onClick={() => handleStatusChange(camp.id, 'ARCHIVED')}
                                  className="px-2.5 py-1 rounded-lg bg-[#341115] hover:bg-[#93000a]/30 text-[#ffb4ab] text-[10px] font-bold border border-[#93000a] disabled:opacity-50"
                                >
                                  Archive
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal: Create Campaign */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-xl bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-4">
                <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Create Referral Campaign
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#87948b] hover:text-[#dfe2ee]"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateCampaign} className="flex flex-col gap-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#87948b] uppercase font-bold text-[10px] mb-1">
                      Campaign Code *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SUMMER2026"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e16] border border-[#262a33] font-mono text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[#87948b] uppercase font-bold text-[10px] mb-1">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Summer Friend Referral"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#87948b] uppercase font-bold text-[10px] mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Short campaign rules or promo description"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#87948b] uppercase font-bold text-[10px] mb-1">
                      Target Audience
                    </label>
                    <select
                      value={newAudience}
                      onChange={(e) =>
                        setNewAudience(e.target.value as 'ALL' | 'CUSTOMER' | 'DRIVER')
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                    >
                      <option value="ALL">All Users (Customer & Driver)</option>
                      <option value="CUSTOMER">Customer Only</option>
                      <option value="DRIVER">Driver Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#87948b] uppercase font-bold text-[10px] mb-1">
                      Reward Type
                    </label>
                    <select
                      value={newRewardType}
                      onChange={(e) =>
                        setNewRewardType(
                          e.target.value as 'MONETARY' | 'LOYALTY_POINTS' | 'PROMOTION_DISCOUNT',
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                    >
                      <option value="MONETARY">Monetary (Ledger & Wallet)</option>
                      <option value="LOYALTY_POINTS">Loyalty Points</option>
                      <option value="PROMOTION_DISCOUNT">Promotion Coupon</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#87948b] uppercase font-bold text-[10px] mb-1">
                      Referrer Reward (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 200"
                      value={newReferrerReward}
                      onChange={(e) => setNewReferrerReward(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[#87948b] uppercase font-bold text-[10px] mb-1">
                      Max Total Rewards Cap
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 1000 (Optional)"
                      value={newMaxRewards}
                      onChange={(e) => setNewMaxRewards(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262a33]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-[#1f2430] hover:bg-[#262a33] text-[#dfe2ee] font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2.5 rounded-xl bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs font-['Space_Grotesk'] disabled:opacity-50"
                  >
                    {creating ? 'Creating…' : 'Create Campaign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
