'use client';

import { useState } from 'react';
import { CustomerLayout } from '@/components/customer-layout';

export default function CustomerOffersPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const offers = [
    {
      code: 'FIRSTDRIVE',
      title: '₹100 Off First Rental / Intercity Ride',
      desc: 'Valid on 8-hour rentals and outstation inter-city trips.',
      expiry: 'Valid till 31 Mar 2025',
      badge: 'POPULAR',
    },
    {
      code: 'AIRPORT50',
      title: 'Flat 15% Off IGI Airport Transfers',
      desc: 'Applicable on all luxury sedan airport drops and pickups.',
      expiry: 'Valid till 30 Apr 2025',
      badge: 'AIRPORT SPECIAL',
    },
    {
      code: 'NIGHTSAFE',
      title: '₹150 Off Night Out Party Safe',
      desc: 'Enjoy weekend party return trips between 10 PM and 5 AM.',
      expiry: 'Valid till 15 Apr 2025',
      badge: 'WEEKEND PRIVILEGE',
    },
    {
      code: 'CORP18',
      title: 'Automated 18% GST Input Credit Claim',
      desc: 'Sync your GSTIN for instant B2B tax deduction invoice.',
      expiry: 'Always Active',
      badge: 'ENTERPRISE',
    },
  ];

  const handleCopy = (code: string) => {
    setCopiedCode(code);
    alert(`Promo code ${code} copied to clipboard!`);
  };

  return (
    <CustomerLayout activePath="customer-offers">
      <div className="flex flex-col w-full gap-6">
        <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              VIP CORPORATE &amp; LOYALTY PRIVILEGES
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Offers &amp; Promo Coupons
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Apply valid promotional codes for instant savings on luxury chauffeur deployments.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {offers.map((o) => (
            <div
              key={o.code}
              className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between gap-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-sm px-3 py-1 rounded bg-[#25a475] text-[#00311f] font-bold">
                  {o.code}
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#262a33] text-[#68dba9] uppercase font-['Space_Grotesk']">
                  {o.badge}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk']">
                  {o.title}
                </h3>
                <p className="text-xs text-[#bccac0] mt-1">{o.desc}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#262a33]">
                <span className="font-mono text-[10px] text-[#87948b]">{o.expiry}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(o.code)}
                  className="px-3 py-1.5 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-xs font-bold transition-all"
                >
                  {copiedCode === o.code ? 'COPIED ✓' : 'COPY CODE'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
}
