import { prisma, type Db } from '@/shared/database/prisma';
import { PaymentStatus, RefundStatus, TaxInvoiceStatus } from '@prisma/client';

export interface CustomerBillingQueryOptions {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
  invoiceStatus?: string;
  search?: string;
}

export interface BillingSummaryMetrics {
  totalPaid: number;
  totalRefunded: number;
  netSpend: number;
  invoiceCount: number;
  pendingPaymentsCount: number;
}

export interface CustomerBillingRecordItem {
  id: string; // payment ID or invoice ID
  bookingId: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  paymentId?: string | null;
  paymentMethod?: string | null;
  providerPaymentId?: string | null;
  refundId?: string | null;
  refundNumber?: string | null;
  serviceType: string;
  amount: number;
  discountAmount: number;
  taxAmount: number;
  paidAmount: number;
  refundedAmount: number;
  netAmount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  invoiceStatus?: TaxInvoiceStatus | null;
  refundStatus?: RefundStatus | null;
  refundReason?: string | null;
  issuedAt: string;
  createdAt: string;
  billedTo: {
    customerId: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  serviceFor?: {
    isForSomeoneElse: boolean;
    recipientName?: string | null;
    recipientPhone?: string | null;
    relationship?: string | null;
  } | null;
}

export interface CustomerPaymentReceipt {
  paymentId: string;
  bookingId: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  receiptNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: PaymentStatus;
  providerReference?: string | null;
  paidAt: string;
  customerSnapshot: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  serviceRecipient?: {
    isForSomeoneElse: boolean;
    fullName?: string | null;
    phone?: string | null;
  } | null;
}

export interface RefundDocumentItem {
  id: string;
  refundNumber: string;
  bookingId: string;
  paymentId: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  refundAmount: number;
  currency: string;
  status: RefundStatus;
  reason?: string | null;
  failureReason?: string | null;
  issuedAt: string;
  processedAt?: string | null;
  customerSnapshot: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  serviceRecipient?: {
    isForSomeoneElse: boolean;
    fullName?: string | null;
    phone?: string | null;
  } | null;
}

export async function generateSequentialRefundNumber(
  db: Db = prisma,
  date: Date = new Date(),
): Promise<string> {
  const year = date.getFullYear();
  const prefix = `GAD-REF-${year}-`;

  const count = await db.refund.count({
    where: {
      refundNumber: {
        startsWith: prefix,
      },
    },
  });

  const seq = count + 1;
  let candidate = `${prefix}${String(seq).padStart(6, '0')}`;

  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.refund.findFirst({ where: { refundNumber: candidate } });
    if (!existing) return candidate;
    attempts++;
    candidate = `${prefix}${String(seq + attempts).padStart(6, '0')}`;
  }

  return `${prefix}${Date.now().toString().slice(-6)}`;
}

export async function getCustomerBillingSummary(
  customerId: string,
  db: Db = prisma,
): Promise<BillingSummaryMetrics> {
  const [capturedPayments, refunds, invoiceCount, pendingCount] = await Promise.all([
    db.payment.aggregate({
      where: { customerId, status: PaymentStatus.CAPTURED },
      _sum: { amount: true },
    }),
    db.refund.aggregate({
      where: {
        payment: { customerId },
        status: RefundStatus.PROCESSED,
      },
      _sum: { amount: true },
    }),
    db.taxInvoice.count({
      where: { customerId },
    }),
    db.payment.count({
      where: { customerId, status: PaymentStatus.CREATED },
    }),
  ]);

  const totalPaid = Number(capturedPayments._sum.amount ?? 0);
  const totalRefunded = Number(refunds._sum.amount ?? 0);
  const netSpend = Math.max(0, totalPaid - totalRefunded);

  return {
    totalPaid,
    totalRefunded,
    netSpend,
    invoiceCount,
    pendingPaymentsCount: pendingCount,
  };
}

export async function getCustomerBillingHistory(
  customerId: string,
  options: CustomerBillingQueryOptions = {},
  db: Db = prisma,
): Promise<{
  records: CustomerBillingRecordItem[];
  summary: BillingSummaryMetrics;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 15));
  const skip = (page - 1) * pageSize;

  const whereClause: Record<string, unknown> = { customerId };

  if (options.startDate || options.endDate) {
    const createdAtFilter: Record<string, Date> = {};
    if (options.startDate) createdAtFilter.gte = new Date(options.startDate);
    if (options.endDate) createdAtFilter.lte = new Date(options.endDate);
    whereClause.createdAt = createdAtFilter;
  }

  if (options.paymentStatus) {
    whereClause.status = options.paymentStatus as PaymentStatus;
  }

  if (options.search) {
    const s = options.search.trim();
    whereClause.OR = [
      { bookingId: { contains: s, mode: 'insensitive' } },
      { id: { contains: s, mode: 'insensitive' } },
      { providerPaymentId: { contains: s, mode: 'insensitive' } },
      { booking: { taxInvoice: { invoiceNumber: { contains: s, mode: 'insensitive' } } } },
    ];
  }

  const [payments, total, summary] = await Promise.all([
    db.payment.findMany({
      where: whereClause,
      include: {
        booking: {
          include: {
            taxInvoice: true,
            serviceRecipient: true,
          },
        },
        refunds: {
          orderBy: { createdAt: 'desc' },
        },
        customer: {
          include: {
            customerProfile: true,
            identities: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    db.payment.count({ where: whereClause }),
    getCustomerBillingSummary(customerId, db),
  ]);

  const records: CustomerBillingRecordItem[] = payments.map((p) => {
    const inv = p.booking?.taxInvoice;
    const latestRefund = p.refunds[0];
    const totalRefunded = p.refunds
      .filter((r) => r.status === RefundStatus.PROCESSED)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const custName =
      p.customer?.customerProfile?.displayName ||
      (p.customer?.customerProfile?.firstName
        ? `${p.customer.customerProfile.firstName} ${p.customer.customerProfile.lastName || ''}`.trim()
        : 'Valued Customer');
    const custEmail = p.customer?.identities?.find((i) => i.email)?.email || null;
    const custPhone = p.customer?.identities?.find((i) => i.phoneNumber)?.phoneNumber || null;

    const paidAmount = p.status === PaymentStatus.CAPTURED ? Number(p.amount) : 0;
    const netAmount = Math.max(0, paidAmount - totalRefunded);

    return {
      id: p.id,
      bookingId: p.bookingId,
      invoiceId: inv?.id || null,
      invoiceNumber: inv?.invoiceNumber || null,
      paymentId: p.id,
      paymentMethod: p.paymentMethod || 'ONLINE',
      providerPaymentId: p.providerPaymentId || null,
      refundId: latestRefund?.id || null,
      refundNumber: latestRefund?.refundNumber || null,
      serviceType: p.booking?.bookingType || 'Chauffeur Service',
      amount: Number(p.amount),
      discountAmount: inv ? Number(inv.discountAmount) : 0,
      taxAmount: inv ? Number(inv.taxAmount) : 0,
      paidAmount,
      refundedAmount: totalRefunded,
      netAmount,
      currency: p.currency,
      paymentStatus: p.status,
      invoiceStatus: inv?.status || null,
      refundStatus: latestRefund?.status || null,
      refundReason: latestRefund?.reason || null,
      issuedAt: inv?.issuedAt ? inv.issuedAt.toISOString() : p.createdAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
      billedTo: {
        customerId: p.customerId,
        name: custName,
        email: custEmail,
        phone: custPhone,
      },
      serviceFor: p.booking?.serviceRecipient
        ? {
            isForSomeoneElse: true,
            recipientName: p.booking.serviceRecipient.fullName,
            recipientPhone: p.booking.serviceRecipient.phone,
            relationship: p.booking.serviceRecipient.relationship || null,
          }
        : {
            isForSomeoneElse: false,
          },
    };
  });

  return {
    records,
    summary,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCustomerPaymentReceipt(
  customerId: string,
  paymentId: string,
  db: Db = prisma,
): Promise<CustomerPaymentReceipt | null> {
  const payment = await db.payment.findFirst({
    where: { id: paymentId, customerId },
    include: {
      booking: {
        include: {
          taxInvoice: true,
          serviceRecipient: true,
        },
      },
      customer: {
        include: {
          customerProfile: true,
          identities: true,
        },
      },
    },
  });

  if (!payment) return null;

  const custName =
    payment.customer.customerProfile?.displayName ||
    (payment.customer.customerProfile?.firstName
      ? `${payment.customer.customerProfile.firstName} ${payment.customer.customerProfile.lastName || ''}`.trim()
      : 'Valued Customer');
  const custEmail = payment.customer.identities.find((i) => i.email)?.email || null;
  const custPhone = payment.customer.identities.find((i) => i.phoneNumber)?.phoneNumber || null;

  return {
    paymentId: payment.id,
    bookingId: payment.bookingId,
    invoiceId: payment.booking?.taxInvoice?.id || null,
    invoiceNumber: payment.booking?.taxInvoice?.invoiceNumber || null,
    receiptNumber: `REC-${payment.id.substring(0, 8).toUpperCase()}`,
    amount: Number(payment.amount),
    currency: payment.currency,
    paymentMethod: payment.paymentMethod || 'ONLINE',
    status: payment.status,
    providerReference: payment.providerPaymentId || null,
    paidAt: payment.updatedAt.toISOString(),
    customerSnapshot: {
      name: custName,
      email: custEmail,
      phone: custPhone,
    },
    serviceRecipient: payment.booking?.serviceRecipient
      ? {
          isForSomeoneElse: true,
          fullName: payment.booking.serviceRecipient.fullName,
          phone: payment.booking.serviceRecipient.phone,
        }
      : { isForSomeoneElse: false },
  };
}

export async function getRefundDocument(
  customerId: string,
  refundId: string,
  db: Db = prisma,
): Promise<RefundDocumentItem | null> {
  const refund = await db.refund.findFirst({
    where: {
      id: refundId,
      payment: { customerId },
    },
    include: {
      payment: {
        include: {
          booking: {
            include: {
              taxInvoice: true,
              serviceRecipient: true,
            },
          },
          customer: {
            include: {
              customerProfile: true,
              identities: true,
            },
          },
        },
      },
    },
  });

  if (!refund) return null;

  // Ensure sequential refund number if missing
  let refundNumber = refund.refundNumber;
  if (!refundNumber) {
    refundNumber = await generateSequentialRefundNumber(db, refund.createdAt);
    await db.refund.update({
      where: { id: refund.id },
      data: { refundNumber },
    });
  }

  const cust = refund.payment.customer;
  const custName =
    cust.customerProfile?.displayName ||
    (cust.customerProfile?.firstName
      ? `${cust.customerProfile.firstName} ${cust.customerProfile.lastName || ''}`.trim()
      : 'Valued Customer');
  const custEmail = cust.identities.find((i) => i.email)?.email || null;
  const custPhone = cust.identities.find((i) => i.phoneNumber)?.phoneNumber || null;

  return {
    id: refund.id,
    refundNumber,
    bookingId: refund.payment.bookingId,
    paymentId: refund.paymentId,
    invoiceId: refund.payment.booking?.taxInvoice?.id || null,
    invoiceNumber: refund.payment.booking?.taxInvoice?.invoiceNumber || null,
    refundAmount: Number(refund.amount),
    currency: refund.currency,
    status: refund.status,
    reason: refund.reason || null,
    failureReason: refund.failureReason || null,
    issuedAt: refund.createdAt.toISOString(),
    processedAt: refund.processedAt ? refund.processedAt.toISOString() : null,
    customerSnapshot: {
      name: custName,
      email: custEmail,
      phone: custPhone,
    },
    serviceRecipient: refund.payment.booking?.serviceRecipient
      ? {
          isForSomeoneElse: true,
          fullName: refund.payment.booking.serviceRecipient.fullName,
          phone: refund.payment.booking.serviceRecipient.phone,
        }
      : { isForSomeoneElse: false },
  };
}

export async function getFinancialTimelineForBooking(
  bookingId: string,
  db: Db = prisma,
): Promise<{
  bookingId: string;
  status: string;
  timeline: Array<{
    event: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }>;
}> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      taxInvoice: true,
      payments: {
        include: { refunds: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!booking) {
    throw new Error('BOOKING_NOT_FOUND');
  }

  const timeline: Array<{
    event: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }> = [];

  // 1. Booking Created
  timeline.push({
    event: 'BOOKING_CREATED',
    description: `Booking ${booking.id} created for ${booking.bookingType}`,
    timestamp: booking.createdAt.toISOString(),
  });

  // 2. Invoice Issued
  if (booking.taxInvoice) {
    timeline.push({
      event: 'INVOICE_ISSUED',
      description: `Tax Invoice ${booking.taxInvoice.invoiceNumber} issued for ₹${Number(booking.taxInvoice.totalAmount).toFixed(2)}`,
      timestamp: booking.taxInvoice.issuedAt.toISOString(),
      metadata: { invoiceNumber: booking.taxInvoice.invoiceNumber },
    });
  }

  // 3. Payments
  for (const payment of booking.payments) {
    timeline.push({
      event: `PAYMENT_${payment.status}`,
      description: `Payment of ₹${Number(payment.amount).toFixed(2)} via ${payment.paymentMethod || 'ONLINE'} status: ${payment.status}`,
      timestamp: payment.createdAt.toISOString(),
      metadata: { paymentId: payment.id, method: payment.paymentMethod },
    });

    // 4. Refunds for this payment
    for (const refund of payment.refunds) {
      timeline.push({
        event: `REFUND_${refund.status}`,
        description: `Refund of ₹${Number(refund.amount).toFixed(2)} status: ${refund.status}${refund.reason ? ` (${refund.reason})` : ''}`,
        timestamp: refund.createdAt.toISOString(),
        metadata: {
          refundId: refund.id,
          refundNumber: refund.refundNumber,
          amount: Number(refund.amount),
        },
      });
    }
  }

  return {
    bookingId: booking.id,
    status: booking.status,
    timeline: timeline.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    ),
  };
}
