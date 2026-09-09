'use client';

import { DriverLayout } from '@/components/driver-layout';

export default function DriverPublicPortfolioPage() {
  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              PUBLIC CHAUFFEUR DOSSIER
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Capt. Vikram Singh (APNA-8842)
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Public executive portfolio visible to customers upon booking match.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] space-y-4 max-w-2xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center text-[#68dba9] font-bold text-xl">
              VS
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#dfe2ee] font-['Space_Grotesk']">
                Vikram Singh • Tier-1 VIP Chauffeur
              </h3>
              <span className="font-mono text-xs text-[#68dba9]">
                4.98 Rating • 1,420 Trips • 11 Years Driving Experience
              </span>
            </div>
          </div>
          <p className="text-xs text-[#bccac0]">
            Fluent in English, Hindi, Punjabi. Specialized in Mercedes-Benz S/E-Class, BMW 7-Series,
            Audi A8, and Range Rover handling. Trained in VVIP protocol, defensive driving, and
            first aid response.
          </p>
        </div>
      </div>
    </DriverLayout>
  );
}
