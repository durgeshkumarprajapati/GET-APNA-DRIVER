'use client';

import { useEffect, useState } from 'react';
import { CorporateLayout } from '@/components/corporate-layout';

interface ReportData {
  totalSpend: number;
  completedRidesCount: number;
  departmentBreakdown: Array<{
    departmentId: string | null;
    departmentCode: string;
    departmentName: string;
    spend: number;
    rideCount: number;
  }>;
  costCenterBreakdown: Array<{
    costCenterId: string | null;
    costCenterCode: string;
    costCenterName: string;
    spend: number;
    rideCount: number;
  }>;
}

export default function CorporateReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch('/api/corporate/reports');
        if (!res.ok) {
          throw new Error('Failed to load corporate report');
        }
        const data = await res.json();
        setReport(data.report);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading analytics report');
      } finally {
        setLoading(false);
      }
    }
    void loadReport();
  }, []);

  const handleExportCSV = () => {
    if (!report) return;
    const lines = [
      'Department Code,Department Name,Spend (INR),Ride Count',
      ...report.departmentBreakdown.map(
        (d) => `"${d.departmentCode}","${d.departmentName}",${d.spend},${d.rideCount}`
      ),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + lines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `corporate_travel_spend_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <CorporateLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#68dba9] uppercase">
              BUSINESS ANALYTICS
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Spend Analytics & Allocation
            </h1>
            <p className="text-xs sm:text-sm text-[#bccac0] mt-1">
              Consolidated department travel spend, cost center allocations, and downloadable CSV statements.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!report}
            className="px-4 py-2.5 bg-[#1c2028] hover:bg-[#262a33] text-[#68dba9] border border-[#25a475]/40 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Export CSV Statement</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-[#bccac0] text-sm font-mono animate-pulse">
            Calculating spend analytics & breakdown...
          </div>
        ) : (
          report && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* DEPARTMENT BREAKDOWN */}
              <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                  <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Department Spend Breakdown
                  </h3>
                  <span className="text-xs font-mono text-[#68dba9]">
                    Total: ₹{report.totalSpend.toLocaleString()}
                  </span>
                </div>

                {report.departmentBreakdown.length === 0 ? (
                  <div className="p-6 text-center text-[#bccac0] text-xs font-mono">
                    No department spend recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {report.departmentBreakdown.map((d, i) => {
                      const percentage = report.totalSpend > 0 ? (d.spend / report.totalSpend) * 100 : 0;
                      return (
                        <div key={i} className="space-y-1 text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-[#dfe2ee] font-semibold">{d.departmentName} ({d.departmentCode})</span>
                            <span className="text-[#68dba9] font-bold">₹{d.spend.toLocaleString()} ({d.rideCount} rides)</span>
                          </div>
                          <div className="h-2 w-full bg-[#1c2028] rounded-full overflow-hidden border border-[#262a33]">
                            <div
                              className="h-full bg-gradient-to-r from-[#25a475] to-[#68dba9]"
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* COST CENTER BREAKDOWN */}
              <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                  <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Cost Center Allocation
                  </h3>
                  <span className="text-xs font-mono text-[#68dba9]">
                    {report.costCenterBreakdown.length} Active Codes
                  </span>
                </div>

                {report.costCenterBreakdown.length === 0 ? (
                  <div className="p-6 text-center text-[#bccac0] text-xs font-mono">
                    No cost center breakdown recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {report.costCenterBreakdown.map((cc, i) => {
                      const percentage = report.totalSpend > 0 ? (cc.spend / report.totalSpend) * 100 : 0;
                      return (
                        <div key={i} className="space-y-1 text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-[#dfe2ee] font-semibold">{cc.costCenterName} ({cc.costCenterCode})</span>
                            <span className="text-[#68dba9] font-bold">₹{cc.spend.toLocaleString()} ({cc.rideCount} rides)</span>
                          </div>
                          <div className="h-2 w-full bg-[#1c2028] rounded-full overflow-hidden border border-[#262a33]">
                            <div
                              className="h-full bg-gradient-to-r from-[#25a475] to-[#68dba9]"
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </CorporateLayout>
  );
}
