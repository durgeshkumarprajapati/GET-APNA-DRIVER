'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { useTranslation } from '@/i18n/context';

interface TaxInvoiceItem {
  id: string;
  invoiceNumber: string;
  customerId: string;
  bookingId?: string | null;
  paymentId?: string | null;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  supplierSnapshot: {
    name: string;
    gstin: string;
    sacCode: string;
    serviceCategory: string;
    address: string;
  };
  customerSnapshot: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  taxDetails?: {
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
  };
  issuedAt: string;
}

export default function TaxInvoicesPage() {
  const { t, formatCurrency, formatDate } = useTranslation();
  const [invoices, setInvoices] = useState<TaxInvoiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<TaxInvoiceItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/tax-invoices?page=${page}&pageSize=15`);
        if (!res.ok) throw new Error('Failed to fetch tax invoices.');
        const data = await res.json();
        if (isMounted) {
          setInvoices(data.invoices || []);
          setTotal(data.total || 0);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading tax invoices.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [page]);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        {/* PAGE HEADER */}
        <div className="flex items-center justify-between bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>{t('admin.taxInvoices.eyebrow')}</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              {t('admin.taxInvoices.title')}
            </h1>
          </div>
        </div>

        {/* GST COMPLIANCE NOTICE */}
        <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] font-mono text-xs text-[#bccac0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#68dba9] text-base">verified</span>
            <span>{t('admin.taxInvoices.subtitle')}</span>
          </div>
          <span className="text-[11px] text-[#68dba9] font-bold">SAC 9964 (GST 18%)</span>
        </div>

        {/* LOADING & ERROR */}
        {loading && (
          <div className="flex items-center justify-center p-12 bg-[#0a0e16] rounded-xl border border-[#262a33]">
            <div className="flex flex-col items-center gap-3">
              <span className="w-8 h-8 rounded-full border-2 border-[#68dba9] border-t-transparent animate-spin" />
              <span className="text-xs font-mono text-[#bccac0]">
                Loading tax invoice repository...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 font-mono">
            {error}
          </div>
        )}

        {/* INVOICE TABLE */}
        {!loading && !error && (
          <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] overflow-hidden">
            {invoices.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-[#87948b]">
                {t('admin.taxInvoices.noInvoices')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#181c24] text-[#87948b] border-b border-[#262a33] uppercase text-[10px]">
                    <tr>
                      <th className="p-3.5">Invoice #</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Subtotal</th>
                      <th className="p-3.5">GST (18%)</th>
                      <th className="p-3.5">Total Amount</th>
                      <th className="p-3.5">Issued Date</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262a33]">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#181c24]/50 text-[#dfe2ee]">
                        <td className="p-3.5 font-bold text-[#68dba9]">{inv.invoiceNumber}</td>
                        <td className="p-3.5">
                          <div>{inv.customerSnapshot.name || 'Customer'}</div>
                          <div className="text-[10px] text-[#87948b]">
                            {inv.customerSnapshot.email || '—'}
                          </div>
                        </td>
                        <td className="p-3.5">{formatCurrency(inv.subtotalAmount)}</td>
                        <td className="p-3.5 text-[#bccac0]">{formatCurrency(inv.taxAmount)}</td>
                        <td className="p-3.5 font-bold">{formatCurrency(inv.totalAmount)}</td>
                        <td className="p-3.5 text-[#bccac0]">{formatDate(inv.issuedAt)}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00311f] text-[#68dba9] border border-[#25a475]/30">
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2.5 py-1 bg-[#181c24] hover:bg-[#262a33] text-[#68dba9] rounded border border-[#262a33] transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION */}
            {total > 15 && (
              <div className="p-3 bg-[#181c24] border-t border-[#262a33] flex items-center justify-between text-xs font-mono text-[#bccac0]">
                <span>
                  Showing page {page} of {Math.ceil(total / 15)} ({total} invoices)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => {
                      setLoading(true);
                      setPage(page - 1);
                    }}
                    className="px-2.5 py-1 bg-[#0a0e16] hover:bg-[#262a33] rounded border border-[#262a33] disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= Math.ceil(total / 15)}
                    onClick={() => {
                      setLoading(true);
                      setPage(page + 1);
                    }}
                    className="px-2.5 py-1 bg-[#0a0e16] hover:bg-[#262a33] rounded border border-[#262a33] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* INVOICE INSPECT MODAL */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-[#0a0e16]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#1c2028] border border-[#3d4a42] rounded-2xl p-6 max-w-xl w-full space-y-5 shadow-2xl font-mono text-xs text-[#dfe2ee]">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <div>
                  <span className="text-[10px] text-[#68dba9] font-bold">OFFICIAL TAX INVOICE</span>
                  <h3 className="text-base font-bold text-[#dfe2ee]">
                    {selectedInvoice.invoiceNumber}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="text-[#bccac0] hover:text-[#dfe2ee]"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* SUPPLIER & CUSTOMER SNAPSHOT */}
              <div className="grid grid-cols-2 gap-4 bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
                <div>
                  <span className="text-[10px] text-[#87948b] font-bold uppercase block mb-1">
                    Supplier / Issuer
                  </span>
                  <div className="font-bold text-[#68dba9]">
                    {selectedInvoice.supplierSnapshot.name}
                  </div>
                  <div className="text-[10px] text-[#bccac0]">
                    GSTIN: {selectedInvoice.supplierSnapshot.gstin}
                  </div>
                  <div className="text-[10px] text-[#bccac0]">
                    SAC: {selectedInvoice.supplierSnapshot.sacCode}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-[#87948b] font-bold uppercase block mb-1">
                    Customer / Billed To
                  </span>
                  <div className="font-bold">
                    {selectedInvoice.customerSnapshot.name || 'Valued Customer'}
                  </div>
                  <div className="text-[10px] text-[#bccac0]">
                    {selectedInvoice.customerSnapshot.email || '—'}
                  </div>
                  <div className="text-[10px] text-[#bccac0]">
                    {selectedInvoice.customerSnapshot.phone || '—'}
                  </div>
                </div>
              </div>

              {/* FINANCIAL BREAKDOWN */}
              <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal Amount:</span>
                  <span>{formatCurrency(selectedInvoice.subtotalAmount)}</span>
                </div>
                <div className="flex justify-between text-[#bccac0]">
                  <span>Discount Applied:</span>
                  <span>- {formatCurrency(selectedInvoice.discountAmount)}</span>
                </div>
                <div className="flex justify-between text-[#68dba9]">
                  <span>CGST (9%):</span>
                  <span>
                    +{' '}
                    {formatCurrency(
                      selectedInvoice.taxDetails?.cgstAmount || selectedInvoice.taxAmount / 2,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-[#68dba9]">
                  <span>SGST (9%):</span>
                  <span>
                    +{' '}
                    {formatCurrency(
                      selectedInvoice.taxDetails?.sgstAmount || selectedInvoice.taxAmount / 2,
                    )}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#262a33] text-sm font-bold text-[#dfe2ee]">
                  <span>Total Payable:</span>
                  <span className="text-[#68dba9]">
                    {formatCurrency(selectedInvoice.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 bg-[#262a33] hover:bg-[#31353e] rounded-xl text-[#dfe2ee] font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
