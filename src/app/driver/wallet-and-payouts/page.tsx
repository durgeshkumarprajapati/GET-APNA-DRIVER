'use client';

import { useCallback, useEffect, useState } from 'react';
import { DriverLayout } from '@/components/driver-layout';
import { EmptyState } from '@/components/ui/empty-state';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface DriverCouponOption {
  code: string;
  name: string;
  description: string | null;
  creditAmount: string;
}

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
  const [coupons, setCoupons] = useState<DriverCouponOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [payingDebt, setPayingDebt] = useState(false);
  const [debtPaymentError, setDebtPaymentError] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [redeemingCoupon, setRedeemingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  const reload = useCallback(async () => {
    const [walletRes, txRes, settlementRes, couponsRes] = await Promise.all([
      fetch('/api/driver/wallet'),
      fetch('/api/driver/wallet/transactions'),
      fetch('/api/driver/settlements'),
      fetch('/api/driver/coupons'),
    ]);
    if (!walletRes.ok || !txRes.ok || !settlementRes.ok) {
      throw new Error('Failed to load wallet data.');
    }
    const walletData = await walletRes.json();
    const txData = await txRes.json();
    const settlementData = await settlementRes.json();
    setWallet(walletData.wallet);
    setTransactions(txData.transactions ?? []);
    setSettlements(settlementData.settlements ?? []);
    if (couponsRes.ok) {
      const couponsData = await couponsRes.json();
      setCoupons(couponsData.coupons ?? []);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        await reload();
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
  }, [reload]);

  const payDownDebt = useCallback(async () => {
    setPayingDebt(true);
    setDebtPaymentError(null);
    try {
      const orderRes = await fetch('/api/driver/wallet/debt/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setDebtPaymentError(orderData.message ?? 'Failed to start payment.');
        setPayingDebt(false);
        return;
      }
      const topup = orderData.topup;

      if (!topup.razorpayKeyId) {
        setDebtPaymentError('Razorpay is not configured in this environment (development mode).');
        setPayingDebt(false);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setDebtPaymentError('Could not load the payment widget. Please try again.');
        setPayingDebt(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: topup.razorpayKeyId,
        amount: Math.round(Number(topup.amount) * 100),
        currency: topup.currency,
        order_id: topup.providerOrderId,
        name: 'Get Apna Driver',
        description: 'Clear outstanding commission dues',
        theme: { color: '#059669' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch(`/api/driver/wallet/debt/${topup.topupId}/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                providerOrderId: response.razorpay_order_id,
                providerPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            if (!verifyRes.ok) {
              const verifyData = await verifyRes.json();
              setDebtPaymentError(verifyData.message ?? 'Payment verification failed.');
              return;
            }
            await reload();
          } catch {
            setDebtPaymentError('Error verifying payment.');
          } finally {
            setPayingDebt(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPayingDebt(false);
          },
        },
      });
      razorpay.open();
    } catch {
      setDebtPaymentError('Error connecting to server.');
      setPayingDebt(false);
    }
  }, [reload]);

  const redeemCoupon = useCallback(async () => {
    if (!couponCode.trim()) {
      return;
    }
    setRedeemingCoupon(true);
    setCouponMessage(null);
    try {
      const res = await fetch('/api/driver/coupons/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponMessage({ kind: 'error', text: data.message ?? 'Failed to redeem coupon.' });
        return;
      }
      setCouponMessage({
        kind: 'success',
        text: `₹${Number(data.redemption.creditAmountSnapshot).toLocaleString('en-IN', { minimumFractionDigits: 2 })} credited to your wallet.`,
      });
      setCouponCode('');
      await reload();
    } catch {
      setCouponMessage({ kind: 'error', text: 'Error connecting to server.' });
    } finally {
      setRedeemingCoupon(false);
    }
  }, [couponCode, reload]);

  const availableBalanceNumber = wallet ? Number(wallet.availableBalance) : 0;
  const isInDebt = availableBalanceNumber < 0;

  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-surface-container border border-border shadow-sm">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface font-['Space_Grotesk']">
              Wallet &amp; Payouts
            </h1>
            <p className="text-xs text-on-surface-variant max-w-2xl">
              Your earnings ledger, pending settlement reservations, and payout history.
            </p>
          </div>
        </section>

        {error && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-on-surface-variant text-sm">Loading wallet…</div>
        ) : wallet ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between shadow-sm animate-fade-in-up ${
                  isInDebt
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-surface-container border-border'
                }`}
              >
                <span className="text-[9px] font-bold text-on-surface-variant uppercase font-['Space_Grotesk'] block">
                  AVAILABLE BALANCE
                </span>
                <div
                  className={`text-2xl font-bold font-['Space_Grotesk'] mt-1 ${
                    isInDebt
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isInDebt ? '-' : ''}₹
                  {Math.abs(availableBalanceNumber).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container border border-border flex flex-col justify-between shadow-sm animate-fade-in-up">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase font-['Space_Grotesk'] block">
                  PENDING BALANCE
                </span>
                <div className="text-2xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
                  ₹
                  {Number(wallet.pendingBalance).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container border border-border flex flex-col justify-between shadow-sm animate-fade-in-up">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase font-['Space_Grotesk'] block">
                  RESERVED FOR SETTLEMENT
                </span>
                <div className="text-2xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
                  ₹
                  {Number(wallet.reservedBalance).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container border border-border flex flex-col justify-between shadow-sm animate-fade-in-up">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase font-['Space_Grotesk'] block">
                  TOTAL EARNED
                </span>
                <div className="text-2xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
                  ₹
                  {Number(wallet.totalEarned).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container border border-border flex flex-col justify-between shadow-sm animate-fade-in-up">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase font-['Space_Grotesk'] block">
                  TOTAL SETTLED
                </span>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-['Space_Grotesk'] mt-1">
                  ₹
                  {Number(wallet.totalSettled).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>

            {isInDebt && (
              <section className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 font-['Space_Grotesk']">
                    You owe ₹
                    {Math.abs(availableBalanceNumber).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    in platform commission
                  </h3>
                  <p className="text-xs text-on-surface-variant max-w-xl">
                    On a cash trip, you collect the full fare directly from the customer, so the
                    platform&apos;s commission is deducted from your wallet instead. Clear it below
                    via UPI/card to keep your balance healthy.
                  </p>
                  {debtPaymentError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {debtPaymentError}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void payDownDebt()}
                  disabled={payingDebt}
                  className="shrink-0 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl shadow transition-colors"
                >
                  {payingDebt ? 'Processing…' : 'Pay Now'}
                </button>
              </section>
            )}

            {/* Driver Coupons */}
            <section className="flex flex-col gap-3 p-5 rounded-xl bg-surface-container border border-border shadow-sm">
              <h3 className="text-base font-bold text-on-surface font-['Space_Grotesk']">
                Redeem a Coupon
              </h3>
              {coupons.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {coupons.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setCouponCode(c.code)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container-high border border-border text-primary hover:bg-primary/10 transition-colors"
                      title={c.description ?? undefined}
                    >
                      {c.code} · ₹{Number(c.creditAmount).toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-container-high border border-border text-sm text-on-surface placeholder:text-on-surface-variant focus-visible:outline-2 focus-visible:outline-primary"
                />
                <button
                  type="button"
                  onClick={() => void redeemCoupon()}
                  disabled={redeemingCoupon || !couponCode.trim()}
                  className="px-5 py-2 bg-primary hover:opacity-90 disabled:opacity-60 text-on-primary font-semibold text-sm rounded-lg shadow transition-colors shrink-0"
                >
                  {redeemingCoupon ? 'Redeeming…' : 'Redeem'}
                </button>
              </div>
              {couponMessage && (
                <p
                  className={`text-xs font-medium ${
                    couponMessage.kind === 'success'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {couponMessage.text}
                </p>
              )}
            </section>

            {/* Ledger Transactions */}
            <section className="flex flex-col gap-4">
              <h3 className="text-base font-bold text-on-surface font-['Space_Grotesk']">
                Wallet Ledger
              </h3>
              <div className="overflow-x-auto rounded-xl border border-border bg-surface-container shadow-sm">
                <table className="w-full font-mono text-xs text-left">
                  <thead className="bg-surface-container-high text-on-surface-variant uppercase text-[10px] border-b border-border">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Available Δ</th>
                      <th className="p-3">Pending Δ</th>
                      <th className="p-3">Reserved Δ</th>
                      <th className="p-3">Balance After (Avail.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-on-surface-variant">
                          No wallet activity yet.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-surface-container-high transition-colors"
                        >
                          <td className="p-3 text-on-surface-variant">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary border border-border text-[9px] font-bold">
                              {tx.changeType.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-on-surface">
                            {formatMoney(tx.availableDelta, wallet.currency)}
                          </td>
                          <td className="p-3 text-on-surface">
                            {formatMoney(tx.pendingDelta, wallet.currency)}
                          </td>
                          <td className="p-3 text-on-surface">
                            {formatMoney(tx.reservedDelta, wallet.currency)}
                          </td>
                          <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">
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
              <h3 className="text-base font-bold text-on-surface font-['Space_Grotesk']">
                Settlement History
              </h3>
              {settlements.length === 0 ? (
                <EmptyState icon="payments" message="No settlements have been processed yet." />
              ) : (
                <div className="space-y-3">
                  {settlements.map((settlement) => (
                    <div
                      key={settlement.id}
                      className="p-4 rounded-xl bg-surface-container border border-border flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in-up shadow-sm"
                    >
                      <div className="space-y-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${settlementBadgeClass(settlement.status)}`}
                        >
                          {settlement.status}
                        </span>
                        <p className="text-sm font-semibold text-on-surface">
                          ₹
                          {Number(settlement.amount).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        {settlement.failureReason && (
                          <p className="text-xs text-rose-500 font-medium">
                            {settlement.failureReason}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-on-surface-variant font-mono">
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
