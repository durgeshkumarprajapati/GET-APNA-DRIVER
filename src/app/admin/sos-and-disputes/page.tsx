'use client';

import { AdminLayout } from '@/components/admin-layout';
import Link from 'next/link';

export default function SOSAndDisputesPage() {
  return (
    <AdminLayout activePath="sos-and-disputes">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between bg-[#0a0e16] p-4 rounded-xl border border-[#93000a]/50">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#ffb4ab]">
              <span className="material-symbols-outlined text-[16px] animate-pulse">
                crisis_alert
              </span>
              <span>EMERGENCY SOS &amp; TOLL ARBITRATION QUEUE</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              SOS Escalations &amp; Dispute Management
            </h1>
          </div>
          <Link
            href="/admin/treasury-and-settlements"
            className="px-3 py-1.5 rounded-lg bg-[#93000a] text-[#ffdad6] font-bold text-xs font-['Space_Grotesk']"
          >
            FASTag Arbitration
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#93000a]/40">
            <span className="text-[#ffb4ab] font-bold">CRITICAL EMERGENCY SOS #1</span>
            <div className="text-base font-bold text-[#dfe2ee] mt-1">
              Trip #BK-9482 • Deviated Route Corridor Alert
            </div>
            <div className="text-[#87948b] mt-1">
              Chauffeur Rajesh Kumar / VIP Client Vikramaditya Rao
            </div>
          </div>

          <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33]">
            <span className="text-[#68dba9] font-bold">FASTAG TOLL ARBITRATION #2</span>
            <div className="text-base font-bold text-[#dfe2ee] mt-1">
              Case #DIS-8812 • Aerocity NH-48 Toll Dispute
            </div>
            <div className="text-[#87948b] mt-1">Deepak Prajapati (+₹120.00 contested)</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
