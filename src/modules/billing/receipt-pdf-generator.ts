import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { CustomerPaymentReceipt } from './billing-service';

export async function generateReceiptPdfBuffer(receipt: CustomerPaymentReceipt): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Watermark
      const logoPath = path.join(process.cwd(), 'public', 'icon-192.png');
      if (fs.existsSync(logoPath)) {
        doc.save();
        doc.opacity(0.06);
        const imgWidth = 260;
        const xPos = (doc.page.width - imgWidth) / 2;
        const yPos = (doc.page.height - imgWidth) / 2;
        doc.image(logoPath, xPos, yPos, { width: imgWidth });
        doc.restore();
      }

      // Brand Header
      doc.fillColor('#1E293B').fontSize(22).font('Helvetica-Bold').text('GET APNA DRIVER', 40, 40);
      doc.fillColor('#059669').fontSize(12).font('Helvetica-Bold').text('PAYMENT RECEIPT', 40, 68);

      // Supplier / Company Info
      doc
        .fillColor('#334155')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('GET APNA DRIVER PRIVATE LIMITED', 300, 40, { align: 'right' });
      doc
        .font('Helvetica')
        .fillColor('#64748B')
        .text('Connaught Place, New Delhi - 110001, India', 300, 52, { align: 'right' });
      doc.text(`Support: support@getapnadriver.com`, 300, 64, { align: 'right' });

      // Divider Line
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, 85).lineTo(555, 85).stroke();

      // Details Section
      let currentY = 105;

      // Receipt Details (Left)
      doc
        .fillColor('#0F172A')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Receipt Details', 40, currentY);
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      currentY += 16;
      doc.text(`Receipt No: ${receipt.receiptNumber}`, 40, currentY);
      currentY += 14;
      const formattedDate = new Date(receipt.paidAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      doc.text(`Paid Date: ${formattedDate}`, 40, currentY);
      currentY += 14;
      doc.text(`Booking ID: ${receipt.bookingId}`, 40, currentY);
      currentY += 14;
      if (receipt.invoiceNumber) {
        doc.text(`Invoice No: ${receipt.invoiceNumber}`, 40, currentY);
        currentY += 14;
      }
      doc.text(`Payment Method: ${receipt.paymentMethod}`, 40, currentY);
      currentY += 14;
      doc.text(`Status: ${receipt.status}`, 40, currentY);

      // Customer Details (Right)
      let custY = 105;
      const cust = receipt.customerSnapshot || {};
      doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('Billed To', 300, custY);
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      custY += 16;
      doc.text(`Name: ${cust.name || 'Valued Customer'}`, 300, custY);
      if (cust.phone) {
        custY += 14;
        doc.text(`Phone: ${cust.phone}`, 300, custY);
      }
      if (cust.email) {
        custY += 14;
        doc.text(`Email: ${cust.email}`, 300, custY);
      }

      // Service Recipient (Phase 74)
      if (receipt.serviceRecipient?.isForSomeoneElse) {
        custY += 18;
        doc
          .fillColor('#0F172A')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Service For (Recipient)', 300, custY);
        doc.font('Helvetica').fontSize(9).fillColor('#475569');
        custY += 16;
        doc.text(`Name: ${receipt.serviceRecipient.fullName}`, 300, custY);
        if (receipt.serviceRecipient.phone) {
          custY += 14;
          doc.text(`Phone: ${receipt.serviceRecipient.phone}`, 300, custY);
        }
      }

      currentY = Math.max(currentY + 25, custY + 25);

      // Payment Box Card
      doc.rect(40, currentY, 515, 60).fill('#F8FAFC');
      doc.rect(40, currentY, 515, 60).stroke('#E2E8F0');

      doc
        .fillColor('#334155')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('AMOUNT PAID', 60, currentY + 16);
      doc
        .fillColor('#059669')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(`INR ${receipt.amount.toFixed(2)}`, 300, currentY + 14, {
          align: 'right',
          width: 235,
        });

      doc
        .fillColor('#64748B')
        .fontSize(8)
        .font('Helvetica')
        .text(
          `Payment Status: ${receipt.status} | Method: ${receipt.paymentMethod}`,
          60,
          currentY + 36,
        );

      // Footer
      const footerY = doc.page.height - 60;
      doc
        .strokeColor('#CBD5E1')
        .lineWidth(0.5)
        .moveTo(40, footerY - 10)
        .lineTo(555, footerY - 10)
        .stroke();

      doc
        .fillColor('#94A3B8')
        .fontSize(8)
        .font('Helvetica')
        .text(
          'This receipt confirms payment for driver services rendered via GET APNA DRIVER.',
          40,
          footerY,
          { align: 'center', width: 515 },
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
