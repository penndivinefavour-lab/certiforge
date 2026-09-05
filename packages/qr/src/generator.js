// CertiForge QR Code Generator
import QRCode from 'qrcode';
export async function generateQRCode(text, size = 200) {
    const buffer = await QRCode.toBuffer(text, {
        width: size,
        margin: 1,
        errorCorrectionLevel: 'M'
    });
    return buffer;
}
export async function generateQRCodeSVG(text, size = 200) {
    return QRCode.toString(text, {
        type: 'svg',
        width: size
    });
}
export function createVerificationUrl(base, certificateId) {
    return `${base.replace(/\/$/, '')}/verify/${certificateId}`;
}
export function extractQRData(qrData) {
    try {
        const parsed = JSON.parse(qrData);
        if (parsed.type && parsed.value) {
            return parsed;
        }
    }
    catch {
        // Not JSON, treat as plain URL
        return { type: 'url', value: qrData };
    }
    return null;
}
//# sourceMappingURL=generator.js.map