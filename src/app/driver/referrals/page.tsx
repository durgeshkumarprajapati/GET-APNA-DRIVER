'use client';

import { useEffect, useState } from 'react';
import { DriverLayout } from '@/components/driver-layout';
import { useTranslation } from '@/i18n/context';

interface ReferralHistoryItem {
  id: string;
  displayName: string;
  status: 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'REJECTED';
  rewardAmount: number | null;
  createdAt: string;
  qualifiedAt: string | null;
  channel: string | null;
}

interface ActiveCampaign {
  id: string;
  code: string;
  name: string;
  description: string | null;
  referrerRewardValue: number;
  refereeRewardValue: number | null;
  endsAt: string | null;
}

interface DriverDashboardData {
  referralCode: string;
  shareUrl: string;
  totalReferrals: number;
  pendingReferrals: number;
  qualifiedReferrals: number;
  rewardedReferrals: number;
  totalEarnedRewards: number;
  activeCampaigns: ActiveCampaign[];
  recentReferrals: ReferralHistoryItem[];
}

export default function DriverReferralPage() {
  const { t, formatCurrency, formatDate } = useTranslation();
  const [dashboard, setDashboard] = useState<DriverDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/driver/referrals')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (isMounted) setDashboard(data.dashboard ?? null);
      })
      .catch(() => {
        if (isMounted) setDashboard(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const copyReferralCode = () => {
    if (!dashboard?.referralCode) return;
    navigator.clipboard.writeText(dashboard.referralCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const shareReferral = async () => {
    if (!dashboard?.shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('driver.referrals.title'),
          text: t('driver.referrals.shareSubtitle'),
          url: dashboard.shareUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } catch {
        copyReferralCode();
      }
    } else {
      copyReferralCode();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REWARDED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#00311f] text-[#68dba9] border border-[#25a475]">
            {t('driver.referrals.statusApproved')}
          </span>
        );
      case 'QUALIFIED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#002b4d] text-[#70baff] border border-[#005bb5]">
            {t('driver.referrals.statusQualified')}
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#3d2e00] text-[#ffc847] border border-[#8a6800]">
            {t('driver.referrals.statusPending')}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#341115] text-[#ffb4ab] border border-[#93000a]">
            {t('driver.referrals.statusRejected')}
          </span>
        );
    }
  };

  return (
    <DriverLayout>
      <div className="flex flex-col w-full gap-6 max-w-5xl mx-auto py-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl bg-[#181c24] border border-[#262a33] gap-4">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              {t('driver.referrals.eyebrow')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              {t('driver.referrals.title')}
            </h1>
            <p className="text-xs text-[#bccac0] mt-1 max-w-xl">{t('driver.referrals.subtitle')}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={shareReferral}
              disabled={loading || !dashboard?.referralCode}
              className="px-5 py-3 rounded-xl bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs font-['Space_Grotesk'] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">share</span>
              {shared ? t('driver.referrals.shared') : t('driver.referrals.shareBtn')}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#181c24] p-5 rounded-2xl border border-[#262a33]">
            <span className="text-[#87948b] text-[10px] uppercase font-bold tracking-wider block">
              {t('driver.referrals.yourCode')}
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-lg font-bold font-mono text-[#68dba9]">
                {loading ? 'LOADING...' : dashboard?.referralCode || 'REF-AVAILABLE'}
              </span>
              <button
                type="button"
                onClick={copyReferralCode}
                title={t('driver.referrals.copyCode')}
                className="text-[#87948b] hover:text-[#dfe2ee] transition-colors"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>

          <div className="bg-[#181c24] p-5 rounded-2xl border border-[#262a33]">
            <span className="text-[#87948b] text-[10px] uppercase font-bold tracking-wider block">
              {t('driver.referrals.statTotalDrivers')}
            </span>
            <span className="text-2xl font-bold font-['Space_Grotesk'] text-[#dfe2ee] mt-1 block">
              {loading ? '—' : (dashboard?.totalReferrals ?? 0)}
            </span>
          </div>

          <div className="bg-[#181c24] p-5 rounded-2xl border border-[#262a33]">
            <span className="text-[#87948b] text-[10px] uppercase font-bold tracking-wider block">
              {t('driver.referrals.statPending')}
            </span>
            <span className="text-2xl font-bold font-['Space_Grotesk'] text-[#ffc847] mt-1 block">
              {loading ? '—' : (dashboard?.pendingReferrals ?? 0)}
            </span>
          </div>

          <div className="bg-[#181c24] p-5 rounded-2xl border border-[#262a33]">
            <span className="text-[#87948b] text-[10px] uppercase font-bold tracking-wider block">
              {t('driver.referrals.statEarnedIncentives')}
            </span>
            <span className="text-2xl font-bold font-['Space_Grotesk'] text-[#68dba9] mt-1 block">
              {loading ? formatCurrency(0) : formatCurrency(dashboard?.totalEarnedRewards ?? 0)}
            </span>
          </div>
        </div>

        {/* Active Driver Campaigns */}
        {dashboard?.activeCampaigns && dashboard.activeCampaigns.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              {t('driver.referrals.activeCampaigns')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboard.activeCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-5 rounded-2xl bg-gradient-to-br from-[#181c24] to-[#121620] border border-[#262a33] flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono text-[#68dba9] bg-[#00311f] px-2.5 py-0.5 rounded-full border border-[#25a475]">
                        {camp.code}
                      </span>
                      {camp.endsAt && (
                        <span className="text-[10px] text-[#87948b]">
                          {t('driver.referrals.endsAt')}: {formatDate(camp.endsAt)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#dfe2ee] mt-2 font-['Space_Grotesk']">
                      {camp.name}
                    </h3>
                    <p className="text-xs text-[#bccac0] mt-1">{camp.description}</p>
                  </div>

                  <div className="pt-3 border-t border-[#262a33] flex items-center justify-between text-xs">
                    <span className="text-[#87948b]">{t('driver.referrals.driverReward')}:</span>
                    <span className="font-bold text-[#68dba9]">
                      {formatCurrency(camp.referrerRewardValue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Referrals Table */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
            {t('driver.referrals.historyTitle')}
          </h2>

          {loading ? (
            <div className="p-6 text-center text-xs text-[#87948b] bg-[#181c24] rounded-2xl border border-[#262a33]">
              {t('common.loading')}
            </div>
          ) : !dashboard?.recentReferrals || dashboard.recentReferrals.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#87948b] bg-[#181c24] rounded-2xl border border-[#262a33]">
              {t('driver.referrals.noReferralsYet')}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#262a33] bg-[#181c24]">
              <table className="w-full text-left text-xs text-[#dfe2ee]">
                <thead className="bg-[#0a0e16] text-[#87948b] uppercase tracking-wider text-[10px] font-bold border-b border-[#262a33]">
                  <tr>
                    <th className="p-4">{t('driver.referrals.colDriver')}</th>
                    <th className="p-4">{t('driver.referrals.colDate')}</th>
                    <th className="p-4">{t('driver.referrals.colStatus')}</th>
                    <th className="p-4 text-right">{t('driver.referrals.colReward')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262a33]">
                  {dashboard.recentReferrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-[#1f2430] transition-colors">
                      <td className="p-4 font-bold">{ref.displayName}</td>
                      <td className="p-4 text-[#87948b]">{formatDate(ref.createdAt)}</td>
                      <td className="p-4">{getStatusBadge(ref.status)}</td>
                      <td className="p-4 text-right font-mono font-bold text-[#68dba9]">
                        {ref.rewardAmount ? formatCurrency(ref.rewardAmount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DriverLayout>
  );
}
