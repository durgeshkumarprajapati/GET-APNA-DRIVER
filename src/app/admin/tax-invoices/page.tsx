'use client';

import { AdminLayout } from '@/components/admin-layout';

export default function TaxInvoicesPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>GSTIN &amp; TAX COMPLIANCE INVOICE REPOSITORY</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              GST Tax Invoices &amp; Ledger Statements
            </h1>
          </div>
        </div>

        <div className="bg-[#0a0e16] p-5 rounded-xl border border-[#262a33] font-mono text-xs text-[#bccac0]">
          100% Tax Compliant GSTIN Invoices with SAC 9964 (Passenger Transport Services).
        </div>
      </div>
    </AdminLayout>
  );
}
