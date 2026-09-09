'use client';

import { AdminLayout } from '@/components/admin-layout';
import Link from 'next/link';

export default function LiveBookingsPage() {
  return (
    <AdminLayout activePath="live-bookings">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">local_taxi</span>
              <span>ACTIVE DISPATCH &amp; REVENUE PIPELINE</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Live Bookings Telemetry Control
            </h1>
          </div>
          <Link
            href="/admin/mission-dashboard"
            className="px-3 py-1.5 rounded-lg bg-[#25a475] text-[#00311f] font-bold text-xs font-['Space_Grotesk']"
          >
            Mission Dashboard
          </Link>
        </div>

        <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33] font-mono text-xs text-[#bccac0]">
          184 Active Live Missions Streaming Real-Time Telemetry to NOC L4 Controllers.
        </div>
      </div>
    </AdminLayout>
  );
}
