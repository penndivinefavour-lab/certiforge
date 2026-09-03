// CertiForge QR Code Generator
import QRCode from 'qrcode';

export async function generateQRCodeImage(
  text: string,
  size: number = 100
): Promise<Buffer> {
  const buffer = await QRCode.toBuffer(text, {
    width: size,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  return buffer;
}

export async function generateQRCode(text: string): Promise<string> {
  return QRCode.toString(text, { type: 'terminal' });
}
