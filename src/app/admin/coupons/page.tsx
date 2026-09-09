'use client';

import { AdminLayout } from '@/components/admin-layout';

export default function AdminCouponsPage() {
  return (
    <AdminLayout activePath="coupons">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
              <span>PROMOTIONAL COUPONS &amp; CAMPAIGNS</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Coupons &amp; Discount Campaign Orchestrator
            </h1>
          </div>
        </div>

        <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33] font-mono text-xs text-[#bccac0]">
          Active promotional codes: <span className="text-[#68dba9] font-bold">WELCOMEVIP</span>{' '}
          (20% off first VVIP ride), <span className="text-[#68dba9] font-bold">AEROCITY100</span>{' '}
          (₹100 flat off airport rides).
        </div>
      </div>
    </AdminLayout>
  );
}
