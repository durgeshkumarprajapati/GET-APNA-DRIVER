'use client';

import { useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/customer-layout';
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

interface CustomerDashboardData {
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

export default function CustomerReferralPage() {
  const { t, formatCurrency, formatDate } = useTranslation();
  const [dashboard, setDashboard] = useState<CustomerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/customer/referrals')
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
    // Track share action
    fetch('/api/customer/referrals/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'COPY' }),
    }).catch(() => {});
  };

  const shareReferral = async () => {
    if (!dashboard?.shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('customer.referral.title'),
          text: t('customer.referral.shareSubtitle'),
          url: dashboard.shareUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
        fetch('/api/customer/referrals/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: 'WHATSAPP' }),
        }).catch(() => {});
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
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/30">
            {t('customer.referral.statusRewarded')}
          </span>
        );
      case 'QUALIFIED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/30">
            {t('customer.referral.statusQualified')}
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            {t('customer.referral.statusPending')}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-error-container text-on-error-container border border-error/30">
            {t('customer.referral.statusRejected')}
          </span>
        );
    }
  };

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6 max-w-5xl mx-auto py-4">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl bg-surface-container border border-border gap-4 shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider font-['Space_Grotesk'] block">
              {t('customer.referral.eyebrow')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
              {t('customer.referral.title')}
            </h1>
            <p className="text-xs text-on-surface-variant mt-1 max-w-xl">
              {t('customer.referral.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={shareReferral}
              disabled={loading || !dashboard?.referralCode}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs font-['Space_Grotesk'] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="material-symbols-outlined text-lg">share</span>
              {shared ? t('customer.referral.shared') : t('customer.referral.shareBtn')}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
          <div className="bg-surface-container p-5 rounded-2xl border border-border shadow-sm">
            <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider block">
              {t('customer.referral.yourCode')}
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-lg font-bold font-mono text-primary">
                {loading ? 'LOADING...' : dashboard?.referralCode || 'REF-AVAILABLE'}
              </span>
              <button
                type="button"
                onClick={copyReferralCode}
                title={t('customer.referral.copyCode')}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>

          <div className="bg-surface-container p-5 rounded-2xl border border-border shadow-sm">
            <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider block">
              {t('customer.referral.statTotalReferred')}
            </span>
            <span className="text-2xl font-bold font-['Space_Grotesk'] text-on-surface mt-1 block">
              {loading ? '—' : (dashboard?.totalReferrals ?? 0)}
            </span>
          </div>

          <div className="bg-surface-container p-5 rounded-2xl border border-border shadow-sm">
            <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider block">
              {t('customer.referral.statPending')}
            </span>
            <span className="text-2xl font-bold font-['Space_Grotesk'] text-amber-600 dark:text-amber-400 mt-1 block">
              {loading ? '—' : (dashboard?.pendingReferrals ?? 0)}
            </span>
          </div>

          <div className="bg-surface-container p-5 rounded-2xl border border-border shadow-sm">
            <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider block">
              {t('customer.referral.statEarnedCredits')}
            </span>
            <span className="text-2xl font-bold font-['Space_Grotesk'] text-primary mt-1 block">
              {loading ? formatCurrency(0) : formatCurrency(dashboard?.totalEarnedRewards ?? 0)}
            </span>
          </div>
        </div>

        {/* Active Campaigns Showcase */}
        {dashboard?.activeCampaigns && dashboard.activeCampaigns.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-on-surface font-['Space_Grotesk']">
              {t('customer.referral.activeCampaigns')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboard.activeCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-5 rounded-2xl bg-surface-container border border-border flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/30">
                        {camp.code}
                      </span>
                      {camp.endsAt && (
                        <span className="text-[10px] text-on-surface-variant">
                          {t('customer.referral.endsAt')}: {formatDate(camp.endsAt)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-on-surface mt-2 font-['Space_Grotesk']">
                      {camp.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">{camp.description}</p>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">{t('customer.referral.referrerReward')}:</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(camp.referrerRewardValue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Share Panel */}
        <div className="p-8 rounded-2xl bg-surface-container border border-border flex flex-col items-center justify-center text-center gap-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">featured_seasonal_and_gifts</span>
          </div>

          <div className="max-w-md">
            <h2 className="text-xl font-bold text-on-surface font-['Space_Grotesk']">
              {t('customer.referral.shareTitle')}
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">{t('customer.referral.shareSubtitle')}</p>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-high border border-border flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-primary tracking-widest px-3">
              {loading ? 'REF-...' : dashboard?.referralCode || 'REF-CODE'}
            </span>
            <button
              type="button"
              onClick={copyReferralCode}
              disabled={loading || !dashboard?.referralCode}
              className="min-h-[48px] px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs font-['Space_Grotesk'] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {copied ? '✓' : t('customer.referral.copyCode')}
            </button>
          </div>
        </div>

        {/* Recent Referrals History Table */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-on-surface font-['Space_Grotesk']">
            {t('customer.referral.historyTitle')}
          </h2>

          {loading ? (
            <div className="p-6 text-center text-xs text-on-surface-variant bg-surface-container rounded-2xl border border-border">
              {t('common.loading')}
            </div>
          ) : !dashboard?.recentReferrals || dashboard.recentReferrals.length === 0 ? (
            <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container rounded-2xl border border-border">
              {t('customer.referral.noReferralsYet')}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface-container">
              <table className="w-full text-left text-xs text-on-surface">
                <thead className="bg-surface-container-high text-on-surface-variant uppercase tracking-wider text-[10px] font-bold border-b border-border">
                  <tr>
                    <th className="p-4">{t('customer.referral.colUser')}</th>
                    <th className="p-4">{t('customer.referral.colDate')}</th>
                    <th className="p-4">{t('customer.referral.colStatus')}</th>
                    <th className="p-4 text-right">{t('customer.referral.colReward')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dashboard.recentReferrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-surface-container-high/50 transition-colors">
                      <td className="p-4 font-bold">{ref.displayName}</td>
                      <td className="p-4 text-on-surface-variant">{formatDate(ref.createdAt)}</td>
                      <td className="p-4">{getStatusBadge(ref.status)}</td>
                      <td className="p-4 text-right font-mono font-bold text-primary">
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
    </CustomerLayout>
  );
}
