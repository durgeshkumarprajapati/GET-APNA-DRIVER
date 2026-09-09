'use client';

import { useState } from 'react';
import { CustomerLayout } from '@/components/customer-layout';

export default function CustomerWalletPage() {
  const [amount, setAmount] = useState('1000');
  const [balance, setBalance] = useState(2450.0);

  const transactions = [
    {
      id: 'TXN-90812',
      date: 'March 08, 2025',
      desc: 'Chauffeur Booking #BK-9482 (Airport Transfer)',
      amount: '-₹550.00',
      type: 'debit',
    },
    {
      id: 'TXN-89410',
      date: 'March 01, 2025',
      desc: 'Auto-Recharge via HDFC Diners Black (•••• 8092)',
      amount: '+₹2,000.00',
      type: 'credit',
    },
    {
      id: 'TXN-88120',
      date: 'Feb 24, 2025',
      desc: 'Promo Credit: FIRSTDRIVE Cashback',
      amount: '+₹100.00',
      type: 'credit',
    },
  ];

  const handleAddFunds = () => {
    const val = parseFloat(amount);
    if (!isNaN(val) && val > 0) {
      setBalance((prev) => prev + val);
      alert(`₹${val} successfully added to your Primary Mobility Wallet!`);
    }
  };

  return (
    <CustomerLayout activePath="customer-wallet">
      <div className="flex flex-col w-full gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              ENTERPRISE PREPAID RAILS
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Wallet &amp; Payments Hub
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Seamless automated billing, instant corporate GST invoices, and zero-cash fare
              settlements.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#68dba9] bg-[#0a0e16] px-4 py-2 rounded-lg border border-[#262a33]">
            <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse" />
            <span>AUTO-RECHARGE: ACTIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Wallet Balance & Add Funds (5 cols) */}
          <div className="lg:col-span-5 p-6 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col gap-6 shadow-sm">
            <div className="flex flex-col gap-1 p-5 rounded-xl bg-[#0a0e16] border border-[#262a33]">
              <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                USABLE LIQUIDITY BALANCE
              </span>
              <span className="text-3xl font-bold text-[#68dba9] font-['Space_Grotesk']">
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="font-mono text-[10px] text-[#bccac0] mt-1">
                Linked to Corporate GSTIN: 07AABCG1204K1ZV
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Add Funds to Mobility Ledger
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-[#dfe2ee] font-bold">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-sm text-[#dfe2ee] font-mono focus:outline-none focus:ring-1 focus:ring-[#68dba9]"
                />
              </div>
              <div className="flex gap-2">
                {['500', '1000', '2500', '5000'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className="flex-1 py-1 rounded bg-[#262a33] hover:bg-[#31353e] font-mono text-xs text-[#dfe2ee]"
                  >
                    +₹{val}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddFunds}
                className="w-full py-3 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs font-['Space_Grotesk'] shadow transition-all mt-2"
              >
                Top-Up Wallet Balance
              </button>
            </div>

            <div className="pt-4 border-t border-[#262a33] space-y-2 font-mono text-xs text-[#bccac0]">
              <div className="flex justify-between">
                <span>Default Payment Method:</span>
                <strong className="text-[#dfe2ee]">HDFC Diners Black (•••• 8092)</strong>
              </div>
              <div className="flex justify-between">
                <span>Auto-Recharge Threshold:</span>
                <strong className="text-[#dfe2ee]">₹500.00</strong>
              </div>
            </div>
          </div>

          {/* Right Panel: Transaction History (7 cols) */}
          <div className="lg:col-span-7 p-6 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col gap-4 shadow-sm">
            <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Recent Mobility Transactions
            </h3>

            <div className="flex flex-col gap-3">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between font-mono text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-[#dfe2ee]">{t.desc}</strong>
                    </div>
                    <span className="text-[10px] text-[#87948b]">
                      {t.id} • {t.date}
                    </span>
                  </div>
                  <span
                    className={`font-bold text-sm font-['Space_Grotesk'] ${
                      t.type === 'credit' ? 'text-[#68dba9]' : 'text-[#dfe2ee]'
                    }`}
                  >
                    {t.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
