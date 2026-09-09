'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface WalletSummary {
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
  reservedDelta: string;
  balanceAfterAvailable: string;
  createdAt: string;
}

export default function DriverWalletPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletRes, txRes] = await Promise.all([
          fetch('/api/driver/wallet'),
          fetch('/api/driver/wallet/transactions'),
        ]);
        if (walletRes.ok) {
          const data = await walletRes.json();
          setWallet(data.wallet);
        } else {
          setError('Failed to load wallet.');
        }
        if (txRes.ok) {
          const data = await txRes.json();
          setTransactions(data.transactions || []);
        }
      } catch {
        setError('Error connecting to server.');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mr-3" />
        Loading wallet...
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-sm text-center max-w-sm">
          {error ?? 'Wallet unavailable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/driver" className="hover:text-emerald-400 transition-colors">
                Driver Portal
              </Link>
              <span>/</span>
              <span className="text-slate-200 font-medium">Wallet</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Wallet</h1>
          </div>
          <Link
            href="/driver/settlements"
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-xl shadow transition-colors text-center"
          >
            View Settlement History →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <BalanceCard
            label="Available Balance"
            amount={wallet.availableBalance}
            currency={wallet.currency}
            highlight
          />
          <BalanceCard
            label="Pending Balance"
            amount={wallet.pendingBalance}
            currency={wallet.currency}
          />
          <BalanceCard
            label="Reserved (in settlement)"
            amount={wallet.reservedBalance}
            currency={wallet.currency}
          />
          <BalanceCard
            label="Total Earned"
            amount={wallet.totalEarned}
            currency={wallet.currency}
          />
          <BalanceCard
            label="Total Settled"
            amount={wallet.totalSettled}
            currency={wallet.currency}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          {transactions.length === 0 ? (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 text-center text-slate-400 text-sm">
              No wallet activity yet.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">
                      {tx.changeType.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${Number(tx.availableDelta) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {Number(tx.availableDelta) >= 0 ? '+' : ''}
                      {tx.availableDelta} {wallet.currency}
                    </p>
                    <p className="text-xs text-slate-500">Balance: {tx.balanceAfterAvailable}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BalanceCard({
  label,
  amount,
  currency,
  highlight,
}: {
  label: string;
  amount: string;
  currency: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 border shadow-xl ${
        highlight
          ? 'bg-emerald-900/30 border-emerald-500/40'
          : 'bg-slate-800/80 border-slate-700/80'
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-emerald-300' : 'text-white'}`}>
        {currency} {amount}
      </p>
    </div>
  );
}
