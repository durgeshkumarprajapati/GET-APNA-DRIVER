'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';

export default function TreasuryAndSettlementsPage() {
  const [standardCut, setStandardCut] = useState(18.5);
  const [vipCut, setVipCut] = useState(12.0);
  const [outstationCut, setOutstationCut] = useState(15.0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'READY' | 'PROCESSING' | 'FAILED' | 'ARCHIVE'>(
    'READY',
  );
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  return (
    <AdminLayout activePath="treasury-and-settlements">
      <div className="flex flex-col w-full gap-6">
        {/* Toast Notification Banner */}
        {notificationMsg && (
          <div className="fixed top-20 right-8 z-50 bg-[#25a475] text-[#00311f] px-4 py-3 rounded-lg shadow-2xl font-semibold text-sm flex items-center gap-2 border border-[#68dba9]">
            <span className="material-symbols-outlined">check_circle</span>
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* TOP HEADER STRIP */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#68dba9] animate-pulse" />
              <span className="font-mono text-xs text-[#68dba9] font-bold">
                FINANCIAL TELEMETRY &amp; ESCROW PIPELINE
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] tracking-tight mt-1">
              Treasury, Automated Settlement &amp; Commission Matrix
            </h1>
            <p className="text-xs text-[#87948b] mt-0.5">
              RBI nodal escrow governance, real-time NPCI IMPS rails, and dynamic tier commission
              orchestrator.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] flex items-center gap-2 font-mono text-xs text-[#bccac0]">
              <span className="w-2 h-2 rounded-full bg-[#68dba9]" />
              <span>NPCI IMPS RAIL:</span>
              <span className="text-[#68dba9] font-bold">ONLINE (00.08% TPS)</span>
            </div>

            <button
              onClick={() => showNotification('Disbursal cycle triggered for 894 chauffeurs!')}
              className="bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-xs py-2.5 px-4 rounded-xl shadow-xl flex items-center gap-1.5 transition-all font-['Space_Grotesk']"
            >
              <span className="material-symbols-outlined text-[18px]">payments</span> Run Disbursal
              Cycle
            </button>
          </div>
        </div>

        {/* TOP EXECUTIVE FINANCIAL METRICS GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Settled Escrow Liquidity */}
          <div className="bg-[#0a0e16] rounded-xl p-5 border border-[#262a33] shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-widest font-['Space_Grotesk']">
                Settled Escrow Liquidity
              </span>
              <span className="material-symbols-outlined text-[#68dba9]">account_balance</span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] tracking-tight">
                ₹18,420,800.00
              </div>
              <div className="flex items-center gap-2 mt-1 font-mono text-xs text-[#87948b]">
                <span className="text-[#68dba9] font-bold">RBI Escrow Node #402</span>
                <span>• 100% Capital Adequacy</span>
              </div>
            </div>
          </div>

          {/* Card 2: Midnight Disbursal Queue */}
          <div className="bg-[#0a0e16] rounded-xl p-5 border border-[#262a33] shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-widest font-['Space_Grotesk']">
                Midnight Disbursal Queue
              </span>
              <span className="material-symbols-outlined text-[#b4c5ff]">schedule_send</span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] tracking-tight">
                ₹4,892,150.00
              </div>
              <div className="flex items-center gap-2 mt-1 font-mono text-xs text-[#87948b]">
                <span className="text-[#b4c5ff] font-bold">894 Chauffeurs</span>
                <span>• IMPS Direct Rails</span>
              </div>
            </div>
          </div>

          {/* Card 3: Unallocated Dispute Reserve */}
          <div className="bg-[#0a0e16] rounded-xl p-5 border border-[#262a33] shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-widest font-['Space_Grotesk']">
                Unallocated Dispute Reserve
              </span>
              <span className="material-symbols-outlined text-[#ffb4ab]">lock_reset</span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] tracking-tight">
                ₹240,000.00
              </div>
              <div className="flex items-center gap-2 mt-1 font-mono text-xs text-[#87948b]">
                <span className="text-[#ffb4ab] font-bold">7 Open Inquests</span>
                <span>• Arbitration Buffer</span>
              </div>
            </div>
          </div>

          {/* Card 4: Platform Take-Rate (MTD) */}
          <div className="bg-[#0a0e16] rounded-xl p-5 border border-[#262a33] shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-widest font-['Space_Grotesk']">
                Platform Take-Rate (MTD)
              </span>
              <span className="material-symbols-outlined text-[#85f8c4]">savings</span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] tracking-tight">
                ₹2,410,500.00
              </div>
              <div className="flex items-center gap-2 mt-1 font-mono text-xs text-[#87948b]">
                <span className="text-[#68dba9] font-bold">16.2% Net Margin</span>
                <span>• +2.4% vs LMTD</span>
              </div>
            </div>
          </div>
        </section>

        {/* MIDDLE SPLIT: Policy Engine & Revenue Simulator */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sub-panel: Dynamic Take-Rate Policy Engine (7 Cols) */}
          <div className="lg:col-span-7 bg-[#0a0e16] rounded-xl p-5 border border-[#262a33] shadow-xl flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-[20px]">tune</span>
                  <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Dynamic Take-Rate Architecture
                  </h3>
                </div>
                <span className="font-mono text-xs text-[#87948b]">POLICY ENGINE V3.4</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {/* Policy 1: Standard Fleet Cut */}
                <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#dfe2ee]">
                      Standard Fleet Base Cut
                    </span>
                    <span className="text-lg font-bold font-mono text-[#68dba9]">
                      {standardCut.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="30"
                    step="0.5"
                    value={standardCut}
                    onChange={(e) => setStandardCut(parseFloat(e.target.value))}
                    className="w-full accent-[#68dba9]"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#87948b]">
                    <span>Floor: 10.0%</span>
                    <span>Target: 18.5%</span>
                    <span>Cap: 30.0%</span>
                  </div>
                </div>

                {/* Policy 2: VIP Chauffeur Cut */}
                <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#dfe2ee]">
                      VIP Chauffeur Tier-1 Ceiling
                    </span>
                    <span className="text-lg font-bold font-mono text-[#68dba9]">
                      {vipCut.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="20"
                    step="0.5"
                    value={vipCut}
                    onChange={(e) => setVipCut(parseFloat(e.target.value))}
                    className="w-full accent-[#68dba9]"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#87948b]">
                    <span>Incentive: 8.0%</span>
                    <span>Applied: 12.0%</span>
                    <span>Standard: 20.0%</span>
                  </div>
                </div>

                {/* Policy 3: Outstation Cut */}
                <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#dfe2ee]">
                      Outstation &amp; Expedition Rides
                    </span>
                    <span className="text-lg font-bold font-mono text-[#68dba9]">
                      {outstationCut.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="25"
                    step="0.5"
                    value={outstationCut}
                    onChange={(e) => setOutstationCut(parseFloat(e.target.value))}
                    className="w-full accent-[#68dba9]"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#87948b]">
                    <span>Min: 10.0%</span>
                    <span>Applied: 15.0%</span>
                    <span>Cap: 25.0%</span>
                  </div>
                </div>

                {/* Policy 4: Rain & Surge */}
                <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#dfe2ee]">
                      Rain &amp; Surge Retention
                    </span>
                    <span className="text-lg font-bold font-mono text-[#68dba9]">
                      0.0% PLATFORM
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#68dba9] bg-[#25a475]/10 p-2 rounded border border-[#25a475]/30">
                    100% Passed to Driver • LOCKED POLICY
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#262a33]">
              <button
                onClick={() => {
                  setStandardCut(18.5);
                  setVipCut(12.0);
                  setOutstationCut(15.0);
                  showNotification('Commission policies reset to factory defaults');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#181c24] text-[#87948b] border border-[#262a33] text-xs font-mono"
              >
                Reset Defaults
              </button>
              <button
                onClick={() => showNotification('Commission Engine policies updated successfully!')}
                className="px-4 py-2 rounded-lg bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] text-xs font-bold font-['Space_Grotesk']"
              >
                Update Commission Engine
              </button>
            </div>
          </div>

          {/* Right Sub-panel: Revenue Simulator Yield Telemetry (5 Cols) */}
          <div className="lg:col-span-5 bg-[#0a0e16] rounded-xl p-5 border border-[#262a33] shadow-xl flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-[20px]">
                    pie_chart
                  </span>
                  <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Revenue Simulator Yield Telemetry
                  </h3>
                </div>
              </div>

              <div className="flex flex-col gap-3 my-4">
                <div className="flex items-center justify-between bg-[#181c24] p-3 rounded-lg border border-[#262a33] font-mono text-xs">
                  <span className="text-[#87948b]">Projected Monthly GMV</span>
                  <span className="text-base font-bold text-[#dfe2ee]">₹14.80 Cr</span>
                </div>

                <div className="flex items-center justify-between bg-[#181c24] p-3 rounded-lg border border-[#262a33] font-mono text-xs">
                  <span className="text-[#87948b]">Driver Payout Aggregate</span>
                  <span className="text-base font-bold text-[#68dba9]">₹12.35 Cr (83.4%)</span>
                </div>

                <div className="flex items-center justify-between bg-[#181c24] p-3 rounded-lg border border-[#262a33] font-mono text-xs">
                  <span className="text-[#87948b]">Expected Net Treasury Take</span>
                  <span className="text-base font-bold text-[#b4c5ff]">₹2.45 Cr (16.6%)</span>
                </div>
              </div>

              {/* Share Donut Split Bar */}
              <div className="flex flex-col gap-1.5 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#68dba9] font-bold">83% Driver Share</span>
                  <span className="text-[#b4c5ff] font-bold">17% Platform Margin</span>
                </div>
                <div className="flex w-full h-2 rounded-full overflow-hidden">
                  <div className="bg-[#68dba9] h-full" style={{ width: '83%' }} />
                  <div className="bg-[#0053db] h-full" style={{ width: '17%' }} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#262a33] pt-3 font-mono text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center font-bold text-xs text-[#68dba9]">
                  RS
                </div>
                <div>
                  <div className="text-[#dfe2ee] font-bold">Rajiv Saxena</div>
                  <div className="text-[10px] text-[#87948b]">Chief Financial Officer</div>
                </div>
              </div>
              <span className="text-[10px] text-[#68dba9] bg-[#25a475]/20 px-2 py-0.5 rounded border border-[#25a475]">
                DUAL-KEY APPROVED
              </span>
            </div>
          </div>
        </section>

        {/* SETTLEMENT BATCHES TABLE */}
        <section className="bg-[#0a0e16] rounded-xl p-5 border border-[#262a33] shadow-xl flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Settlement Batches &amp; Payout Rails
              </h3>
              <p className="text-xs text-[#87948b] mt-0.5">
                Verified chauffeur bank nodes, gross earnings, platform commission split, and IMPS
                payout status.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-[#181c24] p-1 rounded-lg border border-[#262a33] font-mono text-xs">
                <button
                  onClick={() => setActiveTab('READY')}
                  className={`px-3 py-1 rounded transition-all ${
                    activeTab === 'READY'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  Ready for Disbursal (894)
                </button>
                <button
                  onClick={() => setActiveTab('PROCESSING')}
                  className={`px-3 py-1 rounded transition-all ${
                    activeTab === 'PROCESSING'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  In Processing (42)
                </button>
                <button
                  onClick={() => setActiveTab('FAILED')}
                  className={`px-3 py-1 rounded transition-all ${
                    activeTab === 'FAILED'
                      ? 'bg-[#93000a] text-[#ffdad6] font-bold'
                      : 'text-[#ffb4ab] hover:text-[#dfe2ee]'
                  }`}
                >
                  Failed Webhooks (3)
                </button>
                <button
                  onClick={() => setActiveTab('ARCHIVE')}
                  className={`px-3 py-1 rounded transition-all ${
                    activeTab === 'ARCHIVE'
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  Settled Archive (12,410)
                </button>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search driver, UTR, bank..."
                className="h-8 px-3 rounded-lg bg-[#181c24] border border-[#262a33] font-mono text-xs text-[#dfe2ee] placeholder:text-[#87948b]"
              />
            </div>
          </div>

          <div className="overflow-x-auto w-full border border-[#262a33] rounded-lg">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase tracking-wider border-b border-[#262a33]">
                  <th className="py-3 px-4">Settlement Batch ID</th>
                  <th className="py-3 px-4">Driver Partner</th>
                  <th className="py-3 px-4">Linked Bank Node</th>
                  <th className="py-3 px-4">Trips</th>
                  <th className="py-3 px-4">Gross Total</th>
                  <th className="py-3 px-4">Deducted Take</th>
                  <th className="py-3 px-4">Net Payout</th>
                  <th className="py-3 px-4">IMPS UTR Ref</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262a33] font-mono">
                {/* Row 1 */}
                <tr className="hover:bg-[#181c24]/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#dfe2ee]">#BATCH-9941-01</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#dfe2ee]">Sukhvinder Kumar</div>
                    <div className="text-[10px] text-[#68dba9]">DRV-VIP-9024 • 4.96★</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-[#dfe2ee]">HDFC Bank Ltd.</div>
                    <div className="text-[10px] text-[#87948b]">A/C ****4091 | HDFC0000128</div>
                  </td>
                  <td className="py-3 px-4 text-[#dfe2ee]">19</td>
                  <td className="py-3 px-4 font-bold text-[#dfe2ee]">₹18,450.00</td>
                  <td className="py-3 px-4 text-[#ffb4ab]">-₹2,214.00 (12%)</td>
                  <td className="py-3 px-4 font-bold text-[#68dba9]">₹16,236.00</td>
                  <td className="py-3 px-4 text-[#bccac0]">IMPS-240902881X</td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2.5 py-1 rounded bg-[#25a475]/20 text-[#68dba9] font-bold border border-[#25a475]">
                      IMPS READY
                    </span>
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-[#181c24]/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#dfe2ee]">#BATCH-9941-02</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#dfe2ee]">Anand Mishra</div>
                    <div className="text-[10px] text-[#68dba9]">DRV-EXE-8812 • 4.88★</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-[#dfe2ee]">ICICI Bank Ltd.</div>
                    <div className="text-[10px] text-[#87948b]">A/C ****9920 | ICIC0000492</div>
                  </td>
                  <td className="py-3 px-4 text-[#dfe2ee]">14</td>
                  <td className="py-3 px-4 font-bold text-[#dfe2ee]">₹12,800.00</td>
                  <td className="py-3 px-4 text-[#ffb4ab]">-₹2,368.00 (18.5%)</td>
                  <td className="py-3 px-4 font-bold text-[#68dba9]">₹10,432.00</td>
                  <td className="py-3 px-4 text-[#87948b]">PENDING_DISPATCH</td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2.5 py-1 rounded bg-[#eab308]/20 text-[#eab308] font-bold border border-[#eab308]/40">
                      QUEUED
                    </span>
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="hover:bg-[#181c24]/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#dfe2ee]">#BATCH-9940-88</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#dfe2ee]">Taranjit Singh</div>
                    <div className="text-[10px] text-[#68dba9]">DRV-VIP-7411 • 4.99★</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-[#dfe2ee]">State Bank of India</div>
                    <div className="text-[10px] text-[#87948b]">A/C ****1109 | SBIN0001041</div>
                  </td>
                  <td className="py-3 px-4 text-[#dfe2ee]">22</td>
                  <td className="py-3 px-4 font-bold text-[#dfe2ee]">₹24,900.00</td>
                  <td className="py-3 px-4 text-[#ffb4ab]">-₹2,988.00 (12%)</td>
                  <td className="py-3 px-4 font-bold text-[#68dba9]">₹21,912.00</td>
                  <td className="py-3 px-4 text-[#b4c5ff]">NPCI-ACK-88194</td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2.5 py-1 rounded bg-[#0053db]/20 text-[#b4c5ff] font-bold border border-[#0053db]">
                      PROCESSING
                    </span>
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="bg-[#93000a]/10 hover:bg-[#93000a]/20 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#ffb4ab]">#BATCH-9939-14</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#dfe2ee]">Deepak Prajapati</div>
                    <div className="text-[10px] text-[#ffb4ab]">DRV-STD-1092 • DISPUTE HOLD</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-[#dfe2ee]">Punjab National Bank</div>
                    <div className="text-[10px] text-[#87948b]">A/C ****8831 | PUNB0123900</div>
                  </td>
                  <td className="py-3 px-4 text-[#dfe2ee]">8</td>
                  <td className="py-3 px-4 font-bold text-[#dfe2ee]">₹6,400.00</td>
                  <td className="py-3 px-4 text-[#ffb4ab]">-₹1,184.00 (18.5%)</td>
                  <td className="py-3 px-4 font-bold text-[#ffb4ab]">₹5,216.00</td>
                  <td className="py-3 px-4 text-[#ffb4ab]">ESCROW_FREEZE</td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2.5 py-1 rounded bg-[#93000a]/30 text-[#ffb4ab] font-bold border border-[#93000a]">
                      ARBITRATION HOLD
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-[#87948b] pt-2">
            <span>Displaying 1 - 4 of 894 Verified Settlement Batches</span>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded bg-[#181c24] border border-[#262a33] text-[#bccac0]">
                Previous
              </button>
              <span className="text-[#68dba9] font-bold">1</span>
              <span className="text-[#87948b]">2</span>
              <span className="text-[#87948b]">3</span>
              <span className="text-[#87948b]">... 224</span>
              <button className="px-3 py-1 rounded bg-[#181c24] border border-[#262a33] text-[#bccac0]">
                Next
              </button>
            </div>
          </div>
        </section>

        {/* BOTTOM SPLIT: Audit Log & Live FASTag Arbitration Card */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cryptographic Audit Log (5 Cols) */}
          <div className="lg:col-span-5 bg-[#0a0e16] rounded-xl p-5 border border-[#262a33] shadow-xl flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-[20px]">
                    verified_user
                  </span>
                  <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Treasury Cryptographic Audit Log
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-[#68dba9] bg-[#25a475]/20 px-2 py-0.5 rounded border border-[#25a475]">
                  BLOCK #92184
                </span>
              </div>

              <div className="flex flex-col gap-2.5 font-mono text-xs my-4">
                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#68dba9]" />
                    <span className="text-[#dfe2ee]">
                      Batch #9935 Auto-Reconciliation Completed
                    </span>
                  </div>
                  <span className="text-[10px] text-[#87948b]">14:12:08 IST</span>
                </div>

                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#68dba9]" />
                    <span className="text-[#dfe2ee]">
                      Escrow RBI Node Reserve Replenished (₹2.50 Cr)
                    </span>
                  </div>
                  <span className="text-[10px] text-[#87948b]">12:30:44 IST</span>
                </div>

                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ffb4ab]" />
                    <span className="text-[#ffb4ab]">
                      Webhook Timeout on PNB Gateway - Retried in 120s
                    </span>
                  </div>
                  <span className="text-[10px] text-[#87948b]">09:14:22 IST</span>
                </div>
              </div>
            </div>
          </div>

          {/* FASTag Live Arbitration Card (7 Cols) */}
          <div className="lg:col-span-7 bg-[#0a0e16] rounded-xl p-5 border border-[#93000a]/40 shadow-xl flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffb4ab] text-[20px] animate-pulse">
                    toll
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      FASTag Live Arbitration: Case #DIS-8812
                    </h3>
                    <span className="text-[10px] font-mono text-[#87948b]">
                      Aerocity NH-48 Toll Dispute
                    </span>
                  </div>
                </div>
                <span className="bg-[#93000a]/30 text-[#ffb4ab] font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-[#93000a]">
                  ACTIVE DISPUTE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs my-4">
                <div className="bg-[#181c24] p-2.5 rounded-lg border border-[#262a33]">
                  <span className="text-[10px] text-[#87948b] block">ASSIGNED DRIVER:</span>
                  <span className="text-[#dfe2ee] font-bold">Deepak Prajapati</span>
                  <div className="text-[10px] text-[#87948b]">DRV-STD-1092</div>
                </div>

                <div className="bg-[#181c24] p-2.5 rounded-lg border border-[#262a33]">
                  <span className="text-[10px] text-[#87948b] block">BOOKING REFERENCE:</span>
                  <span className="text-[#dfe2ee] font-bold">#BK-DEL-29401</span>
                  <div className="text-[10px] text-[#87948b]">IGI T3 to CyberCity</div>
                </div>

                <div className="bg-[#181c24] p-2.5 rounded-lg border border-[#262a33]">
                  <span className="text-[10px] text-[#87948b] block">CONTESTED AMOUNT:</span>
                  <span className="text-[#68dba9] font-bold text-sm">+₹120.00</span>
                  <div className="text-[10px] text-[#87948b]">Expressway Toll Plaza</div>
                </div>
              </div>

              {/* Telemetry Verification Evidence Box */}
              <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] font-mono text-xs">
                <div className="flex items-center gap-2 text-[#68dba9] font-bold mb-1">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  TELEMETRY VERIFIED PROOF
                </div>
                <p className="text-[#bccac0] text-[11px] leading-relaxed">
                  Vehicle <span className="text-[#68dba9] font-bold">DL 01 TA 9521</span> crossed
                  FASTag Plaza Lane 04 at 18:24:19 IST. Speed: 38 km/h. Automated Tag Debit of ₹120
                  logged at ICICI NETC node. Customer app logged fare mismatch report.
                </p>
              </div>
            </div>

            {/* Arbitration CTAs */}
            <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-2 border-t border-[#262a33]">
              <button
                onClick={() => showNotification('Driver Approved +₹120 Toll Credit Issued')}
                className="bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold p-2.5 rounded-lg shadow-md flex items-center justify-center gap-1.5"
              >
                Approve Driver +₹120
              </button>
              <button
                onClick={() => showNotification('Refund Issued to Customer Account')}
                className="bg-[#181c24] hover:bg-[#262a33] text-[#dfe2ee] p-2.5 rounded-lg border border-[#262a33] flex items-center justify-center gap-1.5"
              >
                Refund Customer
              </button>
              <button
                onClick={() => showNotification('Split 50/50 Settlement Processed')}
                className="bg-[#181c24] hover:bg-[#262a33] text-[#b4c5ff] p-2.5 rounded-lg border border-[#262a33] flex items-center justify-center gap-1.5"
              >
                Split 50/50
              </button>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
