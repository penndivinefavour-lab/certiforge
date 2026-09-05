export declare function generateQRCode(text: string, size?: number): Promise<Uint8Array>;
export declare function generateQRCodeSVG(text: string, size?: number): Promise<string>;
export declare function createVerificationUrl(base: string, certificateId: string): string;
export declare function extractQRData(qrData: string): {
    type: string;
    value: string;
} | null;
//# sourceMappingURL=generator.d.ts.map