'use client';

import { useState } from 'react';
import { DriverLayout } from '@/components/driver-layout';

export default function DriverWalletPage() {
  const [disburseAmount, setDisburseAmount] = useState('6480');
  const [balance, setBalance] = useState(6480.0);
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  const transactions = [
    {
      ref: 'TXN-09941-8C',
      bookingId: 'BK-DEL-77821',
      date: 'Today, 18:42 IST',
      route: 'Aerocity T3 → Diplomatic Enclave',
      type: 'VIP CHAUFFEUR',
      gross: '₹1,450.00',
      fee: '-₹174.00',
      surge: '+₹250.00',
      net: '₹1,526.00',
      status: 'SETTLED',
    },
    {
      ref: 'TXN-09938-2F',
      bookingId: 'BK-DEL-77790',
      date: 'Today, 16:15 IST',
      route: 'The Leela → Cyber Hub Gurgaon',
      type: 'LUXURY SEDAN',
      gross: '₹1,200.00',
      fee: '-₹144.00',
      surge: '+₹100.00',
      net: '₹1,156.00',
      status: 'SETTLED',
    },
    {
      ref: 'TXN-09930-IN',
      bookingId: 'RWD-VIP-TIER',
      date: 'Today, 14:00 IST',
      route: 'Peak Hour Consistency Incentive',
      type: 'PARTNER BONUS',
      gross: '₹500.00',
      fee: '₹0.00',
      surge: '₹0.00',
      net: '₹500.00',
      status: 'SETTLED',
    },
    {
      ref: 'WDL-88241-WD',
      bookingId: 'IMPS-HDFC-99120',
      date: 'Yesterday, 23:58 IST',
      route: 'Transfer to HDFC ****8910',
      type: 'DISBURSEMENT',
      gross: '-₹8,500.00',
      fee: '₹0.00',
      surge: '-',
      net: '-₹8,500.00',
      status: 'PAID TO BANK',
    },
    {
      ref: 'TXN-09919-PD',
      bookingId: 'BK-DEL-77640',
      date: 'Yesterday, 21:10 IST',
      route: 'Noida Expwy → IGI Airport T1',
      type: 'VIP OUTSTATION',
      gross: '₹4,772.72',
      fee: '-₹572.72',
      surge: '₹0.00',
      net: '₹4,200.00',
      status: 'RECONCILING',
    },
  ];

  const handleExecutePayout = () => {
    const amt = parseFloat(disburseAmount);
    if (!isNaN(amt) && amt > 0 && amt <= balance) {
      setBalance((prev) => prev - amt);
      setPayoutSuccess(true);
      alert(`₹${amt} IMPS payout executed! Funds transferred instantly to HDFC Bank A/C ****8910.`);
    }
  };

  return (
    <DriverLayout activePath="wallet-and-payouts">
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        {/* HEADER BLOCK */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#262a33] text-[#68dba9] font-bold">
                SETTLEMENT NODE #DEL-8842
              </span>
              <span className="text-[#87948b]">•</span>
              <span className="font-mono text-[10px] text-[#bccac0]">
                IMPS Gateway: Active 0-Fee
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Financial Treasury &amp; Vault
            </h1>
            <p className="text-xs text-[#bccac0] max-w-2xl">
              Real-time cryptographic trip ledger, automated batch reconciliation, and zero-fee
              instant disbursements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert('Exporting GST Tax Invoice PDF...')}
              className="px-3.5 py-2 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-xs flex items-center gap-1.5 border border-[#3d4a42]"
            >
              <span className="material-symbols-outlined text-sm text-[#68dba9]">download</span>
              <span>Export GST Tax Invoice</span>
            </button>
            <button
              type="button"
              onClick={handleExecutePayout}
              className="px-4 py-2 rounded-lg bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-xs font-['Space_Grotesk'] shadow transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">payments</span>
              <span>Initiate IMPS Payout</span>
            </button>
          </div>
        </section>

        {/* FESTIVAL ACCELERATION BANNER */}
        <section className="p-4 rounded-xl bg-[#25a475]/10 border border-[#25a475]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25a475] text-[#00311f] flex items-center justify-center font-bold text-xl shrink-0">
              <span className="material-symbols-outlined">stars</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#68dba9] uppercase font-['Space_Grotesk']">
                  FESTIVAL ACCELERATION
                </span>
                <span className="text-[#87948b]">•</span>
                <span className="font-mono text-[10px] text-[#bccac0]">48 Hours Remaining</span>
              </div>
              <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Diwali Fleet Bonanza: 8 More Luxury Weekend Rides for ₹3,500
              </h2>
              <p className="text-xs text-[#bccac0]">
                Complete executive missions in Aerocity, Chanakyapuri, and Gurugram CyberCity to
                unlock instant credit.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 font-mono text-xs">
            <span className="text-[#dfe2ee]">12 / 20 Completed (60% Paced)</span>
            <span className="text-[#68dba9] font-bold mt-1">GUARANTEED INSTANT LIQUIDITY</span>
          </div>
        </section>

        {/* METRICS CARDS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between shadow-sm">
            <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
              AVAILABLE LIQUIDITY
            </span>
            <div className="text-2xl font-bold text-[#68dba9] font-['Space_Grotesk'] mt-1">
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="font-mono text-[9px] text-[#bccac0] mt-1">
              Instant 0-fee IMPS enabled • HDFC ****8910
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between shadow-sm">
            <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
              TODAY&apos;S NET REALIZED
            </span>
            <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              ₹3,150.00
            </div>
            <span className="font-mono text-[9px] text-[#68dba9] mt-1">
              6 Trips • 5.2 hrs online (₹605.70/hr)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between shadow-sm">
            <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
              WEEK TOTAL INFLOW
            </span>
            <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              ₹19,850.00
            </div>
            <span className="font-mono text-[9px] text-[#68dba9] mt-1">
              +14% vs prior cycle • 32 completed
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between shadow-sm">
            <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
              PENDING BATCH SETTLEMENT
            </span>
            <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              ₹4,200.00
            </div>
            <span className="font-mono text-[9px] text-[#bccac0] mt-1">
              Auto-clears at 00:00 IST • ACH-NACH-01
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between shadow-sm">
            <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
              COMMISSION RETENTION
            </span>
            <div className="text-2xl font-bold text-[#68dba9] font-['Space_Grotesk'] mt-1">
              12.0%
            </div>
            <span className="font-mono text-[9px] text-[#4edea3] mt-1 font-bold">
              VIP Tier Lowest (Saved ₹1,980)
            </span>
          </div>
        </div>

        {/* MAIN HUD: VELOCITY CHART & FAST SETTLEMENT TERMINAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Velocity Telemetry Chart Box (7 cols) */}
          <section className="lg:col-span-7 p-5 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                  VELOCITY TELEMETRY
                </span>
                <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Weekly Inflow &amp; Surge Breakdown
                </h3>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-[#25a475] text-[#00311f] font-bold">
                  Revenue (₹)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0]">Online Hrs</span>
              </div>
            </div>

            {/* Simulated Chart Bars Container */}
            <div className="h-48 w-full bg-[#0a0e16] rounded-xl border border-[#262a33] p-4 flex items-end justify-between gap-2">
              {[
                { day: 'Mon', height: '60%', val: '₹2.8k' },
                { day: 'Tue', height: '75%', val: '₹3.4k' },
                { day: 'Wed', height: '50%', val: '₹2.1k' },
                { day: 'Thu', height: '65%', val: '₹3.0k' },
                { day: 'Fri', height: '95%', val: '₹4.8k' },
                { day: 'Sat', height: '85%', val: '₹4.2k' },
                { day: 'Sun (Live)', height: '70%', val: '₹3.1k' },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="font-mono text-[9px] text-[#68dba9]">{bar.val}</span>
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-[#25a475] to-[#68dba9] transition-all hover:opacity-80"
                    style={{ height: bar.height }}
                  />
                  <span className="font-mono text-[9px] text-[#87948b]">{bar.day}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-[#bccac0]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-[#25a475]" />
                <span>Base Fare Realized</span>
                <span className="w-2.5 h-2.5 rounded bg-[#68dba9] ml-2" />
                <span>Surge &amp; VIP Multiplier Spike</span>
              </div>
              <span>
                Total Online: <strong>38.6 Hours</strong>
              </span>
            </div>
          </section>

          {/* RIGHT: Fast Settlement Terminal Box (5 cols) */}
          <aside className="lg:col-span-5 p-5 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                FAST SETTLEMENT TERMINAL
              </span>
              <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] font-mono text-[9px] font-bold uppercase">
                0% IMPS FEE
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between font-mono text-xs">
              <div>
                <strong className="text-[#dfe2ee] block">HDFC Bank Limited</strong>
                <span className="text-[10px] text-[#87948b]">A/C: ************8910</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#25a475] text-[#00311f] text-[9px] font-bold">
                VERIFIED
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#87948b]">DISBURSEMENT AMOUNT:</span>
                <strong className="text-xl text-[#68dba9] font-['Space_Grotesk']">
                  ₹{disburseAmount}
                </strong>
              </div>

              <input
                type="range"
                min="500"
                max={balance}
                value={disburseAmount}
                onChange={(e) => setDisburseAmount(e.target.value)}
                className="w-full accent-[#68dba9] cursor-pointer"
              />

              <div className="flex gap-2">
                {['1000', '3000', '5000'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDisburseAmount(val)}
                    className="flex-1 py-1 rounded bg-[#262a33] hover:bg-[#31353e] font-mono text-xs text-[#dfe2ee]"
                  >
                    ₹{val}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDisburseAmount(balance.toString())}
                  className="flex-1 py-1 rounded bg-[#25a475] text-[#00311f] font-mono text-xs font-bold"
                >
                  Full Max
                </button>
              </div>
            </div>

            <div className="space-y-1 font-mono text-[10px] text-[#bccac0] border-t border-[#262a33] pt-2">
              <div className="flex justify-between">
                <span>Transfer Rail:</span>
                <strong className="text-[#dfe2ee]">NPCI IMPS Fast Track (&lt; 15 Secs)</strong>
              </div>
              <div className="flex justify-between">
                <span>Platform Processing Fee:</span>
                <strong className="text-[#68dba9]">₹0.00 (Chauffeur VIP Perk)</strong>
              </div>
            </div>

            {payoutSuccess ? (
              <div className="p-3 rounded-lg bg-[#25a475]/20 border border-[#68dba9] text-center font-mono text-xs text-[#68dba9] font-bold">
                PAYOUT EXECUTED! ₹{disburseAmount} SENT VIA IMPS.
              </div>
            ) : (
              <button
                type="button"
                onClick={handleExecutePayout}
                className="w-full py-3.5 rounded-xl bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs shadow-lg font-['Space_Grotesk'] transition-all"
              >
                Execute Instant Payout
              </button>
            )}
          </aside>
        </div>

        {/* IMMUTABLE FINANCIAL RECORDS TABLE */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                IMMUTABLE FINANCIAL RECORDS • SHA-256 Verified
              </span>
              <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Settlement Audit &amp; Ledger
              </h3>
            </div>
            <span className="font-mono text-xs text-[#bccac0]">Showing 1-5 of 184 entries</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#262a33] bg-[#181c24]">
            <table className="w-full font-mono text-xs text-left">
              <thead className="bg-[#0a0e16] text-[#87948b] uppercase text-[10px] border-b border-[#262a33]">
                <tr>
                  <th className="p-3">TX HASH &amp; REF</th>
                  <th className="p-3">DATE &amp; TIME</th>
                  <th className="p-3">SERVICE TYPE</th>
                  <th className="p-3">GROSS FARE</th>
                  <th className="p-3">FEE (12%)</th>
                  <th className="p-3">SURGE / TIP</th>
                  <th className="p-3">NET CREDIT</th>
                  <th className="p-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262a33]">
                {transactions.map((t) => (
                  <tr key={t.ref} className="hover:bg-[#1c2028]">
                    <td className="p-3 text-[#dfe2ee]">
                      <div className="font-bold">{t.ref}</div>
                      <div className="text-[10px] text-[#87948b]">{t.bookingId}</div>
                    </td>
                    <td className="p-3 text-[#bccac0]">{t.date}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#b4c5ff] text-[9px] font-bold">
                        {t.type}
                      </span>
                    </td>
                    <td className="p-3 text-[#dfe2ee]">{t.gross}</td>
                    <td className="p-3 text-[#ffb4ab]">{t.fee}</td>
                    <td className="p-3 text-[#68dba9]">{t.surge}</td>
                    <td className="p-3 text-[#68dba9] font-bold">{t.net}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          t.status === 'SETTLED'
                            ? 'bg-[#25a475]/20 text-[#68dba9]'
                            : t.status === 'PAID TO BANK'
                              ? 'bg-[#0053db]/20 text-[#b4c5ff]'
                              : 'bg-[#262a33] text-[#bccac0]'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* BOTTOM ESCROW & TRUST CARDS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col gap-1">
            <strong className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              RBI Escrow Backed
            </strong>
            <p className="text-xs text-[#bccac0]">
              All chauffeur funds are segregated in regulated escrow accounts with auto-settlement
              fallback mechanisms.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col gap-1">
            <strong className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Sub-Minute Payouts
            </strong>
            <p className="text-xs text-[#bccac0]">
              24x7x365 IMPS gateway connectivity ensures your liquidity is never held over bank
              holidays or weekends.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col gap-1">
            <strong className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              % VIP Tier Advantage
            </strong>
            <p className="text-xs text-[#bccac0]">
              Maintain a 4.90+ rating to protect your 12% platform fee ceiling and enjoy premium
              airport queue priority.
            </p>
          </div>
        </section>
      </div>
    </DriverLayout>
  );
}
