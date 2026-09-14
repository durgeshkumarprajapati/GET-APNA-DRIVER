import { prisma } from '@/shared/database/prisma';
import { TaxInvoiceStatus } from '@prisma/client';

export interface TaxInvoiceItem {
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
  status: TaxInvoiceStatus;
  supplierSnapshot: {
    name: string;
    gstin: string;
    sacCode: string;
    serviceCategory: string;
    address: string;
  };
  customerSnapshot: {
    customerId: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
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
  createdAt: string;
}

export function generateInvoiceNumber(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yyyy}${mm}${dd}-${randomSuffix}`;
}

export async function createTaxInvoiceForBooking(bookingId: string): Promise<TaxInvoiceItem> {
  // Check if invoice already exists
  const existing = await prisma.taxInvoice.findUnique({
    where: { bookingId },
    include: { customer: { include: { customerProfile: true, identities: true } } },
  });

  if (existing) {
    return formatInvoiceResponse(existing);
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: {
        include: {
          customerProfile: true,
          identities: true,
        },
      },
      payments: {
        where: { status: 'CAPTURED' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!booking) {
    throw new Error('BOOKING_NOT_FOUND');
  }

  const payment = booking.payments[0];
  const grossAmount = Number(
    booking.finalFareAmount ?? booking.estimatedFareAmount ?? payment?.amount ?? 0,
  );
  const discountAmount = Number(payment?.discountAmount ?? 0);
  const netAmount = Math.max(0, grossAmount - discountAmount);

  // SAC Code 9964: Passenger Transport Services (18% GST = 9% CGST + 9% SGST)
  const subtotalAmount = Number((netAmount / 1.18).toFixed(2));
  const taxAmount = Number((netAmount - subtotalAmount).toFixed(2));
  const cgstAmount = Number((taxAmount / 2).toFixed(2));
  const sgstAmount = Number((taxAmount - cgstAmount).toFixed(2));

  const customerName =
    booking.customer.customerProfile?.displayName ||
    (booking.customer.customerProfile?.firstName
      ? `${booking.customer.customerProfile.firstName} ${booking.customer.customerProfile.lastName || ''}`.trim()
      : 'Valued Customer');
  const customerEmail = booking.customer.identities.find((i) => i.email)?.email || null;
  const customerPhone = booking.customer.identities.find((i) => i.phoneNumber)?.phoneNumber || null;

  const supplierSnapshot = {
    name: 'GET APNA DRIVER PRIVATE LIMITED',
    gstin: '07AAAAA0000A1Z5',
    sacCode: '9964',
    serviceCategory: 'Passenger Transport Chauffeur Services',
    address: 'Connaught Place, New Delhi - 110001, India',
  };

  const customerSnapshot = {
    customerId: booking.customerId,
    name: customerName,
    email: customerEmail,
    phone: customerPhone,
  };

  const taxDetails = {
    cgstRate: 9,
    cgstAmount,
    sgstRate: 9,
    sgstAmount,
    igstRate: 0,
    igstAmount: 0,
  };

  let invoiceNumber = generateInvoiceNumber();
  let attempts = 0;
  while (attempts < 5) {
    const isUnique = !(await prisma.taxInvoice.findUnique({ where: { invoiceNumber } }));
    if (isUnique) break;
    invoiceNumber = generateInvoiceNumber();
    attempts++;
  }

  const invoice = await prisma.taxInvoice.create({
    data: {
      invoiceNumber,
      customerId: booking.customerId,
      bookingId: booking.id,
      paymentId: payment?.id || null,
      subtotalAmount,
      discountAmount,
      taxAmount,
      totalAmount: netAmount,
      currency: 'INR',
      status: TaxInvoiceStatus.ISSUED,
      supplierSnapshot,
      customerSnapshot,
      taxDetails,
    },
  });

  return formatInvoiceResponse(invoice);
}

// Unbounded until Phase 32 — no caller ever created invoices, so no
// customer had more than zero. Now that capturePayment generates one per
// booking, a long-tenured customer's history could grow without limit;
// cap it the same way the admin list is paginated, rather than fetching
// every row on every page load.
const CUSTOMER_INVOICE_LIST_LIMIT = 200;

export async function getCustomerInvoices(customerId: string): Promise<TaxInvoiceItem[]> {
  const invoices = await prisma.taxInvoice.findMany({
    where: { customerId },
    orderBy: { issuedAt: 'desc' },
    take: CUSTOMER_INVOICE_LIST_LIMIT,
  });
  return invoices.map(formatInvoiceResponse);
}

export async function getCustomerInvoiceById(
  customerId: string,
  invoiceId: string,
): Promise<TaxInvoiceItem | null> {
  const invoice = await prisma.taxInvoice.findFirst({
    where: { id: invoiceId, customerId },
  });
  if (!invoice) return null;
  return formatInvoiceResponse(invoice);
}

export async function getAdminInvoices(
  page: number = 1,
  pageSize: number = 20,
  statusFilter?: TaxInvoiceStatus,
): Promise<{ invoices: TaxInvoiceItem[]; total: number; page: number; pageSize: number }> {
  const where = statusFilter ? { status: statusFilter } : {};
  const skip = (page - 1) * pageSize;

  const [invoices, total] = await Promise.all([
    prisma.taxInvoice.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.taxInvoice.count({ where }),
  ]);

  return {
    invoices: invoices.map(formatInvoiceResponse),
    total,
    page,
    pageSize,
  };
}

interface InvoiceDbRecord {
  id: string;
  invoiceNumber: string;
  customerId: string;
  bookingId?: string | null;
  paymentId?: string | null;
  subtotalAmount: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  totalAmount: unknown;
  currency: string;
  status: TaxInvoiceStatus;
  supplierSnapshot: unknown;
  customerSnapshot: unknown;
  taxDetails: unknown;
  issuedAt: Date;
  createdAt: Date;
}

function formatInvoiceResponse(inv: InvoiceDbRecord): TaxInvoiceItem {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerId: inv.customerId,
    bookingId: inv.bookingId,
    paymentId: inv.paymentId,
    subtotalAmount: Number(inv.subtotalAmount),
    discountAmount: Number(inv.discountAmount),
    taxAmount: Number(inv.taxAmount),
    totalAmount: Number(inv.totalAmount),
    currency: inv.currency,
    status: inv.status,
    supplierSnapshot: inv.supplierSnapshot as TaxInvoiceItem['supplierSnapshot'],
    customerSnapshot: inv.customerSnapshot as TaxInvoiceItem['customerSnapshot'],
    taxDetails: inv.taxDetails as TaxInvoiceItem['taxDetails'],
    issuedAt: inv.issuedAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  };
}
