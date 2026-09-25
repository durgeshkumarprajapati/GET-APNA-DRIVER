import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  getCustomerInvoiceByBookingId,
  createTaxInvoiceForBooking,
} from '@/modules/tax-invoices/invoice-service';
import { generateInvoicePdfBuffer } from '@/modules/tax-invoices/pdf-generator';
import { prisma } from '@/shared/database/prisma';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (_req: NextRequest, { principal }, routeContext?: unknown) => {
  try {
    const { bookingId } = (routeContext as { params: Promise<{ bookingId: string }> })?.params
      ? await (routeContext as { params: Promise<{ bookingId: string }> }).params
      : { bookingId: '' };

    if (!bookingId) {
      return NextResponse.json(
        { error: 'MISSING_BOOKING_ID', message: 'Booking ID is required' },
        { status: 400 },
      );
    }

    // Verify booking ownership (IDOR protection)
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { customerId: true, status: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
        { status: 404 },
      );
    }

    if (booking.customerId !== principal.userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'You are not authorized to access this invoice' },
        { status: 403 },
      );
    }

    let invoice = await getCustomerInvoiceByBookingId(principal.userId, bookingId);

    if (!invoice) {
      try {
        invoice = await createTaxInvoiceForBooking(bookingId);
      } catch {
        return NextResponse.json(
          {
            error: 'INVOICE_NOT_AVAILABLE',
            message: 'Invoice is not available yet for this booking',
          },
          { status: 404 },
        );
      }
    }

    const pdfBuffer = await generateInvoicePdfBuffer(invoice);

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    headers.set('Content-Length', pdfBuffer.length.toString());

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    return toErrorResponse(err, _req.nextUrl.pathname);
  }
});
