'use client';

import { AdminLayout } from '@/components/admin-layout';

export default function AnalyticsAndBIPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">insights</span>
              <span>EXECUTIVE BI &amp; TELEMETRY WAREHOUSE</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Analytics &amp; Business Intelligence
            </h1>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-[#25a475] text-[#00311f] font-bold text-xs font-['Space_Grotesk']">
            Export Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33]">
            <span className="text-xs font-mono text-[#87948b]">NET PLATFORM MARGIN</span>
            <div className="text-2xl font-bold text-[#68dba9] font-['Space_Grotesk'] mt-1">
              18.4%
            </div>
            <span className="text-[11px] font-mono text-[#bccac0]">+2.1% MoM Increase</span>
          </div>

          <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33]">
            <span className="text-xs font-mono text-[#87948b]">AVERAGE TRIP FARE</span>
            <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              ₹3,420
            </div>
            <span className="text-[11px] font-mono text-[#68dba9]">High-Density Premium</span>
          </div>

          <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33]">
            <span className="text-xs font-mono text-[#87948b]">CHAUFFEUR RETENTION</span>
            <div className="text-2xl font-bold text-[#b4c5ff] font-['Space_Grotesk'] mt-1">
              96.8%
            </div>
            <span className="text-[11px] font-mono text-[#bccac0]">30-Day Cohort SLA</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
