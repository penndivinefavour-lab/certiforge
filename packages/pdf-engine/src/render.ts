// CertiForge PDF Engine - Server-side certificate rendering
import { PDFDocument, rgb, degrees, StandardFonts, PageSizes, RGB } from 'pdf-lib';
import { generateQRCode } from '@certiforge/qr';
import type { Certificate, TemplateVersion, Recipient } from '@certiforge/types';

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
): Promise<Uint8Array> {
  // Create blank PDF
  const { width = 842, height = 595 } = options; // A4 landscape
  const pdfDoc = await PDFDocument.create();
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

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Render template elements from JSON string
  let elements: any[] = [];
  try {
    const elJson = template.elements;
    if (typeof elJson === 'string') {
      elements = JSON.parse(elJson);
    } else if (Array.isArray(elJson)) {
      elements = elJson;
    }
  } catch {
    // elements is not valid JSON, use empty array
  }

  for (const element of elements) {
    const value = getDynamicValue(element, recipient, cert);

    if (element.type === 'text' && value) {
      const style: any = element.style || {};
      const fontSize = style.fontSize || 12;
      const color = style.color ? hexToRgb(style.color) : rgb(0, 0, 0);
      const isBold = style.fontWeight === 'bold';
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
      const qrUrl = `${process.env.VERIFICATION_URL || 'http://localhost:3000'}/studio/verify/${cert.certificateNumber}`;
      const qrBuffer = await generateQRCode(qrUrl, 100);

      // Embed QR code as PNG
      try {
        const qrPng = await pdfDoc.embedPng(qrBuffer);
        page.drawImage(qrPng, {
          x: element.x,
          y: page.getHeight() - element.y - element.height,
          width: element.width,
          height: element.height
        });
      } catch {
        // QR embedding failed, continue without it
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
}

function getDynamicValue(
  element: any,
  recipient: Recipient,
  cert: Certificate
): string {
  if (!element.dynamic?.field) {
    return element.content || '';
  }

  let metadata: any = {};
  try {
    if (typeof cert.metadata === 'string') {
      metadata = JSON.parse(cert.metadata);
    } else if (typeof cert.metadata === 'object' && cert.metadata !== null) {
      metadata = cert.metadata;
    }
  } catch {
    // metadata is not valid JSON, use empty object
  }

  const fieldMap: Record<string, any> = {
    'recipient_name': recipient.name,
    'email': recipient.email || '',
    'course_name': metadata?.courseName,
    'issue_date': cert.issuedAt?.toISOString()?.split('T')[0],
    'certificate_id': cert.certificateNumber,
    'instructor': metadata?.instructor,
    'organization': metadata?.organization,
    'duration': metadata?.duration,
    'grade': metadata?.grade
  };

  return fieldMap[element.dynamic.field] || element.dynamic.fallback || '';
}

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
}
