'use client';

import { CustomerLayout } from '@/components/customer-layout';

export default function CustomerReferralPage() {
  const code = 'VIKRAM-VIP-2025';

  const copyReferral = () => {
    alert(
      `Referral code ${code} copied to clipboard! Share with friends to earn ₹250 wallet credit.`,
    );
  };

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              COMMUNITY PRIVILEGES
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Refer &amp; Earn Chauffeur Credits
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Invite executives, colleagues, and friends to Get Apna Driver. Earn ₹250 in your
              mobility wallet for every successful first ride.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm flex flex-col items-center justify-center text-center gap-6 max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center text-[#68dba9]">
            <span className="material-symbols-outlined text-4xl">featured_seasonal_and_gifts</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Give ₹200, Get ₹250
            </h2>
            <p className="text-xs text-[#bccac0] max-w-md mt-1">
              Your friend gets ₹200 off their first chauffeur assignment, and you earn ₹250 wallet
              liquidity upon ride completion.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0e16] border border-[#262a33] flex items-center gap-4">
            <span className="font-mono text-lg font-bold text-[#68dba9] tracking-widest">
              {code}
            </span>
            <button
              type="button"
              onClick={copyReferral}
              className="px-4 py-2 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs font-['Space_Grotesk']"
            >
              Copy Link &amp; Code
            </button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
