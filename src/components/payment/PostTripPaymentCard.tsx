'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PostTripPaymentDetailsProps {
  bookingId: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  initialDetails?: {
    status: string;
    amount: string;
    grossAmount: string;
    discountAmount: string | null;
    currency: string;
    paymentMethod: string | null;
    cashCustomerConfirmedAt: string | null;
    cashDriverConfirmedAt: string | null;
    capturedAt: string | null;
    upiQrPayload?: {
      upiId: string;
      qrData: string;
    } | null;
  };
  onPaymentSuccess?: () => void;
}

export function PostTripPaymentCard({
  bookingId,
  role,
  initialDetails,
  onPaymentSuccess,
}: PostTripPaymentDetailsProps) {
  const [details, setDetails] = useState(initialDetails || null);
  const [loading, setLoading] = useState(!initialDetails);
  const [actionLoading, setActionLoading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchPaymentDetails = useCallback(async () => {
    try {
      const endpoint =
        role === 'DRIVER'
          ? `/api/driver/bookings/${bookingId}/payment`
          : `/api/customer/bookings/${bookingId}/payment`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (res.ok && data.success) {
        setDetails(data.payment);
        if (data.payment.status === 'CAPTURED' && onPaymentSuccess) {
          onPaymentSuccess();
        }
      } else {
        setErrorMessage(data.message || 'Failed to load payment details.');
      }
    } catch {
      setErrorMessage('Network error loading payment details.');
    } finally {
      setLoading(false);
    }
  }, [bookingId, role, onPaymentSuccess]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPaymentDetails();
    const interval = setInterval(() => {
      void fetchPaymentDetails();
    }, 6000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchPaymentDetails]);

  const handleCustomerSelectPaymentMethod = async (method: 'UPI' | 'CASH') => {
    try {
      setActionLoading(true);
      setErrorMessage(null);
      if (method === 'CASH') {
        const res = await fetch(`/api/customer/bookings/${bookingId}/payment/cash-confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await fetchPaymentDetails();
        } else {
          setErrorMessage(data.message || 'Cash payment confirmation failed.');
        }
      } else {
        const res = await fetch(`/api/customer/bookings/${bookingId}/payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethod: method }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.checkout?.razorpayPaymentPageUrl) {
            window.open(data.checkout.razorpayPaymentPageUrl, '_blank');
          }
          setShowQrModal(true);
          await fetchPaymentDetails();
        } else {
          setErrorMessage(data.message || 'Failed to initiate UPI/QR payment.');
        }
      }
    } catch {
      setErrorMessage('Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDriverConfirmCash = async () => {
    try {
      setActionLoading(true);
      setErrorMessage(null);
      const res = await fetch(`/api/driver/bookings/${bookingId}/payment/cash-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchPaymentDetails();
      } else {
        setErrorMessage(data.message || 'Failed to confirm cash reception.');
      }
    } catch {
      setErrorMessage('Driver cash confirmation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyUpiId = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !details) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl animate-pulse flex items-center justify-center min-h-[140px]">
        <div className="text-slate-400 text-sm font-medium">
          Loading post-trip payment details...
        </div>
      </div>
    );
  }

  const status = details?.status || 'UNPAID';
  const amount = details?.amount || '0.00';
  const grossAmount = details?.grossAmount || amount;
  const discountAmount = details?.discountAmount;
  const currency = details?.currency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : currency;
  const isPaid = status === 'CAPTURED';
  const isCashProcessing = details?.paymentMethod === 'CASH' && !isPaid;

  const renderStatusBadge = () => {
    if (isPaid) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          PAID
        </span>
      );
    }
    if (isCashProcessing) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
          Cash Confirmation Pending
        </span>
      );
    }
    if (status === 'PROCESSING') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
          Processing
        </span>
      );
    }
    if (status === 'FAILED') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          Payment Failed
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600">
        Payment Due
      </span>
    );
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-5 text-slate-100">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            💳 Post-Trip Driver Payment
          </h3>
          <p className="text-xs text-slate-400">
            {role === 'DRIVER' ? 'Receive fare payment from customer' : 'Settle fare for your trip'}
          </p>
        </div>
        {renderStatusBadge()}
      </div>

      {/* Financial Summary */}
      <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-2">
        {discountAmount && parseFloat(discountAmount) > 0 && (
          <>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Gross Fare</span>
              <span>
                {currencySymbol} {parseFloat(grossAmount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-emerald-400 font-medium">
              <span>Coupon Discount Applied</span>
              <span>
                - {currencySymbol} {parseFloat(discountAmount).toFixed(2)}
              </span>
            </div>
            <div className="h-px bg-slate-800 my-1" />
          </>
        )}
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-semibold text-slate-300">Amount Due</span>
          <span className="text-2xl font-extrabold text-white tracking-tight">
            {currencySymbol} {parseFloat(amount).toFixed(2)}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Cash Dual Confirmation Sub-state */}
      {isCashProcessing && (
        <div className="p-4 bg-amber-950/30 border border-amber-800/50 rounded-xl space-y-2 text-xs text-amber-200">
          <div className="font-semibold text-amber-300 flex items-center gap-1.5">
            ⌛ Dual Cash Confirmation In Progress
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300">
            <div className="flex items-center gap-1">
              <span>Customer Confirmed:</span>
              <span className="font-bold text-white">
                {details?.cashCustomerConfirmedAt ? '✅ Yes' : '❌ Pending'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>Driver Received:</span>
              <span className="font-bold text-white">
                {details?.cashDriverConfirmedAt ? '✅ Yes' : '❌ Pending'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Role Action Controls */}
      {!isPaid && (
        <div className="space-y-3 pt-1">
          {role === 'CUSTOMER' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCustomerSelectPaymentMethod('UPI')}
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span>⚡ Pay via UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => handleCustomerSelectPaymentMethod('CASH')}
                disabled={actionLoading || !!details?.cashCustomerConfirmedAt}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span>
                  💵 {details?.cashCustomerConfirmedAt ? 'Cash Confirmed' : 'Pay with Cash'}
                </span>
              </button>
            </div>
          )}

          {role === 'DRIVER' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span>📱 Show Payment QR</span>
              </button>

              <button
                type="button"
                onClick={handleDriverConfirmCash}
                disabled={actionLoading || !!details?.cashDriverConfirmedAt}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span>
                  🤝 {details?.cashDriverConfirmedAt ? 'Cash Received' : 'Confirm Cash Received'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* QR Code Modal / Display Card */}
      {showQrModal && details?.upiQrPayload && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 text-center shadow-2xl relative animate-scale-in">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <h4 className="text-base font-bold text-white">Scan & Pay via Any UPI App</h4>
            <p className="text-xs text-slate-400">GPay, PhonePe, Paytm, BHIM, or Banking UPI App</p>

            {/* Generated QR Card Graphic */}
            <div className="bg-white p-5 rounded-xl inline-block shadow-inner">
              <svg
                className="w-44 h-44 mx-auto text-slate-900"
                viewBox="0 0 100 100"
                fill="currentColor"
              >
                {/* Simulated high-fidelity QR layout */}
                <rect x="5" y="5" width="28" height="28" fill="#0f172a" />
                <rect x="9" y="9" width="20" height="20" fill="#ffffff" />
                <rect x="13" y="13" width="12" height="12" fill="#0f172a" />

                <rect x="67" y="5" width="28" height="28" fill="#0f172a" />
                <rect x="71" y="9" width="20" height="20" fill="#ffffff" />
                <rect x="75" y="13" width="12" height="12" fill="#0f172a" />

                <rect x="5" y="67" width="28" height="28" fill="#0f172a" />
                <rect x="9" y="71" width="20" height="20" fill="#ffffff" />
                <rect x="13" y="75" width="12" height="12" fill="#0f172a" />

                {/* Data modules */}
                <rect x="40" y="10" width="8" height="8" />
                <rect x="52" y="10" width="8" height="8" />
                <rect x="40" y="24" width="20" height="8" />

                <rect x="10" y="40" width="12" height="12" />
                <rect x="28" y="40" width="12" height="12" />
                <rect x="46" y="40" width="12" height="12" />
                <rect x="64" y="40" width="12" height="12" />
                <rect x="82" y="40" width="12" height="12" />

                <rect x="40" y="58" width="12" height="12" />
                <rect x="58" y="58" width="12" height="12" />
                <rect x="76" y="58" width="12" height="12" />

                <rect x="40" y="76" width="16" height="16" />
                <rect x="62" y="76" width="16" height="16" />
                <rect x="82" y="76" width="12" height="12" />
              </svg>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl text-xs space-y-1">
              <span className="text-slate-400 block">UPI VPA:</span>
              <div className="flex items-center justify-center gap-2 font-mono text-indigo-300 font-semibold">
                <span>{details.upiQrPayload.upiId}</span>
                <button
                  type="button"
                  onClick={() => handleCopyUpiId(details.upiQrPayload!.upiId)}
                  className="text-xs text-indigo-400 underline hover:text-indigo-300"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="text-xs font-semibold text-emerald-400">
              Amount to Pay: {currencySymbol} {parseFloat(amount).toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
