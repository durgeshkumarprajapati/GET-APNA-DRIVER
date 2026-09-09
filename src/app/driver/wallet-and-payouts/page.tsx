'use client';

import { useEffect, useState } from 'react';
import { DriverLayout } from '@/components/driver-layout';

interface WalletSummary {
  driverProfileId: string;
  availableBalance: string;
  pendingBalance: string;
  reservedBalance: string;
  totalEarned: string;
  totalSettled: string;
  currency: string;
}

interface WalletTransaction {
  id: string;
  changeType: string;
  availableDelta: string;
  pendingDelta: string;
  reservedDelta: string;
  balanceAfterAvailable: string;
  balanceAfterPending: string;
  balanceAfterReserved: string;
  createdAt: string;
}

interface Settlement {
  id: string;
  amount: string;
  amountPaid: string | null;
  status: string;
  payoutReference: string | null;
  failureReason: string | null;
  initiatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

function formatMoney(value: string, currency: string): string {
  const amount = Number(value);
  const sign = amount > 0 ? '+' : '';
  return `${sign}${currency === 'INR' ? '₹' : currency + ' '}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function settlementBadgeClass(status: string): string {
  if (status === 'PAID') return 'bg-[#00311f] text-[#68dba9] border border-[#25a475]';
  if (status === 'FAILED' || status === 'CANCELLED') {
    return 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#93000a]';
  }
  return 'bg-[#262a33] text-[#dfe2ee] border border-[#3d4a42]';
}

export default function DriverWalletPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [walletRes, txRes, settlementRes] = await Promise.all([
          fetch('/api/driver/wallet'),
          fetch('/api/driver/wallet/transactions'),
          fetch('/api/driver/settlements'),
        ]);
        if (!walletRes.ok || !txRes.ok || !settlementRes.ok) {
          throw new Error('Failed to load wallet data.');
        }
        const walletData = await walletRes.json();
        const txData = await txRes.json();
        const settlementData = await settlementRes.json();
        if (isMounted) {
          setWallet(walletData.wallet);
          setTransactions(txData.transactions ?? []);
          setSettlements(settlementData.settlements ?? []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load wallet data.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Wallet &amp; Payouts
            </h1>
            <p className="text-xs text-[#bccac0] max-w-2xl">
              Your earnings ledger, pending settlement reservations, and payout history.
            </p>
          </div>
        </section>

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-[#87948b] text-sm">Loading wallet…</div>
        ) : wallet ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between shadow-sm">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                  AVAILABLE BALANCE
                </span>
                <div className="text-2xl font-bold text-[#68dba9] font-['Space_Grotesk'] mt-1">
                  ₹
                  {Number(wallet.availableBalance).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between shadow-sm">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                  PENDING BALANCE
                </span>
                <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
                  ₹
                  {Number(wallet.pendingBalance).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between shadow-sm">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                  RESERVED FOR SETTLEMENT
                </span>
                <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
                  ₹
                  {Number(wallet.reservedBalance).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between shadow-sm">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                  TOTAL EARNED
                </span>
                <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
                  ₹
                  {Number(wallet.totalEarned).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between shadow-sm">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                  TOTAL SETTLED
                </span>
                <div className="text-2xl font-bold text-[#68dba9] font-['Space_Grotesk'] mt-1">
                  ₹
                  {Number(wallet.totalSettled).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>

            {/* Ledger Transactions */}
            <section className="flex flex-col gap-4">
              <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Wallet Ledger
              </h3>
              <div className="overflow-x-auto rounded-xl border border-[#262a33] bg-[#181c24]">
                <table className="w-full font-mono text-xs text-left">
                  <thead className="bg-[#0a0e16] text-[#87948b] uppercase text-[10px] border-b border-[#262a33]">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Available Δ</th>
                      <th className="p-3">Pending Δ</th>
                      <th className="p-3">Reserved Δ</th>
                      <th className="p-3">Balance After (Avail.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262a33]">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-[#87948b]">
                          No wallet activity yet.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-[#1c2028]">
                          <td className="p-3 text-[#bccac0]">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#b4c5ff] text-[9px] font-bold">
                              {tx.changeType.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-[#dfe2ee]">
                            {formatMoney(tx.availableDelta, wallet.currency)}
                          </td>
                          <td className="p-3 text-[#dfe2ee]">
                            {formatMoney(tx.pendingDelta, wallet.currency)}
                          </td>
                          <td className="p-3 text-[#dfe2ee]">
                            {formatMoney(tx.reservedDelta, wallet.currency)}
                          </td>
                          <td className="p-3 text-[#68dba9] font-bold">
                            ₹
                            {Number(tx.balanceAfterAvailable).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Settlements */}
            <section className="flex flex-col gap-4">
              <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Settlement History
              </h3>
              {settlements.length === 0 ? (
                <div className="p-6 rounded-xl border border-[#262a33] bg-[#181c24] text-center text-[#87948b] text-sm">
                  No settlements have been processed yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {settlements.map((settlement) => (
                    <div
                      key={settlement.id}
                      className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${settlementBadgeClass(settlement.status)}`}
                        >
                          {settlement.status}
                        </span>
                        <p className="text-sm font-semibold text-[#dfe2ee]">
                          ₹
                          {Number(settlement.amount).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        {settlement.failureReason && (
                          <p className="text-xs text-[#ffb4ab]">{settlement.failureReason}</p>
                        )}
                      </div>
                      <div className="text-xs text-[#87948b] font-mono">
                        Created {new Date(settlement.createdAt).toLocaleString()}
                        {settlement.completedAt &&
                          ` • Completed ${new Date(settlement.completedAt).toLocaleString()}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </DriverLayout>
  );
}
