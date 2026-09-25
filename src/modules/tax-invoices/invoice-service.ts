import { prisma, type Db } from '@/shared/database/prisma';
import { TaxInvoiceStatus } from '@prisma/client';
import { calculateTaxBreakdown } from './tax-calculation-service';

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
    isForSomeoneElse?: boolean;
    serviceRecipient?: {
      fullName: string;
      phone: string;
      relationship?: string | null;
      notes?: string | null;
    } | null;
  };
  taxDetails: {
    driverCharges: number;
    platformCharges: number;
    otherCharges: number;
    grossSubtotal: number;
    discountAmount: number;
    taxableAmount: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalTaxAmount: number;
  };
  issuedAt: string;
  createdAt: string;
}

export async function generateSequentialInvoiceNumber(
  db: Db = prisma,
  date: Date = new Date(),
): Promise<string> {
  const year = date.getFullYear();
  const prefix = `GAD-INV-${year}-`;

  const count = await db.taxInvoice.count({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
  });

  const seq = count + 1;
  let candidate = `${prefix}${String(seq).padStart(6, '0')}`;

  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.taxInvoice.findUnique({ where: { invoiceNumber: candidate } });
    if (!existing) return candidate;
    attempts++;
    candidate = `${prefix}${String(seq + attempts).padStart(6, '0')}`;
  }

  return `${prefix}${Date.now().toString().slice(-6)}`;
}

export function generateInvoiceNumber(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `GAD-INV-${yyyy}${mm}${dd}-${randomSuffix}`;
}

export async function createTaxInvoiceForBooking(
  bookingId: string,
  db: Db = prisma,
): Promise<TaxInvoiceItem> {
  // Check if invoice already exists
  const existing = await db.taxInvoice.findUnique({
    where: { bookingId },
    include: { customer: { include: { customerProfile: true, identities: true } } },
  });

  if (existing) {
    return formatInvoiceResponse(existing);
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: {
        include: {
          customerProfile: true,
          identities: true,
        },
      },
      serviceRecipient: true,
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
  const finalFare = Number(
    booking.finalFareAmount ?? booking.estimatedFareAmount ?? payment?.amount ?? 0,
  );
  const discountAmount = Number(payment?.discountAmount ?? 0);
  const platformCharges = Number(payment?.commissionAmount ?? 0);
  const driverCharges = Math.max(0, finalFare - platformCharges);

  const taxBreakdown = calculateTaxBreakdown({
    driverCharges,
    platformCharges,
    otherCharges: 0,
    discountAmount,
    gstRatePercent: 18,
    isTaxInclusive: true,
  });

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
    isForSomeoneElse: Boolean(booking.serviceRecipient),
    serviceRecipient: booking.serviceRecipient
      ? {
          fullName: booking.serviceRecipient.fullName,
          phone: booking.serviceRecipient.phone,
          relationship: booking.serviceRecipient.relationship,
          notes: booking.serviceRecipient.notes,
        }
      : null,
  };

  const taxDetails = {
    driverCharges: taxBreakdown.driverCharges,
    platformCharges: taxBreakdown.platformCharges,
    otherCharges: taxBreakdown.otherCharges,
    grossSubtotal: taxBreakdown.grossSubtotal,
    discountAmount: taxBreakdown.discountAmount,
    taxableAmount: taxBreakdown.taxableAmount,
    cgstRate: taxBreakdown.cgstRatePercent,
    cgstAmount: taxBreakdown.cgstAmount,
    sgstRate: taxBreakdown.sgstRatePercent,
    sgstAmount: taxBreakdown.sgstAmount,
    igstRate: taxBreakdown.igstRatePercent,
    igstAmount: taxBreakdown.igstAmount,
    totalTaxAmount: taxBreakdown.totalTaxAmount,
  };

  const invoiceNumber = await generateSequentialInvoiceNumber(db);

  const invoice = await db.taxInvoice.create({
    data: {
      invoiceNumber,
      customerId: booking.customerId,
      bookingId: booking.id,
      paymentId: payment?.id || null,
      subtotalAmount: taxBreakdown.taxableAmount,
      discountAmount: taxBreakdown.discountAmount,
      taxAmount: taxBreakdown.totalTaxAmount,
      totalAmount: taxBreakdown.finalPayable,
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

export async function getCustomerInvoiceByBookingId(
  customerId: string,
  bookingId: string,
): Promise<TaxInvoiceItem | null> {
  const invoice = await prisma.taxInvoice.findFirst({
    where: { bookingId, customerId },
  });
  if (!invoice) return null;
  return formatInvoiceResponse(invoice);
}

export async function getInvoiceByBookingId(bookingId: string): Promise<TaxInvoiceItem | null> {
  const invoice = await prisma.taxInvoice.findFirst({
    where: { bookingId },
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
