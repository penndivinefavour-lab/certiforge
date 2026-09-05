// CertiForge QR Code Generator
import QRCode from 'qrcode';

export async function generateQRCode(text: string, size: number = 200): Promise<Uint8Array> {
  const buffer = await QRCode.toBuffer(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M'
  });
  return buffer as unknown as Uint8Array;
}

export async function generateQRCodeSVG(text: string, size: number = 200): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    width: size
  });
}

export function createVerificationUrl(base: string, certificateId: string): string {
  return `${base.replace(/\/$/, '')}/verify/${certificateId}`;
}

export function extractQRData(qrData: string): { type: string; value: string } | null {
  try {
    const parsed = JSON.parse(qrData);
    if (parsed.type && parsed.value) {
      return parsed;
    }
  } catch {
    // Not JSON, treat as plain URL
    return { type: 'url', value: qrData };
  }
  return null;
}
