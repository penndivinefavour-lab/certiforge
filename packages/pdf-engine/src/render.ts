// CertiForge PDF Engine - Server-side certificate rendering
import { PDFDocument, rgb, degrees, StandardFonts, PageSizes } from 'pdf-lib';
import { generateQRCode } from '@/qr';
import type { Certificate, TemplateVersion, Recipient } from '@/types';

export interface RenderOptions {
  landscape?: boolean;
  width?: number;
  height?: number;
  margin?: number;
}

export async function renderCertificate(
  template: TemplateVersion,
  recipient: Recipient,
  cert: Certificate,
  options: RenderOptions = {}
): Promise<Buffer> {
  // Load template PDF or create new one
  let pdfDoc: PDFDocument;
  
  if (template.pdfUrl) {
    const pdfBytes = await fetch(template.pdfUrl).then(r => r.arrayBuffer());
    pdfDoc = await PDFDocument.load(pdfBytes);
  } else {
    // Create blank PDF
    const { width = 842, height = 595 } = options; // A4 landscape
    pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([width, height]);
    
    // Draw border
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 2
    });
  }
  
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Render template elements
  for (const element of template.elements || []) {
    const value = getDynamicValue(element, recipient, cert);
    
    if (element.type === 'text' && value) {
      const fontSize = element.style?.fontSize || 12;
      const color = element.style?.color ? hexToRgb(element.style.color) : rgb(0, 0, 0);
      const isBold = element.style?.fontWeight === 'bold';
      const textFont = isBold ? boldFont : font;
      
      // Draw text
      page.drawText(value, {
        x: element.x,
        y: page.getHeight() - element.y - fontSize,
        size: fontSize,
        font: textFont,
        color: color
      });
    } else if (element.type === 'qr_code') {
      const qrUrl = `${process.env.VERIFICATION_URL}/verify/${cert.certificateNumber}`;
      const qrBytes = await generateQRCode(qrUrl, 100);
      
      // In production, embed the QR code image
      // For now, skip embedding
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function getDynamicValue(
  element: any,
  recipient: Recipient,
  cert: Certificate
): string {
  if (!element.dynamic?.field) {
    return element.content || '';
  }
  
  const fieldMap: Record<string, any> = {
    'recipient_name': recipient.name,
    'email': recipient.email,
    'course_name': cert.metadata?.courseName,
    'issue_date': cert.issuedAt?.toISOString()?.split('T')[0],
    'certificate_id': cert.certificateNumber,
    'instructor': cert.metadata?.instructor,
    'organization': cert.metadata?.organization,
    'duration': cert.metadata?.duration,
    'grade': cert.metadata?.grade
  };
  
  return fieldMap[element.dynamic.field] || element.dynamic.fallback || '';
}

function hexToRgb(hex: string): rgb {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
}
