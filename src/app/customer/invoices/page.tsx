'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { useTranslation } from '@/i18n/context';

interface TaxInvoiceListItem {
  id: string;
  invoiceNumber: string;
  bookingId?: string | null;
  totalAmount: number;
  currency: string;
  status: string;
  issuedAt: string;
}

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  ISSUED: 'success',
  CANCELLED: 'neutral',
  CREDIT_NOTE_ISSUED: 'warning',
};

export default function CustomerInvoicesPage() {
  const { t, formatCurrency, formatDate, statusLabel } = useTranslation();
  const [invoices, setInvoices] = useState<TaxInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/customer/tax-invoices');
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load invoices.');
        if (isMounted) {
          setInvoices(data.invoices || []);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading invoices.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [retryToken]);

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <PageHeader
          eyebrow={t('customer.invoices.eyebrow')}
          title={t('customer.invoices.title')}
          subtitle={t('customer.invoices.subtitle')}
        />

        {loading ? (
          <LoadingState message={t('customer.invoices.loadingMessage')} />
        ) : error ? (
          <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 font-mono flex items-center justify-between gap-4">
            <span>{t('customer.invoices.errorMessage')}</span>
            <button
              type="button"
              onClick={() => setRetryToken((prev) => prev + 1)}
              className="px-3 py-1 bg-red-900/60 rounded text-red-100 font-bold hover:bg-red-800 shrink-0"
            >
              {t('customer.invoices.retry')}
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState icon="receipt_long" message={t('customer.invoices.emptyMessage')} />
        ) : (
          <div className="hidden md:block overflow-x-auto rounded-xl border border-[#262a33]">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase border-b border-[#262a33]">
                  <th className="py-3 px-4">{t('customer.invoices.invoiceNumber')}</th>
                  <th className="py-3 px-4">{t('customer.invoices.issuedOn')}</th>
                  <th className="py-3 px-4 text-right">{t('customer.invoices.total')}</th>
                  <th className="py-3 px-4">{t('customer.invoices.status')}</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262a33] font-mono">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#181c24]/60 transition-colors">
                    <td className="py-3 px-4 text-[#dfe2ee] font-bold">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 text-[#bccac0]">{formatDate(inv.issuedAt)}</td>
                    <td className="py-3 px-4 text-right text-[#dfe2ee]">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={statusLabel(inv.status)}
                        tone={STATUS_TONE[inv.status] ?? 'neutral'}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/customer/invoices/${inv.id}`}
                        className="text-[#68dba9] hover:underline font-bold"
                      >
                        {t('customer.invoices.view')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && invoices.length > 0 && (
          <div className="flex flex-col gap-3 md:hidden">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/customer/invoices/${inv.id}`}
                className="block p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#3d4a42] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    {inv.invoiceNumber}
                  </span>
                  <StatusBadge
                    label={statusLabel(inv.status)}
                    tone={STATUS_TONE[inv.status] ?? 'neutral'}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 mt-2 text-xs font-mono">
                  <span className="text-[#87948b]">{formatDate(inv.issuedAt)}</span>
                  <span className="text-[#dfe2ee] font-bold">
                    {formatCurrency(inv.totalAmount)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
