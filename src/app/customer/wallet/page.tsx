'use client';

import { useState } from 'react';
import { CustomerLayout } from '@/components/customer-layout';

interface LedgerItem {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  date: string;
  meta: string;
  amount: string;
  type: 'debit' | 'credit';
  method: string;
  category: 'rides' | 'reloads' | 'fastag' | 'refunds';
  icon: string;
  iconBg: string;
  iconColor: string;
}

export default function CustomerWalletPage() {
  const [balance, setBalance] = useState<number>(2450.0);
  const [topupPreset, setTopupPreset] = useState<'1000' | '2500' | '5000' | 'custom'>('2500');
  const [customAmount, setCustomAmount] = useState<string>('2500');
  const [paymentRail, setPaymentRail] = useState<'upi' | 'hdfc'>('upi');
  const [debitLimit, setDebitLimit] = useState<number>(10000);
  const [zeroClickSettlement, setZeroClickSettlement] = useState<boolean>(true);
  const [instantReceipts, setInstantReceipts] = useState<boolean>(true);

  // Ledger state
  const [activeTab, setActiveTab] = useState<'all' | 'rides' | 'reloads' | 'fastag' | 'refunds'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [ledgerEntries, setLedgerEntries] = useState<LedgerItem[]>([
    {
      id: 'BK-9482',
      title: 'Trip #BK-9482',
      subtitle: 'Terminal 3 → Golf Links',
      tag: 'VIP SEDAN',
      date: 'May 14, 2025 • 22:45 IST',
      meta: 'Chauffeur: Satinder P.',
      amount: '-₹850.00',
      type: 'debit',
      method: 'Paid via Apna Cash',
      category: 'rides',
      icon: 'local_taxi',
      iconBg: 'bg-[#1c2028]',
      iconColor: 'text-[#68dba9]',
    },
    {
      id: 'TOP-5000',
      title: 'Corporate Auto-Topup',
      subtitle: 'Deloitte Shared Services',
      tag: 'DELOITTE ACC',
      date: 'May 12, 2025 • 09:00 IST',
      meta: 'Direct HDFC Corp Settlement',
      amount: '+₹5,000.00',
      type: 'credit',
      method: 'Credited',
      category: 'reloads',
      icon: 'add_card',
      iconBg: 'bg-[#68dba9]/10',
      iconColor: 'text-[#68dba9]',
    },
    {
      id: 'FAST-120',
      title: 'NH-48 Kherki Daula Toll Plaza',
      subtitle: 'NHAI FASTag Clearing',
      tag: 'FASTAG SYNC',
      date: 'May 10, 2025 • 18:14 IST',
      meta: 'Vehicle: DL 1C AB 0909',
      amount: '-₹120.00',
      type: 'debit',
      method: 'Escrow Gateway',
      category: 'fastag',
      icon: 'toll',
      iconBg: 'bg-[#1c2028]',
      iconColor: 'text-[#4edea3]',
    },
    {
      id: 'DIS-8812',
      title: 'Dispute Resolution #DIS-8812',
      subtitle: 'Duplicate Toll Charge Arbitration',
      tag: 'ESCROW ADJUSTED',
      date: 'May 08, 2025 • 14:20 IST',
      meta: 'Duplicate Toll Charge Arbitration',
      amount: '+₹120.00',
      type: 'credit',
      method: 'Settled to Wallet',
      category: 'refunds',
      icon: 'published_with_changes',
      iconBg: 'bg-[#68dba9]/10',
      iconColor: 'text-[#68dba9]',
    },
    {
      id: 'BK-9411',
      title: 'Trip #BK-9411',
      subtitle: 'Vasant Vihar → CyberHub DLF',
      tag: 'EXECUTIVE SUV',
      date: 'May 05, 2025 • 08:30 IST',
      meta: 'Chauffeur: Amit Verma',
      amount: '-₹620.00',
      type: 'debit',
      method: 'UPI AutoPay',
      category: 'rides',
      icon: 'local_taxi',
      iconBg: 'bg-[#1c2028]',
      iconColor: 'text-[#68dba9]',
    },
  ]);

  const handleSelectPreset = (preset: '1000' | '2500' | '5000' | 'custom') => {
    setTopupPreset(preset);
    if (preset !== 'custom') {
      setCustomAmount(preset);
    }
  };

  const handleAuthorizeTopUp = () => {
    const num = parseFloat(customAmount);
    if (isNaN(num) || num <= 0) {
      showToast('Please enter a valid top-up amount');
      return;
    }

    setBalance((prev) => prev + num);
    const newId = `TOP-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const newEntry: LedgerItem = {
      id: newId,
      title: 'Manual Escrow Reload',
      subtitle: paymentRail === 'upi' ? 'UPI Instant Top-Up' : 'HDFC Visa Direct Auth',
      tag: paymentRail === 'upi' ? 'UPI QR' : 'HDFC (4091)',
      date: `${nowStr} IST`,
      meta: 'Authorization ID: #NPCI-AUTH-' + Math.floor(100000 + Math.random() * 900000),
      amount: `+₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      type: 'credit',
      method: 'Credited',
      category: 'reloads',
      icon: 'add_card',
      iconBg: 'bg-[#68dba9]/10',
      iconColor: 'text-[#68dba9]',
    };

    setLedgerEntries((prev) => [newEntry, ...prev]);
    showToast(`Successfully credited ₹${num.toLocaleString('en-IN')} to Apna Cash!`);
  };

  const filteredEntries = ledgerEntries.filter((item) => {
    if (activeTab !== 'all' && item.category !== activeTab) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.meta.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <CustomerLayout activePath="customer-wallet">
      <div className="flex flex-col w-full gap-6">
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#25a475] text-[#00311f] font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-[#68dba9]">
            <span className="material-symbols-outlined text-xl">check_circle</span>
            <span className="text-sm font-['Space_Grotesk']">{toastMessage}</span>
          </div>
        )}

        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-[#68dba9] uppercase tracking-widest">
                Financial Clearance Rails
              </span>
              <span className="font-mono text-xs text-[#87948b]">/</span>
              <span className="font-mono text-xs text-[#bccac0]">Corp ID #DL-9042</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
              Wallet &amp; Corporate Payment Hub
            </h1>
            <p className="text-sm text-[#bccac0] max-w-2xl mt-1">
              Manage your mobility liquidity, automated trip debits, corporate billing profiles, and
              FASTag toll escrow.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="flex items-center gap-2 bg-[#1c2028] border border-[#262a33] px-3.5 py-1.5 rounded-xl shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#68dba9] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#68dba9]"></span>
              </span>
              <span className="font-mono text-xs text-[#dfe2ee]">NPCI Switch Connected</span>
            </div>
            <button
              onClick={() => showToast('Monthly Annexure statement export generated (PDF)')}
              className="flex items-center gap-1.5 bg-[#1c2028] hover:bg-[#262a33] border border-[#262a33] px-3.5 py-1.5 rounded-xl transition-colors text-[#dfe2ee] text-xs font-medium"
            >
              <span className="material-symbols-outlined text-base text-[#68dba9]">download</span>
              <span>Monthly Annexure</span>
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-[#181c24] border border-[#262a33] p-5 rounded-xl shadow-md flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-[#68dba9]/5 rounded-full blur-xl pointer-events-none group-hover:bg-[#68dba9]/10 transition-all"></div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Apna Cash Balance
                </span>
                <span className="material-symbols-outlined text-[#68dba9] text-xl">
                  account_balance_wallet
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                  ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="font-mono text-xs text-[#68dba9] font-semibold">Active</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#262a33] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#68dba9]"></span>
                <span className="text-xs text-[#bccac0]">
                  Auto-Reload <span className="text-[#68dba9] font-medium">ON</span> (&lt;₹1,000)
                </span>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById('dispatch-load-btn');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="font-mono text-xs bg-[#68dba9] text-[#003825] px-2.5 py-1 rounded-lg font-bold hover:bg-[#85f8c4] transition-colors"
              >
                + Add Funds
              </button>
            </div>
          </div>

          <div className="bg-[#181c24] border border-[#262a33] p-5 rounded-xl shadow-md flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Corporate Expense Quota
                </span>
                <span className="material-symbols-outlined text-[#b4c5ff] text-xl">
                  corporate_fare
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                  ₹45,000.00
                </span>
                <span className="font-mono text-xs text-[#87948b]">/ mo</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#262a33]">
              <div className="w-full bg-[#31353e] rounded-full h-1.5 mb-1.5 overflow-hidden">
                <div
                  className="bg-[#b4c5ff] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: '27.5%' }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs text-[#bccac0]">
                <span>₹12,400 utilized (27%)</span>
                <span className="font-mono text-[#b4c5ff]">Deloitte Tier-1</span>
              </div>
            </div>
          </div>

          <div className="bg-[#181c24] border border-[#262a33] p-5 rounded-xl shadow-md flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  FASTag Toll Escrow
                </span>
                <span className="material-symbols-outlined text-[#4edea3] text-xl">toll</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                  ₹1,200.00
                </span>
                <span className="font-mono text-xs text-[#87948b]">Escrow pool</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#262a33] flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-[#4edea3]">autorenew</span>
                <span className="text-xs text-[#bccac0] truncate">Auto via UPI AutoPay</span>
              </div>
              <span className="font-mono text-xs text-[#87948b]">4 Fleet Tags</span>
            </div>
          </div>

          <div className="bg-[#181c24] border border-[#262a33] p-5 rounded-xl shadow-md flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Chauffeur Privileges
                </span>
                <span className="material-symbols-outlined text-[#68dba9] text-xl">stars</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                  ₹850.00
                </span>
                <span className="font-mono text-xs text-[#68dba9]">1:1 Cash Parity</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#262a33] flex items-center justify-between">
              <span className="text-xs text-[#bccac0]">Direct ride offset</span>
              <button
                onClick={() => showToast('Privilege credits applied to next chauffeur booking')}
                className="font-mono text-xs text-[#68dba9] hover:underline flex items-center gap-0.5"
              >
                Apply Now →
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="relative w-full rounded-xl overflow-hidden bg-gradient-to-tr from-[#0a0e16] via-[#1c2028] to-[#262a33] p-6 shadow-xl border border-[#262a33]">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#68dba9]/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-0 right-0 p-3 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-9xl">directions_car</span>
              </div>
              <div className="relative z-10 flex flex-col justify-between min-h-[200px]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0a0e16] border border-[#3d4a42] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#68dba9] text-lg">
                        shield_with_heart
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[#68dba9] tracking-widest uppercase font-['Space_Grotesk']">
                        VIP Mobility Pass
                      </span>
                      <span className="text-sm text-[#dfe2ee] font-semibold tracking-tight font-['Space_Grotesk']">
                        GET APNA DRIVER
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#bccac0] text-xl">
                      contactless
                    </span>
                    <span className="font-mono text-xs text-[#87948b]">EMV 4.0</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 my-4">
                  <div className="w-10 h-7 rounded bg-gradient-to-br from-amber-200/80 to-amber-600/70 p-1 flex flex-col justify-between shadow-inner opacity-90">
                    <div className="h-0.5 bg-amber-950/30 rounded-full w-full"></div>
                    <div className="h-0.5 bg-amber-950/30 rounded-full w-2/3"></div>
                    <div className="h-0.5 bg-amber-950/30 rounded-full w-full"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] text-[#87948b]">
                      AUTHORIZED EXECUTIVE IDENTIFIER
                    </span>
                    <span className="font-mono text-sm text-[#dfe2ee] tracking-widest font-semibold">
                      #VIP-DEL-8821-X9
                    </span>
                  </div>
                </div>

                <div className="flex items-end justify-between pt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#87948b] uppercase font-['Space_Grotesk']">
                      Principal Holder
                    </span>
                    <span className="text-sm font-medium text-[#dfe2ee]">
                      Vikramaditya Singhania
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#0a0e16]/80 border border-[#262a33] backdrop-blur-md px-2.5 py-1 rounded-lg">
                    <span className="font-mono text-[11px] text-[#bccac0]">Card Active</span>
                    <span className="w-2 h-2 rounded-full bg-[#68dba9] shadow-[0_0_8px_rgba(104,219,169,0.8)]"></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#181c24] border border-[#262a33] p-6 rounded-xl shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">bolt</span>
                  <h2 className="text-base text-[#dfe2ee] font-semibold font-['Space_Grotesk']">
                    Instant Escrow Top-Up
                  </h2>
                </div>
                <span className="font-mono text-xs text-[#87948b]">Zero Surcharge</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('1000')}
                  className={`py-2 px-3 rounded-lg font-mono text-xs text-center transition-all border ${
                    topupPreset === '1000'
                      ? 'bg-[#25a475] text-[#00311f] font-bold border-[#68dba9] shadow-[0_0_12px_rgba(37,164,117,0.3)]'
                      : 'bg-[#1c2028] hover:bg-[#262a33] text-[#dfe2ee] border-[#262a33]'
                  }`}
                >
                  ₹1,000
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('2500')}
                  className={`py-2 px-3 rounded-lg font-mono text-xs text-center transition-all border ${
                    topupPreset === '2500'
                      ? 'bg-[#25a475] text-[#00311f] font-bold border-[#68dba9] shadow-[0_0_12px_rgba(37,164,117,0.3)]'
                      : 'bg-[#1c2028] hover:bg-[#262a33] text-[#dfe2ee] border-[#262a33]'
                  }`}
                >
                  ₹2,500
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('5000')}
                  className={`py-2 px-3 rounded-lg font-mono text-xs text-center transition-all border ${
                    topupPreset === '5000'
                      ? 'bg-[#25a475] text-[#00311f] font-bold border-[#68dba9] shadow-[0_0_12px_rgba(37,164,117,0.3)]'
                      : 'bg-[#1c2028] hover:bg-[#262a33] text-[#dfe2ee] border-[#262a33]'
                  }`}
                >
                  ₹5,000
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('custom')}
                  className={`py-2 px-3 rounded-lg font-mono text-xs text-center transition-all border ${
                    topupPreset === 'custom'
                      ? 'bg-[#25a475] text-[#00311f] font-bold border-[#68dba9] shadow-[0_0_12px_rgba(37,164,117,0.3)]'
                      : 'bg-[#1c2028] hover:bg-[#262a33] text-[#bccac0] border-[#262a33]'
                  }`}
                >
                  Custom
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#87948b]">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setTopupPreset('custom');
                    }}
                    placeholder="Enter amount"
                    className="w-full bg-[#0a0e16] text-[#dfe2ee] border border-[#262a33] pl-9 pr-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#68dba9] font-mono text-base shadow-inner"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#bccac0] px-1">
                  <span>Route via:</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="topup-rail"
                        checked={paymentRail === 'upi'}
                        onChange={() => setPaymentRail('upi')}
                        className="accent-[#68dba9]"
                      />
                      <span className="text-[#dfe2ee] font-mono text-xs">UPI QR</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="topup-rail"
                        checked={paymentRail === 'hdfc'}
                        onChange={() => setPaymentRail('hdfc')}
                        className="accent-[#68dba9]"
                      />
                      <span className="text-[#dfe2ee] font-mono text-xs">HDFC (4091)</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  id="dispatch-load-btn"
                  onClick={handleAuthorizeTopUp}
                  className="w-full py-3 bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-[0_0_16px_-2px_rgba(104,219,169,0.35)] flex items-center justify-center gap-2 font-['Space_Grotesk']"
                >
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>
                    Authorize Top-Up (₹
                    {parseFloat(customAmount || '0').toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                    )
                  </span>
                </button>
              </div>
            </div>

            <div className="bg-[#181c24] border border-[#262a33] p-6 rounded-xl shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    credit_card
                  </span>
                  <h2 className="text-base text-[#dfe2ee] font-semibold font-['Space_Grotesk']">
                    Active Payment Rails
                  </h2>
                </div>
                <span className="font-mono text-xs text-[#87948b]">PCI-DSS L1 Vault</span>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="p-3.5 bg-[#1c2028] border border-[#262a33] rounded-xl flex items-center justify-between hover:bg-[#262a33] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-center font-mono text-[#b4c5ff] font-bold text-xs">
                      VISA
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#dfe2ee] font-semibold">
                          HDFC Visa Signature
                        </span>
                        <span className="bg-[#25a475] text-[#00311f] font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                          DEFAULT TRIP RAIL
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[#87948b]">
                        •••• •••• •••• 4091 • Exp 09/28
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => showToast('Payment instrument options')}
                    className="p-1 rounded text-[#87948b] hover:text-[#dfe2ee] transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">more_vert</span>
                  </button>
                </div>

                <div className="p-3.5 bg-[#1c2028] border border-[#262a33] rounded-xl flex items-center justify-between hover:bg-[#262a33] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-center font-mono text-[#ffb4ab] font-bold text-xs">
                      MC
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-[#dfe2ee] font-semibold">
                        ICICI Sapphiro Executive
                      </span>
                      <span className="font-mono text-[11px] text-[#87948b]">
                        •••• •••• •••• 8820 • Exp 03/27
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => showToast('ICICI Sapphiro set as default trip rail')}
                    className="font-mono text-[11px] text-[#87948b] hover:text-[#dfe2ee] hover:underline"
                  >
                    Make Default
                  </button>
                </div>

                <div className="p-3.5 bg-[#1c2028] border border-[#262a33] rounded-xl flex items-center justify-between hover:bg-[#262a33] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#68dba9] text-xl">
                        qr_code_scanner
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[#dfe2ee] font-semibold">
                          UPI Mandate AutoPay
                        </span>
                        <span className="material-symbols-outlined text-[#68dba9] text-sm">
                          check_circle
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[#bccac0]">
                        vikramaditya@okhdfcbank • Limit ₹5,000
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-[#68dba9] bg-[#68dba9]/10 border border-[#68dba9]/20 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>

                <div className="p-3.5 bg-[#1c2028] border border-[#262a33] rounded-xl flex items-center justify-between hover:bg-[#262a33] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#b4c5ff] text-xl">
                        receipt_long
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-[#dfe2ee] font-semibold">
                        Corporate Net Billing (GSTIN)
                      </span>
                      <span className="font-mono text-[11px] text-[#87948b]">
                        GST: 07AAAAA0000A1Z5 • Net-30 Auto Debit
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-[#b4c5ff] bg-[#0053db]/20 border border-[#0053db]/30 px-2 py-0.5 rounded">
                    Pre-Cleared
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => showToast('Add new payment rail modal triggered')}
                className="w-full mt-2 py-2 bg-[#1c2028] hover:bg-[#262a33] border border-[#262a33] text-[#dfe2ee] font-mono text-xs rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">add_card</span>
                <span>Add New Payment Instrument</span>
              </button>
            </div>

            <div className="bg-[#181c24] border border-[#262a33] p-6 rounded-xl shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    security
                  </span>
                  <h2 className="text-base text-[#dfe2ee] font-semibold font-['Space_Grotesk']">
                    Dispatch Guard Rails
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-[#68dba9] uppercase font-['Space_Grotesk']">
                  Hardened
                </span>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-[#dfe2ee] font-medium">
                      Zero-Click Post-Ride Settlement
                    </span>
                    <span className="text-[11px] text-[#87948b] leading-tight">
                      Charges primary wallet automatically when trip terminates with chauffeur OTP
                      match.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setZeroClickSettlement(!zeroClickSettlement);
                      showToast(
                        `Zero-click settlement ${!zeroClickSettlement ? 'enabled' : 'disabled'}`,
                      );
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 flex-shrink-0 ${
                      zeroClickSettlement ? 'bg-[#25a475]' : 'bg-[#31353e]'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        zeroClickSettlement ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-[#dfe2ee] font-medium">
                      Instant Digital Receipts (SMS + WhatsApp)
                    </span>
                    <span className="text-[11px] text-[#87948b] leading-tight">
                      Dispatches itemized GST bill and GPS route telemetry right at terminal
                      arrival.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInstantReceipts(!instantReceipts);
                      showToast(
                        `Instant digital receipts ${!instantReceipts ? 'enabled' : 'disabled'}`,
                      );
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 flex-shrink-0 ${
                      instantReceipts ? 'bg-[#25a475]' : 'bg-[#31353e]'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        instantReceipts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-[#262a33]">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#bccac0]">Max Single-Trip Debit Ceiling</span>
                    <span className="font-mono text-sm text-[#68dba9] font-bold">
                      ₹{debitLimit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2000}
                    max={25000}
                    step={1000}
                    value={debitLimit}
                    onChange={(e) => setDebitLimit(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#31353e] rounded-lg appearance-none cursor-pointer accent-[#68dba9]"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-[#87948b]">
                    <span>₹2,000</span>
                    <span>₹10,000 (Recommended)</span>
                    <span>₹25,000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-[#181c24] border border-[#262a33] p-6 rounded-xl shadow-sm flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#68dba9] text-base">
                      receipt_long
                    </span>
                    <h2 className="text-lg text-[#dfe2ee] font-semibold font-['Space_Grotesk']">
                      Mobility Ledger
                    </h2>
                  </div>
                  <span className="font-mono text-xs text-[#87948b]">
                    Real-time synchronized journal
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => showToast('Filters applied')}
                    className="flex items-center gap-1 bg-[#1c2028] hover:bg-[#262a33] border border-[#262a33] px-3 py-1.5 rounded-xl transition-colors text-[#dfe2ee] font-mono text-xs"
                  >
                    <span className="material-symbols-outlined text-sm">filter_alt</span>
                    <span>Filter</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('Consolidated GST tax invoices exported to PDF/Excel')}
                    className="flex items-center gap-1 bg-[#68dba9] text-[#003825] hover:bg-[#85f8c4] px-3 py-1.5 rounded-xl transition-colors font-mono text-xs font-bold"
                  >
                    <span className="material-symbols-outlined text-sm">receipt</span>
                    <span>Export GST Invoices</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262a33] pb-4">
                <div className="flex items-center gap-1 bg-[#1c2028] border border-[#262a33] p-1 rounded-xl overflow-x-auto text-nowrap">
                  {(
                    [
                      { key: 'all', label: 'All Logs' },
                      { key: 'rides', label: 'Rides' },
                      { key: 'reloads', label: 'Recharges' },
                      { key: 'fastag', label: 'FASTag' },
                      { key: 'refunds', label: 'Refunds' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-1 rounded-lg font-mono text-xs transition-all ${
                        activeTab === tab.key
                          ? 'text-[#00311f] bg-[#25a475] font-bold shadow-sm'
                          : 'text-[#bccac0] hover:text-[#dfe2ee]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[200px]">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#87948b] text-base">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Trip ID..."
                    className="w-full bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#68dba9] placeholder:text-[#87948b]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {filteredEntries.length === 0 ? (
                  <div className="p-8 text-center text-[#87948b] font-mono text-xs border border-dashed border-[#262a33] rounded-xl">
                    No matching transaction logs found for this filter.
                  </div>
                ) : (
                  filteredEntries.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-[#1c2028] border border-[#262a33] hover:bg-[#262a33] rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg ${item.iconBg} border border-[#262a33] flex items-center justify-center mt-0.5 ${item.iconColor} flex-shrink-0`}
                        >
                          <span className="material-symbols-outlined text-lg">{item.icon}</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[#dfe2ee] font-semibold">
                              {item.title}
                            </span>
                            <span className="font-mono text-[10px] text-[#87948b]">
                              {item.subtitle}
                            </span>
                            <span className="bg-[#0a0e16] text-[#68dba9] border border-[#262a33] font-mono text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
                              {item.tag}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#87948b] mt-0.5">
                            <span>{item.date}</span>
                            <span>•</span>
                            <span>{item.meta}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 pl-12 sm:pl-0">
                        <div className="flex flex-col text-right">
                          <span
                            className={`font-mono text-sm font-bold ${
                              item.type === 'credit' ? 'text-[#68dba9]' : 'text-[#dfe2ee]'
                            }`}
                          >
                            {item.amount}
                          </span>
                          <span
                            className={`font-mono text-[10px] ${
                              item.type === 'credit' ? 'text-[#68dba9]' : 'text-[#87948b]'
                            }`}
                          >
                            {item.method}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => showToast(`Invoice downloaded for ${item.id}`)}
                          className="p-1.5 bg-[#0a0e16] hover:bg-[#1c2028] text-[#bccac0] hover:text-[#68dba9] border border-[#262a33] rounded-lg transition-colors"
                          title="Download GST Invoice"
                        >
                          <span className="material-symbols-outlined text-base">receipt</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-2 pt-3 border-t border-[#262a33] flex items-center justify-between">
                <span className="font-mono text-[11px] text-[#87948b]">
                  Showing {filteredEntries.length} of {ledgerEntries.length} mobility transactions
                </span>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <button className="px-2 py-1 bg-[#1c2028] hover:bg-[#262a33] rounded text-[#dfe2ee] border border-[#262a33]">
                    ←
                  </button>
                  <button className="px-2 py-1 bg-[#262a33] text-[#68dba9] rounded font-bold border border-[#3d4a42]">
                    1
                  </button>
                  <button className="px-2 py-1 bg-[#1c2028] hover:bg-[#262a33] rounded text-[#dfe2ee] border border-[#262a33]">
                    2
                  </button>
                  <button className="px-2 py-1 bg-[#1c2028] hover:bg-[#262a33] rounded text-[#dfe2ee] border border-[#262a33]">
                    →
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#181c24] border border-[#262a33] p-6 rounded-xl shadow-sm relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#1c2028] border border-[#262a33] flex items-center justify-center text-[#68dba9] flex-shrink-0 shadow-inner">
                    <span className="material-symbols-outlined text-2xl">domain</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm text-[#dfe2ee] font-bold font-['Space_Grotesk']">
                        Deloitte Shared Services India LLP
                      </h3>
                      <span className="bg-[#25a475] text-[#00311f] font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                        VERIFIED GSTIN
                      </span>
                    </div>
                    <p className="font-mono text-xs text-[#87948b] mt-0.5">
                      GSTIN: 07AAAAA0000A1Z5 • 7 Olof Palme Marg, Vasant Vihar, New Delhi - 110057
                    </p>
                    <p className="text-xs text-[#bccac0] mt-1 leading-relaxed">
                      Direct monthly consolidated tax e-invoices with B2B GSTR-1 input claim sent to
                      corporate accounting stack.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5 bg-[#1c2028] border border-[#262a33] px-3 py-1.5 rounded-xl">
                    <span className="material-symbols-outlined text-[#68dba9] text-sm">sync</span>
                    <span className="font-mono text-xs text-[#dfe2ee]">SAP Concur Synced</span>
                  </div>
                  <button
                    onClick={() => showToast('GST Profile modal opened')}
                    className="bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] border border-[#3d4a42] px-3.5 py-1.5 rounded-xl font-mono text-xs font-medium transition-colors"
                  >
                    Manage GST Profile
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#181c24] border border-[#262a33] p-6 rounded-xl shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                    30-Day Liquidity Burn Rate
                  </span>
                  <span className="text-sm text-[#dfe2ee] font-semibold font-['Space_Grotesk']">
                    Chauffeur Mobility Outflow
                  </span>
                </div>
                <span className="font-mono text-xs text-[#68dba9] bg-[#68dba9]/10 border border-[#68dba9]/20 px-2 py-0.5 rounded">
                  Forecast: Normal
                </span>
              </div>

              <div className="w-full h-24 relative flex items-end pt-2">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 500 80"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#68dba9" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#68dba9" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,60 Q60,30 120,45 T240,25 T360,40 T500,10 L500,80 L0,80 Z"
                    fill="url(#chartGradient)"
                  />
                  <path
                    d="M0,60 Q60,30 120,45 T240,25 T360,40 T500,10"
                    fill="none"
                    stroke="#68dba9"
                    strokeWidth="2.5"
                  />
                  <circle cx="120" cy="45" r="4" fill="#68dba9" stroke="#0f131c" strokeWidth="2" />
                  <circle cx="240" cy="25" r="4" fill="#68dba9" stroke="#0f131c" strokeWidth="2" />
                  <circle cx="360" cy="40" r="4" fill="#68dba9" stroke="#0f131c" strokeWidth="2" />
                  <circle cx="500" cy="10" r="5" fill="#85f8c4" stroke="#0f131c" strokeWidth="2" />
                </svg>
              </div>
              <div className="flex justify-between items-center text-[#87948b] font-mono text-[10px] pt-1 border-t border-[#262a33]">
                <span>Week 1 (Airport Dispatches)</span>
                <span>Week 2 (NCR Outstation)</span>
                <span>Week 3 (Board Meetings)</span>
                <span className="text-[#68dba9]">Week 4 (Current Pace: ₹12.4k)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
