'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { useTranslation } from '@/i18n/context';
import {
  CustomerBillingRecordItem,
  BillingSummaryMetrics,
} from '@/modules/billing/billing-service';

export default function BillingCenterClient() {
  const { formatCurrency, formatDate } = useTranslation();
  const [records, setRecords] = useState<CustomerBillingRecordItem[]>([]);
  const [summary, setSummary] = useState<BillingSummaryMetrics | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Record Modal/Drawer
  const [selectedRecord, setSelectedRecord] = useState<CustomerBillingRecordItem | null>(null);
  const [financialTimeline, setFinancialTimeline] = useState<Array<{
    event: string;
    description: string;
    timestamp: string;
  }> | null>(null);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('paymentStatus', statusFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    fetch(`/api/customer/billing?${params.toString()}`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error('Failed to load billing history')),
      )
      .then((data) => {
        if (!isMounted) return;
        if (data.success) {
          setRecords(data.records || []);
          setSummary(data.summary || null);
          setTotalPages(data.totalPages || 1);
          setError(null);
        } else {
          setError(data.message || 'Error fetching billing records');
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading billing data');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, search, statusFilter, startDate, endDate]);

  const handleSelectRecord = async (item: CustomerBillingRecordItem) => {
    setSelectedRecord(item);
    setFinancialTimeline(null);
    try {
      const res = await fetch(`/api/admin/financial-timeline/${item.bookingId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setFinancialTimeline(data.timeline || []);
      }
    } catch {
      // User non-admin timeline fallback
    }
  };

  return (
    <CustomerLayout>
      <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0e16] p-6 rounded-2xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-base">account_balance</span>
              <span>Billing & Financial Center</span>
            </div>
            <h1 className="text-2xl font-bold text-white font-['Space_Grotesk'] mt-1">
              Billing History & Tax Documents
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Access your official tax invoices, payment receipts, and refund credit notes in one
              place.
            </p>
          </div>
        </div>

        {/* SUMMARY METRICS CARDS */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0a0e16] p-5 rounded-2xl border border-[#262a33]">
              <span className="text-[11px] font-mono text-slate-400 block uppercase">
                Total Paid
              </span>
              <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
                {formatCurrency(summary.totalPaid)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Captured successful charges
              </span>
            </div>

            <div className="bg-[#0a0e16] p-5 rounded-2xl border border-[#262a33]">
              <span className="text-[11px] font-mono text-slate-400 block uppercase">
                Total Refunded
              </span>
              <span className="text-2xl font-bold text-amber-400 font-mono mt-1 block">
                {formatCurrency(summary.totalRefunded)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Returned to original payment source
              </span>
            </div>

            <div className="bg-[#0a0e16] p-5 rounded-2xl border border-[#262a33]">
              <span className="text-[11px] font-mono text-slate-400 block uppercase">
                Tax Invoices
              </span>
              <span className="text-2xl font-bold text-cyan-400 font-mono mt-1 block">
                {summary.invoiceCount}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Issued tax invoice documents
              </span>
            </div>

            <div className="bg-[#0a0e16] p-5 rounded-2xl border border-[#262a33]">
              <span className="text-[11px] font-mono text-slate-400 block uppercase">
                Pending Payments
              </span>
              <span className="text-2xl font-bold text-purple-400 font-mono mt-1 block">
                {summary.pendingPaymentsCount}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Awaiting checkout or cash confirmation
              </span>
            </div>
          </div>
        )}

        {/* FILTERS & SEARCH BAR */}
        <div className="bg-[#0a0e16] p-4 rounded-2xl border border-[#262a33] flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-lg">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search Booking ID, Invoice #, Payment ID..."
              className="w-full pl-9 pr-3 py-2 bg-[#181c24] border border-[#262a33] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#68dba9]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#181c24] border border-[#262a33] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#68dba9]"
            >
              <option value="">All Payment Statuses</option>
              <option value="CAPTURED">Paid (Captured)</option>
              <option value="CREATED">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="bg-[#181c24] border border-[#262a33] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#68dba9]"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="bg-[#181c24] border border-[#262a33] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#68dba9]"
            />
          </div>
        </div>

        {/* LOADING & ERROR */}
        {loading && (
          <div className="flex items-center justify-center p-12 bg-[#0a0e16] rounded-2xl border border-[#262a33]">
            <div className="flex flex-col items-center gap-3">
              <span className="w-8 h-8 rounded-full border-2 border-[#68dba9] border-t-transparent animate-spin" />
              <span className="text-xs font-mono text-slate-400">Loading billing records...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-xs text-red-300 font-mono">
            {error}
          </div>
        )}

        {/* RECORDS TABLE */}
        {!loading && !error && (
          <div className="bg-[#0a0e16] rounded-2xl border border-[#262a33] overflow-hidden">
            {records.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-slate-500">
                No billing records found matching your query.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#181c24] text-slate-400 border-b border-[#262a33] uppercase text-[10px]">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Booking ID</th>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Service</th>
                      <th className="p-4">Payment Method</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262a33]">
                    {records.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[#181c24]/50 text-slate-200 transition-colors"
                      >
                        <td className="p-4 text-slate-400">{formatDate(item.createdAt)}</td>
                        <td className="p-4 font-bold text-white">
                          <Link
                            href={`/bookings/${item.bookingId}`}
                            className="hover:underline text-cyan-400"
                          >
                            {item.bookingId.substring(0, 8)}...
                          </Link>
                        </td>
                        <td className="p-4 text-[#68dba9] font-semibold">
                          {item.invoiceNumber || 'Pending'}
                        </td>
                        <td className="p-4 text-slate-300">
                          {item.serviceType}
                          {item.serviceFor?.isForSomeoneElse && (
                            <span className="block text-[10px] text-purple-400 font-sans">
                              For: {item.serviceFor.recipientName}
                            </span>
                          )}
                        </td>
                        <td className="p-4 uppercase text-[11px] text-slate-400">
                          {item.paymentMethod || 'ONLINE'}
                        </td>
                        <td className="p-4 font-bold text-white">
                          {formatCurrency(item.amount)}
                          {item.refundedAmount > 0 && (
                            <span className="block text-[10px] text-amber-400 font-mono">
                              Refunded: -{formatCurrency(item.refundedAmount)}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              item.paymentStatus === 'CAPTURED'
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                                : item.paymentStatus === 'FAILED'
                                  ? 'bg-red-950 text-red-400 border-red-500/30'
                                  : 'bg-amber-950 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {item.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void handleSelectRecord(item)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg transition-colors border border-slate-700"
                            >
                              View Details
                            </button>
                            {item.invoiceNumber && (
                              <a
                                href={`/api/customer/bookings/${item.bookingId}/invoice/pdf`}
                                download={`invoice-${item.invoiceNumber}.pdf`}
                                className="p-1.5 bg-[#68dba9]/10 hover:bg-[#68dba9]/20 text-[#68dba9] rounded-lg transition-colors"
                                title="Download Tax Invoice PDF"
                              >
                                <span className="material-symbols-outlined text-base block">
                                  download
                                </span>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="p-4 bg-[#181c24] border-t border-[#262a33] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FINANCIAL DETAIL MODAL / DRAWER */}
        {selectedRecord && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-[#0a0e16] border border-[#262a33] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl animate-scale-in text-slate-200">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9]">receipt_long</span>
                    Financial Breakdown & Documents
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Booking ID: {selectedRecord.bookingId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* SERVICE RECIPIENT INFO (PHASE 74) */}
              {selectedRecord.serviceFor?.isForSomeoneElse && (
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1 text-xs">
                  <span className="text-[10px] uppercase font-mono text-purple-300 font-bold block">
                    Phase 74 — Booked For Service Recipient
                  </span>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">Recipient Name:</span>
                    <span className="text-white font-semibold">
                      {selectedRecord.serviceFor.recipientName}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">Recipient Mobile:</span>
                    <span className="text-slate-300">
                      {selectedRecord.serviceFor.recipientPhone}
                    </span>
                  </div>
                </div>
              )}

              {/* FINANCIAL BREAKDOWN */}
              <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] space-y-2 text-xs font-mono">
                <h4 className="text-xs font-bold text-white uppercase mb-3">
                  Authoritative Payment Breakdown
                </h4>

                <div className="flex justify-between text-slate-300">
                  <span>Gross Amount</span>
                  <span>{formatCurrency(selectedRecord.amount)}</span>
                </div>
                {selectedRecord.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Promotion Discount</span>
                    <span>-{formatCurrency(selectedRecord.discountAmount)}</span>
                  </div>
                )}
                {selectedRecord.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>GST / Tax (18% inclusive)</span>
                    <span>{formatCurrency(selectedRecord.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-700">
                  <span>Total Payable</span>
                  <span className="text-[#68dba9]">{formatCurrency(selectedRecord.amount)}</span>
                </div>
              </div>

              {/* REFUND STATUS CARD */}
              {selectedRecord.refundedAmount > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-amber-400 uppercase">Refund Document Status</h4>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">
                      {selectedRecord.refundStatus || 'PROCESSED'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Refund Document No:</span>
                    <span className="text-white font-semibold">
                      {selectedRecord.refundNumber ||
                        `GAD-REF-${selectedRecord.refundId?.substring(0, 6)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Refunded Amount:</span>
                    <span className="text-amber-400 font-bold">
                      {formatCurrency(selectedRecord.refundedAmount)}
                    </span>
                  </div>
                  {selectedRecord.refundReason && (
                    <div className="text-slate-300 pt-1 italic text-[11px]">
                      Reason: &quot;{selectedRecord.refundReason}&quot;
                    </div>
                  )}
                  {selectedRecord.refundId && (
                    <div className="pt-2">
                      <a
                        href={`/api/customer/refunds/${selectedRecord.refundId}/pdf`}
                        download={`refund-${selectedRecord.refundNumber || 'document'}.pdf`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        Download Refund Credit Note PDF
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* FINANCIAL TIMELINE */}
              {financialTimeline && financialTimeline.length > 0 && (
                <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase font-mono">
                    Financial Lifecycle Timeline
                  </h4>
                  <div className="space-y-3 pl-2 border-l border-slate-700">
                    {financialTimeline.map((item, idx) => (
                      <div key={idx} className="relative pl-4 font-mono text-xs">
                        <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-[#68dba9]" />
                        <span className="text-[10px] text-slate-500 block">
                          {formatDate(item.timestamp)}
                        </span>
                        <span className="text-white font-semibold">{item.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#262a33]">
                {selectedRecord.invoiceNumber && (
                  <a
                    href={`/api/customer/bookings/${selectedRecord.bookingId}/invoice/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">visibility</span>
                    View Tax Invoice
                  </a>
                )}

                {selectedRecord.paymentId && selectedRecord.paymentStatus === 'CAPTURED' && (
                  <a
                    href={`/api/customer/payments/${selectedRecord.paymentId}/receipt/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">receipt</span>
                    View Payment Receipt
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
