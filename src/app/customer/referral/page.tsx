'use client';

import { useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/customer-layout';

interface ReferralSummary {
  referralCode: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  totalEarnedRewards: number;
}

export default function CustomerReferralPage() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/referrals')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (isMounted) setSummary(data.summary ?? null);
      })
      .catch(() => {
        if (isMounted) setSummary(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const copyReferral = () => {
    if (!summary?.referralCode) return;
    navigator.clipboard.writeText(summary.referralCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6 max-w-4xl mx-auto py-4">
        <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              COMMUNITY PRIVILEGES
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Refer &amp; Earn Chauffeur Credits
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Invite executives, colleagues, and friends to Get Apna Driver. Earn wallet rewards for
              every successful first ride.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#181c24] p-5 rounded-xl border border-[#262a33]">
            <span className="text-[#87948b] text-[10px] uppercase font-bold tracking-wider block">
              Your Referral Code
            </span>
            <span className="text-lg font-bold font-mono text-[#68dba9] mt-1 block">
              {loading ? 'LOADING...' : summary?.referralCode || 'REF-AVAILABLE'}
            </span>
          </div>

          <div className="bg-[#181c24] p-5 rounded-xl border border-[#262a33]">
            <span className="text-[#87948b] text-[10px] uppercase font-bold tracking-wider block">
              Total Friends Invited
            </span>
            <span className="text-2xl font-bold font-['Space_Grotesk'] text-[#dfe2ee] mt-1 block">
              {loading ? '—' : (summary?.totalReferrals ?? 0)}
            </span>
          </div>

          <div className="bg-[#181c24] p-5 rounded-xl border border-[#262a33]">
            <span className="text-[#87948b] text-[10px] uppercase font-bold tracking-wider block">
              Rewards Earned
            </span>
            <span className="text-2xl font-bold font-['Space_Grotesk'] text-[#68dba9] mt-1 block">
              ₹{loading ? '0' : (summary?.totalEarnedRewards ?? 0)}
            </span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="p-8 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm flex flex-col items-center justify-center text-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center text-[#68dba9]">
            <span className="material-symbols-outlined text-4xl">featured_seasonal_and_gifts</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Give ₹200, Earn ₹200
            </h2>
            <p className="text-xs text-[#bccac0] max-w-md mt-1">
              Your friend applies your referral code during account creation, and you earn wallet
              rewards upon their first completed ride.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0e16] border border-[#262a33] flex items-center gap-4">
            <span className="font-mono text-xl font-bold text-[#68dba9] tracking-widest px-2">
              {loading ? 'REF-...' : summary?.referralCode || 'REF-CODE'}
            </span>
            <button
              type="button"
              onClick={copyReferral}
              disabled={loading || !summary?.referralCode}
              className="px-4 py-2.5 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs font-['Space_Grotesk'] disabled:opacity-50 transition-colors"
            >
              {copied ? 'Copied to Clipboard!' : 'Copy Code'}
            </button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
