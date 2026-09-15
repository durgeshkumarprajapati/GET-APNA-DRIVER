import { prisma } from '@/shared/database/prisma';

export class PaymentAdapter {
  async checkPaymentState(bookingId: string) {
    const payment = await prisma.payment.findFirst({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });

    const taxInvoice = await prisma.taxInvoice.findUnique({
      where: { bookingId },
    });

    return {
      hasPayment: Boolean(payment),
      paymentCaptured: payment?.status === 'CAPTURED',
      hasTaxInvoice: Boolean(taxInvoice),
    };
  }

  async retryTaxInvoiceGeneration(bookingId: string): Promise<boolean> {
    const taxInvoice = await prisma.taxInvoice.findUnique({
      where: { bookingId },
    });

    if (taxInvoice) return true; // Already exists (idempotent)

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, customerId: true, finalFareAmount: true, status: true },
    });

    if (!booking || !booking.customerId || booking.status !== 'TRIP_COMPLETED') {
      return false;
    }

    const fare = Number(booking.finalFareAmount || 450);
    const taxAmount = Math.round(fare * 0.05);

    try {
      await prisma.taxInvoice.create({
        data: {
          bookingId,
          customerId: booking.customerId,
          invoiceNumber: `INV-REL-${Date.now().toString(36).toUpperCase()}`,
          subtotalAmount: fare - taxAmount,
          taxAmount,
          totalAmount: fare,
          status: 'ISSUED',
          supplierSnapshot: { name: 'GET APNA DRIVER' },
          customerSnapshot: { customerId: booking.customerId },
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}
