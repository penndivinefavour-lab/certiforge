// PDF Rendering Engine - deterministic server-side certificate rendering
import { PDFDocument, rgb, StandardFonts, PDFFont } from "pdf-lib";
import { generateQRCode } from "@certiforge/qr";
import type { TemplateVersion, TemplateElement, Certificate, Recipient } from "@certiforge/types";
import type { ElementData } from "./types";

// ============================================================================
// PDF RENDERER
// ============================================================================

export interface RenderOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  orientation: "PORTRAIT" | "LANDSCAPE";
}

export interface RenderedCertificate {
  pdfBytes: Uint8Array;
  qrDataUrl?: string;
  certificateNumber: string;
  recipientName: string;
}

const FONT_SIZE_DEFAULT = 12;
const FONT_SIZE_MIN = 6;
const QR_SIZE = 100;

// Helper to get embedded font
async function getFont(doc: PDFDocument, weight: string = "NORMAL"): Promise<PDFFont> {
  const upper = weight.toUpperCase();
  if (upper === "BOLD" || upper === "700" || upper === "SEMIBOLD") {
    return doc.embedFont(StandardFonts.HelveticaBold);
  }
  if (upper === "ITALIC" || upper === "OBLIQUE") {
    return doc.embedFont(StandardFonts.HelveticaOblique);
  }
  if (upper === "BOLDITALIC" || upper === "BOLD OBLIQUE") {
    return doc.embedFont(StandardFonts.HelveticaBoldOblique);
  }
  return doc.embedFont(StandardFonts.Helvetica);
}

// Convert hex color to pdf-lib rgb
function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

// Smart text fitting
async function fitText(
  doc: PDFDocument,
  text: string,
  maxWidth: number,
  initialSize: number,
  font: PDFFont,
  minSize: number = FONT_SIZE_MIN
): Promise<number> {
  let size = initialSize;
  const width = font.widthOfTextAtSize(text, size);

  while (width > maxWidth && size > minSize) {
    size -= 0.5;
    if (size < minSize) size = minSize;
    const newWidth = font.widthOfTextAtSize(text, size);
    if (newWidth <= maxWidth) break;
  }

  return size;
}

// Render a text element to PDF
async function renderTextElement(
  page: any,
  element: TemplateElement,
  data: ElementData,
  doc: PDFDocument
) {
  const textData = data as ElementData & {
    text: string;
    fontSize: number;
    fontWeight: string;
    color: string;
    textAlign: "left" | "center" | "right";
    lineHeight: number;
    letterSpacing: number;
    dynamicField?: string;
    minFontSize?: number;
  };

  if (!textData.text && !textData.dynamicField) return;

  // Resolve dynamic field value
  let renderText = textData.text || "";
  if (textData.dynamicField) {
    renderText = textData.dynamicField;
  }

  const fontSize = textData.fontSize || FONT_SIZE_DEFAULT;
  const font = await getFont(doc, textData.fontWeight);
  const color = hexToRgb(textData.color || "#000000");
  const opacity = (textData.opacity ?? 1) as number;

  // Handle smart text fitting
  const maxTextWidth = element.width * 0.9;
  let finalFontSize = fontSize;
  if (element.width > 0 && maxTextWidth > 0) {
    const fitMinSize = textData.minFontSize ?? FONT_SIZE_MIN;
    finalFontSize = await fitText(doc, renderText, maxTextWidth, finalFontSize, font, fitMinSize);
  }

  const lineHeight = (textData.lineHeight || 1.2) * finalFontSize;
  const letterSpacing = textData.letterSpacing || 0;

  // Calculate x position based on alignment
  let x = element.x;
  if (textData.textAlign === "center") {
    const avgCharWidth = (font.widthOfTextAtSize("a", finalFontSize) + font.widthOfTextAtSize("W", finalFontSize)) / 2;
    const textWidth = avgCharWidth * renderText.length;
    x = element.x + (element.width - textWidth) / 2;
  } else if (textData.textAlign === "right") {
    const avgCharWidth = (font.widthOfTextAtSize("a", finalFontSize) + font.widthOfTextAtSize("W", finalFontSize)) / 2;
    const textWidth = avgCharWidth * renderText.length;
    x = element.x + element.width - textWidth;
  }

  // Draw text
  page.setFontSize(finalFontSize * opacity);
  page.setFontColor(color);
  page.setFont(font);

  if (letterSpacing !== 0) {
    const chars = renderText.split("");
    let currentX = x;
    const charWidth = font.widthOfTextAtSize("a", finalFontSize) + letterSpacing;

    for (const char of chars) {
      page.drawText(char, {
        x: currentX,
        y: element.y + element.height - lineHeight + (finalFontSize * 0.15),
      });
      currentX += charWidth;
    }
  } else {
    page.drawText(renderText, {
      x,
      y: element.y + element.height - lineHeight + (finalFontSize * 0.15),
    });
  }
}

// Render an image element to PDF
async function renderImageElement(page: any, element: TemplateElement, data: ElementData) {
  const imageData = data as ElementData & {
    type: "IMAGE";
    src: string;
    fit: "contain" | "cover" | "fill" | "none";
  };

  if (!imageData.src) return;

  if (imageData.src.startsWith("data:image")) {
    const matches = imageData.src.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      const base64 = matches[2];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      try {
        const pdfDoc = await PDFDocument.create();
        const image = await pdfDoc.embedPng(bytes);
        const imgWidth = image.width;
        const imgHeight = image.height;

        let drawWidth = element.width;
        let drawHeight = element.height;
        let drawX = element.x;
        let drawY = element.y;

        if (imageData.fit === "contain") {
          const scale = Math.min(element.width / imgWidth, element.height / imgHeight);
          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;
          drawX = element.x + (element.width - drawWidth) / 2;
          drawY = element.y + (element.height - drawHeight) / 2;
        } else if (imageData.fit === "cover") {
          const scale = Math.max(element.width / imgWidth, element.height / imgHeight);
          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;
          drawX = element.x + (element.width - drawWidth) / 2;
          drawY = element.y + (element.height - drawHeight) / 2;
        }

        page.drawImage(image, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
          opacity: imageData.opacity ?? 1,
        });
      } catch (e) {
        console.error("Failed to embed image:", e);
      }
    }
  }
}

// Render a shape element
async function renderShapeElement(page: any, element: TemplateElement, data: ElementData) {
  const shapeData = data as ElementData & {
    type: "SHAPE";
    shapeType: "rectangle" | "circle";
    fillColor: string;
    fillOpacity: number;
    strokeColor: string;
    strokeWidth: number;
  };

  const fillColor = hexToRgb(shapeData.fillColor || "#cccccc");
  const strokeColor = hexToRgb(shapeData.strokeColor || "transparent");
  const strokeWidth = shapeData.strokeWidth || 0;

  if (shapeData.shapeType === "rectangle") {
    if (shapeData.fillColor && shapeData.fillColor !== "transparent") {
      page.drawRectangle({
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        color: fillColor,
        opacity: shapeData.fillOpacity ?? 1,
      });
    }
    if (strokeWidth > 0 && shapeData.strokeColor && shapeData.strokeColor !== "transparent") {
      page.drawRectangle({
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        borderColor: strokeColor,
        borderWidth: strokeWidth,
      });
    }
  } else if (shapeData.shapeType === "circle") {
    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;
    const radius = Math.min(element.width, element.height) / 2;

    if (shapeData.fillColor && shapeData.fillColor !== "transparent") {
      page.drawEllipse({
        x: centerX - radius,
        y: centerY - radius,
        width: radius * 2,
        height: radius * 2,
        color: fillColor,
        opacity: shapeData.fillOpacity ?? 1,
      });
    }
  }
}

// Render a line element
async function renderLineElement(page: any, element: TemplateElement, data: ElementData) {
  const lineData = data as ElementData & {
    type: "LINE";
    strokeColor: string;
    strokeWidth: number;
  };

  const color = hexToRgb(lineData.strokeColor || "#000000");

  page.drawLine({
    start: { x: element.x, y: element.y + element.height / 2 },
    end: { x: element.x + element.width, y: element.y + element.height / 2 },
    thickness: lineData.strokeWidth || 1,
    color,
  });
}

// Render a QR code element
async function renderQRElement(
  page: any,
  element: TemplateElement,
  data: ElementData,
  qrDataUrl: string | undefined
) {
  const size = (data as ElementData & { size: number }).size || QR_SIZE;

  // Draw QR placeholder
  page.drawRectangle({
    x: element.x,
    y: element.y,
    width: size,
    height: size,
    color: hexToRgb((data as ElementData & { backgroundColor: string }).backgroundColor || "#ffffff"),
    borderColor: hexToRgb((data as ElementData & { foregroundColor: string }).foregroundColor || "#000000"),
    borderWidth: 1,
  });

  // Draw QR code from data URL if available
  if (qrDataUrl) {
    try {
      const matches = qrDataUrl.match(/^data:image\/png;base64,(.+)$/);
      if (matches) {
        const bytes = Uint8Array.from(atob(matches[1]), c => c.charCodeAt(0));
        const pdfDoc = await PDFDocument.create();
        const image = await pdfDoc.embedPng(bytes);
        page.drawImage(image, {
          x: element.x,
          y: element.y,
          width: size,
          height: size,
        });
      }
    } catch (e) {
      console.error("Failed to draw QR:", e);
    }
  }
}

// Render a single certificate to PDF
export async function renderCertificate(
  templateVersion: TemplateVersion,
  certificate: Certificate,
  recipient: Recipient,
  dynamicValues: Record<string, string>
): Promise<RenderedCertificate> {
  // Create PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([templateVersion.width, templateVersion.height]);

  // Set background
  if (templateVersion.backgroundColor) {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: templateVersion.width,
      height: templateVersion.height,
      color: hexToRgb(templateVersion.backgroundColor),
    });
  }

  // Parse elements
  const elements: TemplateElement[] = JSON.parse(templateVersion.elements);
  elements.sort((a, b) => a.zIndex - b.zIndex);

  // Dynamic values for rendering
  const renderValues: Record<string, string> = {
    recipient_name: recipient.name,
    course_name: dynamicValues.course_name || "",
    issue_date: dynamicValues.issue_date || new Date().toLocaleDateString(),
    certificate_id: certificate.certificateNumber,
    instructor: dynamicValues.instructor || "",
    organization: dynamicValues.organization || "",
    duration: dynamicValues.duration || "",
    grade: dynamicValues.grade || "",
    email: recipient.email || "",
    ...dynamicValues,
  };

  // Render each element
  for (const element of elements) {
    const data: ElementData = element.content ? JSON.parse(element.content) : {};

    try {
      switch ((element.type || '').toUpperCase()) {
        case "TEXT":
          await renderTextElement(page, element, data, pdfDoc);
          break;
        case "IMAGE":
          await renderImageElement(page, element, data);
          break;
        case "SHAPE":
          await renderShapeElement(page, element, data);
          break;
        case "LINE":
          await renderLineElement(page, element, data);
          break;
        case "QR_CODE":
          await renderQRElement(page, element, data, undefined);
          break;
        case "SIGNATURE":
        case "SEAL":
          break;
      }
    } catch (e) {
      console.error(`Failed to render element ${element.id}:`, e);
    }
  }

  // Generate QR code for the certificate
  let qrDataUrl: string | undefined;
  if (templateVersion.orientation === "landscape") {
    try {
      const verifyUrl = `${process.env.VERIFICATION_BASE_URL || "http://localhost:3000"}/verify/${certificate.certificateNumber}`;
      const qrBuffer = await generateQRCode(verifyUrl, 256);
      const bytes = new Uint8Array(qrBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      qrDataUrl = `data:image/png;base64,${btoa(binary)}`;
    } catch (e) {
      console.error("Failed to generate QR:", e);
    }
  }

  // Serialize PDF
  const pdfBytes = await pdfDoc.save();

  return {
    pdfBytes,
    qrDataUrl,
    certificateNumber: certificate.certificateNumber,
    recipientName: recipient.name,
  };
}

// Bulk rendering for performance
export async function renderCertificateToBuffer(
  templateVersion: TemplateVersion,
  certificateNumber: string,
  recipientName: string,
  dynamicValues: Record<string, string> = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([templateVersion.width, templateVersion.height]);

  if (templateVersion.backgroundColor) {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: templateVersion.width,
      height: templateVersion.height,
      color: hexToRgb(templateVersion.backgroundColor),
    });
  }

  const elements: TemplateElement[] = JSON.parse(templateVersion.elements);
  elements.sort((a, b) => a.zIndex - b.zIndex);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const element of elements) {
    const data: ElementData = element.content ? JSON.parse(element.content) : {};
    try {
      if (element.type === "text" && data.text) {
        page.setFontSize(data.fontSize || 12);
        page.setFont(font);
        page.setFontColor(hexToRgb(data.color || "#000000"));
        page.drawText(data.text, {
          x: element.x,
          y: page.getHeight() - element.y - (data.fontSize || 12),
        });
      }
    } catch (e) {
      console.error(`Failed to render element ${element.id}:`, e);
    }
  }

  return await pdfDoc.save();
}
