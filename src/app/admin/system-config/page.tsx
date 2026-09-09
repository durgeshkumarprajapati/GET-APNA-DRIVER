'use client';

import { AdminLayout } from '@/components/admin-layout';

export default function SystemConfigPage() {
  return (
    <AdminLayout activePath="system-config">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>GLOBAL SYSTEM PARAMETERS</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              System Configuration &amp; Feature Flags
            </h1>
          </div>
        </div>

        <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33] font-mono text-xs text-[#bccac0]">
          Configured Parameters: RTK-GNSS 5s sync, MoRTH API Timeout 1500ms, RazorpayX Webhook
          Auto-Retry (3 attempts).
        </div>
      </div>
    </AdminLayout>
  );
}
