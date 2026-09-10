'use client';

import { use, useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CustomerLayout } from '@/components/customer-layout';

interface CheckoutInit {
  paymentId: string;
  providerOrderId: string;
  amount: string;
  currency: string;
  razorpayKeyId: string | null;
}

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

export default function PaymentCheckoutPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();
  const [checkout, setCheckout] = useState<CheckoutInit | null>(null);
  const [status, setStatus] = useState<'idle' | 'creating' | 'ready' | 'verifying' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(async () => {
    setStatus('creating');
    setError(null);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Failed to start payment.');
        setStatus('error');
        return;
      }
      setCheckout(data.payment);
      setStatus('ready');
    } catch {
      setError('Error connecting to server.');
      setStatus('error');
    }
  }, [bookingId]);

  const openRazorpayCheckout = useCallback(async () => {
    if (!checkout?.razorpayKeyId) {
      return;
    }
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setError('Could not load the payment widget. Please try again.');
      return;
    }

    const razorpay = new window.Razorpay({
      key: checkout.razorpayKeyId,
      amount: Math.round(Number(checkout.amount) * 100),
      currency: checkout.currency,
      order_id: checkout.providerOrderId,
      name: 'Get Apna Driver',
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        setStatus('verifying');
        try {
          const res = await fetch(`/api/payments/${checkout.paymentId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              providerOrderId: response.razorpay_order_id,
              providerPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          if (res.ok) {
            router.push(`/payments/${checkout.paymentId}`);
          } else {
            const data = await res.json();
            setError(data.message ?? 'Payment verification failed.');
            setStatus('error');
          }
        } catch {
          setError('Error verifying payment.');
          setStatus('error');
        }
      },
    });
    razorpay.open();
  }, [checkout, router]);

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6 max-w-lg">
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link
              href={`/bookings/${bookingId}`}
              className="hover:text-emerald-400 transition-colors"
            >
              Booking
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Pay</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Complete Payment</h1>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
          {status === 'idle' && (
            <>
              <p className="text-sm text-slate-300">
                Trip completed. Start the payment for this booking to confirm your fare.
              </p>
              <button
                onClick={() => void startCheckout()}
                className="w-full px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow transition-colors"
              >
                Start Payment
              </button>
            </>
          )}

          {status === 'creating' && (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mr-3" />
              Preparing your payment...
            </div>
          )}

          {status === 'ready' && checkout && (
            <div className="space-y-4">
              <p className="text-2xl font-bold text-white">
                {checkout.currency} {checkout.amount}
              </p>
              {checkout.razorpayKeyId ? (
                <button
                  onClick={() => void openRazorpayCheckout()}
                  className="w-full px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow transition-colors"
                >
                  Pay Now
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-amber-900/30 border border-amber-500/40 text-amber-200 text-sm">
                  Razorpay is not configured in this environment (development mode). Set
                  RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET to enable live checkout.
                </div>
              )}
            </div>
          )}

          {status === 'verifying' && (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mr-3" />
              Verifying your payment...
            </div>
          )}

          {status === 'error' && error && (
            <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
