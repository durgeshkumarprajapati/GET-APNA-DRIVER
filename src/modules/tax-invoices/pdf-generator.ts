import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { TaxInvoiceItem } from './invoice-service';

export async function generateInvoicePdfBuffer(invoice: TaxInvoiceItem): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Subtle Background Watermark
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
      doc.fillColor('#64748B').fontSize(10).font('Helvetica').text('TAX INVOICE', 40, 68);

      // Supplier Info (Right aligned)
      const supplier = invoice.supplierSnapshot || {};
      doc
        .fillColor('#334155')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(supplier.name || 'GET APNA DRIVER PRIVATE LIMITED', 300, 40, { align: 'right' });
      doc
        .font('Helvetica')
        .fillColor('#64748B')
        .text(supplier.address || 'Connaught Place, New Delhi - 110001, India', 300, 52, {
          align: 'right',
        });
      doc.text(
        `GSTIN: ${supplier.gstin || '07AAAAA0000A1Z5'} | SAC: ${supplier.sacCode || '9964'}`,
        300,
        64,
        {
          align: 'right',
        },
      );

      // Horizontal Divider
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, 85).lineTo(555, 85).stroke();

      // Invoice Details & Customer Info Section
      let currentY = 100;

      // Invoice Details (Left Box)
      doc
        .fillColor('#0F172A')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Invoice Details', 40, currentY);
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      currentY += 16;
      doc.text(`Invoice No: ${invoice.invoiceNumber}`, 40, currentY);
      currentY += 14;
      const formattedDate = new Date(invoice.issuedAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc.text(`Date: ${formattedDate}`, 40, currentY);
      currentY += 14;
      doc.text(`Booking ID: ${invoice.bookingId || 'N/A'}`, 40, currentY);
      currentY += 14;
      doc.text(`Status: ${invoice.status}`, 40, currentY);

      // Customer Details (Right Box)
      let custY = 100;
      const cust = invoice.customerSnapshot || {};
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

      // Phase 74 Service Recipient Info
      if (cust.isForSomeoneElse && cust.serviceRecipient) {
        custY += 18;
        doc
          .fillColor('#0F172A')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Service For (Recipient)', 300, custY);
        doc.font('Helvetica').fontSize(9).fillColor('#475569');
        custY += 16;
        doc.text(`Name: ${cust.serviceRecipient.fullName}`, 300, custY);
        custY += 14;
        doc.text(`Phone: ${cust.serviceRecipient.phone}`, 300, custY);
        if (cust.serviceRecipient.relationship) {
          custY += 14;
          doc.text(`Relationship: ${cust.serviceRecipient.relationship}`, 300, custY);
        }
      }

      currentY = Math.max(currentY + 25, custY + 25);

      // Line Items Table Header
      doc.rect(40, currentY, 515, 22).fill('#F1F5F9');
      doc
        .fillColor('#334155')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Description', 50, currentY + 6);
      doc.text('Taxable (INR)', 320, currentY + 6, { width: 80, align: 'right' });
      doc.text('GST Rate', 410, currentY + 6, { width: 50, align: 'right' });
      doc.text('Total (INR)', 470, currentY + 6, { width: 75, align: 'right' });

      currentY += 22;

      // Line Items
      const details = invoice.taxDetails || {
        driverCharges: invoice.subtotalAmount,
        platformCharges: 0,
        otherCharges: 0,
        grossSubtotal: invoice.subtotalAmount,
        discountAmount: invoice.discountAmount,
        taxableAmount: invoice.subtotalAmount,
        cgstRate: 9,
        cgstAmount: invoice.taxAmount / 2,
        sgstRate: 9,
        sgstAmount: invoice.taxAmount / 2,
        igstRate: 0,
        igstAmount: 0,
        totalTaxAmount: invoice.taxAmount,
      };

      const lineItems = [
        {
          desc: 'Driver Service Charge',
          taxable: details.driverCharges,
          gstRate: '18%',
          total: details.driverCharges,
        },
      ];

      if (details.platformCharges > 0) {
        lineItems.push({
          desc: 'Platform Service Charge',
          taxable: details.platformCharges,
          gstRate: '18%',
          total: details.platformCharges,
        });
      }

      if (details.otherCharges > 0) {
        lineItems.push({
          desc: 'Other Booking Charges',
          taxable: details.otherCharges,
          gstRate: '18%',
          total: details.otherCharges,
        });
      }

      doc.font('Helvetica').fontSize(9).fillColor('#334155');

      lineItems.forEach((item) => {
        currentY += 8;
        doc.text(item.desc, 50, currentY);
        doc.text(item.taxable.toFixed(2), 320, currentY, { width: 80, align: 'right' });
        doc.text(item.gstRate, 410, currentY, { width: 50, align: 'right' });
        doc.text(item.total.toFixed(2), 470, currentY, { width: 75, align: 'right' });
        currentY += 14;
        doc
          .strokeColor('#F1F5F9')
          .lineWidth(0.5)
          .moveTo(40, currentY)
          .lineTo(555, currentY)
          .stroke();
      });

      currentY += 15;

      // Summary Breakdown Box
      const summaryStartX = 300;

      // Subtotal
      doc.text('Gross Subtotal:', summaryStartX, currentY);
      doc.text(`INR ${details.grossSubtotal.toFixed(2)}`, 470, currentY, {
        width: 75,
        align: 'right',
      });
      currentY += 14;

      // Discount
      if (details.discountAmount > 0) {
        doc.fillColor('#16A34A').text('Promotion Discount:', summaryStartX, currentY);
        doc.text(`- INR ${details.discountAmount.toFixed(2)}`, 470, currentY, {
          width: 75,
          align: 'right',
        });
        currentY += 14;
        doc.fillColor('#334155');
      }

      // Taxable Amount
      doc.text('Taxable Amount:', summaryStartX, currentY);
      doc.text(`INR ${details.taxableAmount.toFixed(2)}`, 470, currentY, {
        width: 75,
        align: 'right',
      });
      currentY += 14;

      // CGST
      if (details.cgstAmount > 0) {
        doc.text(`CGST (${details.cgstRate}%):`, summaryStartX, currentY);
        doc.text(`INR ${details.cgstAmount.toFixed(2)}`, 470, currentY, {
          width: 75,
          align: 'right',
        });
        currentY += 14;
      }

      // SGST
      if (details.sgstAmount > 0) {
        doc.text(`SGST (${details.sgstRate}%):`, summaryStartX, currentY);
        doc.text(`INR ${details.sgstAmount.toFixed(2)}`, 470, currentY, {
          width: 75,
          align: 'right',
        });
        currentY += 14;
      }

      // IGST
      if (details.igstAmount > 0) {
        doc.text(`IGST (${details.igstRate}%):`, summaryStartX, currentY);
        doc.text(`INR ${details.igstAmount.toFixed(2)}`, 470, currentY, {
          width: 75,
          align: 'right',
        });
        currentY += 14;
      }

      // Final Divider
      doc
        .strokeColor('#CBD5E1')
        .lineWidth(1)
        .moveTo(summaryStartX, currentY)
        .lineTo(555, currentY)
        .stroke();

      currentY += 8;

      // Total Payable
      doc
        .fillColor('#0F172A')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Total Payable:', summaryStartX, currentY);
      doc.text(`INR ${invoice.totalAmount.toFixed(2)}`, 470, currentY, {
        width: 75,
        align: 'right',
      });

      // Bottom Footer
      const footerY = doc.page.height - 60;
      doc
        .strokeColor('#E2E8F0')
        .lineWidth(0.5)
        .moveTo(40, footerY - 10)
        .lineTo(555, footerY - 10)
        .stroke();

      doc
        .fillColor('#94A3B8')
        .fontSize(8)
        .font('Helvetica')
        .text(
          'This is a computer-generated tax invoice and does not require a signature.',
          40,
          footerY,
          {
            align: 'center',
            width: 515,
          },
        );
      doc.text('Thank you for choosing GET APNA DRIVER!', 40, footerY + 12, {
        align: 'center',
        width: 515,
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
