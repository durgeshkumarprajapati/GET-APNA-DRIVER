'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { useTranslation } from '@/i18n/context';

interface LoyaltyRewardAdmin {
  id: string;
  rewardCode: string;
  title: string;
  description: string | null;
  rewardType: string;
  pointsCost: number;
  minTierCode: string;
  discountType: string;
  discountValue: number;
  active: boolean;
  singleUse: boolean;
  maxRedemptionsPerUser: number | null;
  maxTotalRedemptions: number | null;
  currentRedemptionsCount: number;
  createdAt: string;
}

export default function AdminCustomerLoyaltyPage() {
  const { t } = useTranslation();
  const [rewards, setRewards] = useState<LoyaltyRewardAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustCustomer, setAdjustCustomer] = useState('');
  const [adjustPoints, setAdjustPoints] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  // Create Reward Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    rewardCode: '',
    title: '',
    description: '',
    rewardType: 'PROMO_CODE',
    pointsCost: 500,
    minTierCode: 'BRONZE',
    discountType: 'FLAT_AMOUNT',
    discountValue: 100,
    singleUse: true,
  });

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadRewards() {
      try {
        const res = await fetch('/api/admin/loyalty/rewards');
        if (!res.ok) {
          throw new Error('Failed to load customer rewards catalog');
        }
        const data = await res.json();
        if (!ignore) {
          setRewards(data.rewards || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error fetching rewards');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    void loadRewards();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAdjusting(true);
      setError(null);
      setAdjustSuccess(null);

      const res = await fetch('/api/admin/loyalty/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: adjustCustomer,
          points: Number(adjustPoints),
          reason: adjustReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to adjust points');
      }

      setAdjustSuccess(`Successfully adjusted points! New balance: ${data.account?.pointsBalance}`);
      setAdjustCustomer('');
      setAdjustReason('');
      setTimeout(() => {
        setAdjustModalOpen(false);
        setAdjustSuccess(null);
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Adjustment failed');
    } finally {
      setAdjusting(false);
    }
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError(null);

      const res = await fetch('/api/admin/loyalty/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rewardForm,
          pointsCost: Number(rewardForm.pointsCost),
          discountValue: Number(rewardForm.discountValue),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create reward');
      }

      setCreateModalOpen(false);
      setRewardForm({
        rewardCode: '',
        title: '',
        description: '',
        rewardType: 'PROMO_CODE',
        pointsCost: 500,
        minTierCode: 'BRONZE',
        discountType: 'FLAT_AMOUNT',
        discountValue: 100,
        singleUse: true,
      });
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create reward');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#68dba9] uppercase">
              {t('admin.loyalty.eyebrow')}
            </span>
            <h1 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              {t('admin.loyalty.title')}
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">{t('admin.loyalty.subtitle')}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAdjustModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#1c2028] hover:bg-[#262a33] border border-[#262a33] text-[#dfe2ee] text-xs font-mono font-bold transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm text-[#68dba9]">tune</span>
              <span>{t('admin.loyalty.adjustPoints')}</span>
            </button>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#25a475] hover:bg-[#208e65] text-[#00311f] text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#25a475]/20"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>{t('admin.loyalty.createReward')}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* REWARDS CATALOG TABLE */}
        <div className="bg-[#141822] border border-[#262a33] rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-[#262a33] flex items-center justify-between">
            <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Customer Reward Catalog
            </h2>
            <span className="text-xs text-[#bccac0] font-mono">
              {rewards.length} rewards configured
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-[#bccac0] text-xs font-mono animate-pulse">
              {t('common.labels.loading')}
            </div>
          ) : rewards.length === 0 ? (
            <div className="p-12 text-center text-[#bccac0] text-xs font-mono">
              {t('admin.loyalty.noRewards')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#262a33] bg-[#0a0e16]/60 text-[11px] font-mono text-[#bccac0] uppercase tracking-wider">
                    <th className="p-4">Reward Code</th>
                    <th className="p-4">Title</th>
                    <th className="p-4">Type & Discount</th>
                    <th className="p-4">Points Cost</th>
                    <th className="p-4">Min Tier</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Redemptions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262a33] text-xs font-mono">
                  {rewards.map((r) => (
                    <tr key={r.id} className="hover:bg-[#1c2028] transition-colors">
                      <td className="p-4 font-bold text-[#68dba9] select-all">{r.rewardCode}</td>
                      <td className="p-4 text-[#dfe2ee]">
                        <div className="font-bold">{r.title}</div>
                        {r.description && (
                          <div className="text-[11px] text-[#87948b] truncate max-w-xs">
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-[#bccac0]">
                        <span className="px-2 py-0.5 rounded bg-[#1e2330] border border-[#262a33] text-[10px] font-bold">
                          {r.discountType === 'PERCENTAGE'
                            ? `${r.discountValue}% OFF`
                            : `₹${r.discountValue} OFF`}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-[#dfe2ee]">{r.pointsCost} PTS</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                          {r.minTierCode}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.active
                              ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                              : 'bg-rose-950/60 border border-rose-500/50 text-rose-300'
                          }`}
                        >
                          {r.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="p-4 text-[#bccac0]">
                        {r.currentRedemptionsCount} redemptions
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MANUAL ADJUSTMENT MODAL */}
        {adjustModalOpen && (
          <div className="fixed inset-0 bg-[#0a0e16]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9]">tune</span>
                  {t('admin.loyalty.adjustPoints')}
                </h3>
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="text-[#bccac0] hover:text-[#dfe2ee]"
                >
                  ✕
                </button>
              </div>

              {adjustSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs rounded-xl font-mono">
                  {adjustSuccess}
                </div>
              )}

              <form onSubmit={handleAdjustPoints} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-[#bccac0] mb-1">
                    {t('admin.loyalty.customerEmail')}
                  </label>
                  <input
                    type="text"
                    required
                    value={adjustCustomer}
                    onChange={(e) => setAdjustCustomer(e.target.value)}
                    placeholder="User ID or email address"
                    className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#bccac0] mb-1">
                    {t('admin.loyalty.amount')}
                  </label>
                  <input
                    type="number"
                    required
                    value={adjustPoints}
                    onChange={(e) => setAdjustPoints(Number(e.target.value))}
                    placeholder="e.g. 500 or -200"
                    className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#bccac0] mb-1">
                    {t('admin.loyalty.reason')}
                  </label>
                  <input
                    type="text"
                    required
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Compensation for service delay"
                    className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#181c24] border border-[#262a33] text-xs font-mono text-[#bccac0] hover:text-[#dfe2ee]"
                  >
                    {t('common.actions.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={adjusting}
                    className="px-4 py-2 rounded-xl bg-[#25a475] hover:bg-[#208e65] text-[#00311f] text-xs font-mono font-bold transition-all disabled:opacity-50"
                  >
                    {adjusting ? t('admin.loyalty.adjusting') : t('admin.loyalty.submitAdjustment')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREATE REWARD MODAL */}
        {createModalOpen && (
          <div className="fixed inset-0 bg-[#0a0e16]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9]">add_card</span>
                  {t('admin.loyalty.createReward')}
                </h3>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="text-[#bccac0] hover:text-[#dfe2ee]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateReward} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#bccac0] mb-1">Reward Code</label>
                    <input
                      type="text"
                      required
                      value={rewardForm.rewardCode}
                      onChange={(e) =>
                        setRewardForm({ ...rewardForm, rewardCode: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g. REWARD_100_OFF"
                      className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2 text-[#dfe2ee] focus:ring-2 focus:ring-[#68dba9]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#bccac0] mb-1">
                      {t('admin.loyalty.rewardTitle')}
                    </label>
                    <input
                      type="text"
                      required
                      value={rewardForm.title}
                      onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
                      placeholder="e.g. ₹100 Off Chauffeur Booking"
                      className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2 text-[#dfe2ee] focus:ring-2 focus:ring-[#68dba9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#bccac0] mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={rewardForm.description}
                    onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                    placeholder="Short description for customer catalog..."
                    className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2 text-[#dfe2ee] focus:ring-2 focus:ring-[#68dba9]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#bccac0] mb-1">
                      {t('admin.loyalty.pointsCost')}
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={rewardForm.pointsCost}
                      onChange={(e) =>
                        setRewardForm({ ...rewardForm, pointsCost: Number(e.target.value) })
                      }
                      className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2 text-[#dfe2ee] focus:ring-2 focus:ring-[#68dba9]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#bccac0] mb-1">
                      {t('admin.loyalty.minTier')}
                    </label>
                    <select
                      value={rewardForm.minTierCode}
                      onChange={(e) =>
                        setRewardForm({ ...rewardForm, minTierCode: e.target.value })
                      }
                      className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2 text-[#dfe2ee] focus:ring-2 focus:ring-[#68dba9]"
                    >
                      <option value="BRONZE">BRONZE</option>
                      <option value="SILVER">SILVER</option>
                      <option value="GOLD">GOLD</option>
                      <option value="PLATINUM">PLATINUM</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#bccac0] mb-1">Discount Type</label>
                    <select
                      value={rewardForm.discountType}
                      onChange={(e) =>
                        setRewardForm({ ...rewardForm, discountType: e.target.value })
                      }
                      className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2 text-[#dfe2ee] focus:ring-2 focus:ring-[#68dba9]"
                    >
                      <option value="FLAT_AMOUNT">FLAT AMOUNT (₹)</option>
                      <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#bccac0] mb-1">
                      {t('admin.loyalty.discountValue')}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={rewardForm.discountValue}
                      onChange={(e) =>
                        setRewardForm({ ...rewardForm, discountValue: Number(e.target.value) })
                      }
                      className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2 text-[#dfe2ee] focus:ring-2 focus:ring-[#68dba9]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="singleUse"
                    checked={rewardForm.singleUse}
                    onChange={(e) => setRewardForm({ ...rewardForm, singleUse: e.target.checked })}
                    className="rounded border-[#262a33] text-[#25a475] focus:ring-0"
                  />
                  <label htmlFor="singleUse" className="text-[#dfe2ee]">
                    Single-use per customer
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#181c24] border border-[#262a33] text-[#bccac0] hover:text-[#dfe2ee]"
                  >
                    {t('common.actions.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 rounded-xl bg-[#25a475] hover:bg-[#208e65] text-[#00311f] font-bold transition-all disabled:opacity-50"
                  >
                    {creating ? t('common.labels.saving') : t('common.actions.save')}
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
