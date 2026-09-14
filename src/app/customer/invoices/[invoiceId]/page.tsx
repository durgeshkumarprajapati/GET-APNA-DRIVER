'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { useTranslation } from '@/i18n/context';

interface TaxInvoiceDetail {
  id: string;
  invoiceNumber: string;
  bookingId?: string | null;
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
  taxDetails: {
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
  };
  issuedAt: string;
}

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  ISSUED: 'success',
  CANCELLED: 'neutral',
  CREDIT_NOTE_ISSUED: 'warning',
};

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[#262a33] last:border-b-0">
      <span className="text-xs text-[#87948b] uppercase tracking-wider">{label}</span>
      <span
        className={`text-sm text-[#dfe2ee] text-right font-mono ${bold ? 'font-bold text-base' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function CustomerInvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  const { t, formatCurrency, formatDate, statusLabel } = useTranslation();
  const [invoice, setInvoice] = useState<TaxInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/customer/tax-invoices/${invoiceId}`);
        const data = await res.json();
        if (!res.ok) {
          if (isMounted) setError(data.message || 'Invoice not found.');
          return;
        }
        if (isMounted) setInvoice(data.invoice);
      } catch {
        if (isMounted) setError('Error loading invoice.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [invoiceId]);

  if (loading) {
    return (
      <CustomerLayout>
        <LoadingState message={t('customer.invoices.loadingMessage')} />
      </CustomerLayout>
    );
  }

  if (error || !invoice) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm text-center max-w-sm">
            {error || t('customer.invoices.notFound')}
          </div>
          <Link href="/customer/invoices" className="text-[#68dba9] hover:underline text-sm">
            {t('customer.invoices.backToInvoices')}
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href="/customer/invoices"
              className="text-xs text-[#87948b] hover:text-[#68dba9] transition-colors"
            >
              {t('customer.invoices.backToInvoices')}
            </Link>
            <PageHeader
              eyebrow={t('customer.invoices.detailTitle')}
              title={invoice.invoiceNumber}
              subtitle={formatDate(invoice.issuedAt)}
            />
          </div>
          <StatusBadge
            label={statusLabel(invoice.status)}
            tone={STATUS_TONE[invoice.status] ?? 'neutral'}
          />
        </div>

        <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 space-y-1">
          <Row
            label={t('customer.invoices.subtotal')}
            value={formatCurrency(invoice.subtotalAmount)}
          />
          {invoice.discountAmount > 0 && (
            <Row
              label={t('customer.invoices.discount')}
              value={`-${formatCurrency(invoice.discountAmount)}`}
            />
          )}
          <Row
            label={`${t('customer.invoices.cgst')} (${invoice.taxDetails.cgstRate}%)`}
            value={formatCurrency(invoice.taxDetails.cgstAmount)}
          />
          <Row
            label={`${t('customer.invoices.sgst')} (${invoice.taxDetails.sgstRate}%)`}
            value={formatCurrency(invoice.taxDetails.sgstAmount)}
          />
          {invoice.taxDetails.igstAmount > 0 && (
            <Row
              label={`${t('customer.invoices.igst')} (${invoice.taxDetails.igstRate}%)`}
              value={formatCurrency(invoice.taxDetails.igstAmount)}
            />
          )}
          <Row
            label={t('customer.invoices.total')}
            value={formatCurrency(invoice.totalAmount)}
            bold
          />
        </div>

        <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 space-y-1">
          <Row label={t('customer.invoices.supplier')} value={invoice.supplierSnapshot.name} />
          <Row label={t('customer.invoices.gstin')} value={invoice.supplierSnapshot.gstin} />
          <Row label={t('customer.invoices.sacCode')} value={invoice.supplierSnapshot.sacCode} />
        </div>

        {invoice.bookingId && (
          <Link
            href={`/bookings/${invoice.bookingId}`}
            className="inline-block text-[#68dba9] hover:underline text-sm"
          >
            {t('customer.invoices.viewBooking')}
          </Link>
        )}
      </div>
    </CustomerLayout>
  );
}
