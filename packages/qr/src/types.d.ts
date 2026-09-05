// Type declarations for QR code library
declare module 'qrcode' {
  export function toBuffer(text: string, options?: QRCode.QRCodeToBufferOptions): Promise<Buffer>;
  export function toString(text: string, options?: QRCode.QRCodeToStringOptions): Promise<string>;
  
  export interface QRCode {
    toBuffer(text: string, options?: QRCode.QRCodeToBufferOptions): Promise<Buffer>;
    toString(text: string, options?: QRCode.QRCodeToStringOptions): Promise<string>;
  }
  
  export interface QRCodeToBufferOptions {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    type?: 'text' | 'image/png' | 'image/jpeg';
  }
  
  export interface QRCodeToStringOptions {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    type?: 'svg' | 'str';
  }
}
