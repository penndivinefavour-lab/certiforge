// CertiForge PDF Engine - Server-side PDF rendering
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { generateQRCodeImage } from './qr';
import type { Certificate, TemplateVersion, Recipient } from '@/types';

export async function renderCertificate(
  template: TemplateVersion,
  recipient: Recipient,
  cert: Certificate
): Promise<Buffer> {
  const pdfBytes = await fetch(template.pdfUrl).then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Replace dynamic fields
  const fields = template.elements || [];
  for (const field of fields) {
    if (field.dynamic?.field) {
      const value = getDynamicValue(field.dynamic.field, recipient, cert);
      if (value) {
        // Find and replace text in PDF (simplified)
        // In production, use proper text extraction and replacement
      }
    }
  }

  // Add QR code
  const qrUrl = `${process.env.VERIFICATION_URL}/verify/${cert.certificateNumber}`;
  const qrBytes = await generateQRCodeImage(qrUrl, 100);
  
  // Create a small PDF with the QR code
  const qrPdfDoc = await PDFDocument.create();
  const qrPage = qrPdfDoc.addPage([200, 200]);
  const qrImage = await qrPdfDoc.embedPng(Buffer.from(await qrBytes.arrayBuffer()));
  qrPage.drawImage(qrImage, { x: 50, y: 50, width: 100, height: 100 });
  const qrPdfBytes = await qrPdfDoc.save();
  
  const qrPdf = await PDFDocument.load(qrPdfBytes);
  const qrPageCount = qrPdf.getPages().length;
  
  const finalPdf = await pdfDoc.copyPages(qrPdf, [0]);
  pdfDoc.addPage(finalPdf[0]);
  
  return Buffer.from(await pdfDoc.save());
}

function getDynamicValue(field: string, recipient: Recipient, cert: Certificate): string {
  const fieldMap: Record<string, any> = {
    'recipient_name': recipient.name,
    'course_name': cert.metadata?.courseName,
    'issue_date': cert.issuedAt?.toISOString()?.split('T')[0],
    'certificate_id': cert.certificateNumber,
    'instructor': cert.metadata?.instructor,
  };
  return fieldMap[field] || '';
}
