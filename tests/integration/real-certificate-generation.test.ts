// Real Certificate Generation Integration Test
import { describe, it, expect } from 'vitest';
import { renderCertificateToBuffer, generateCertificateId, formatCertificateId, isValidCertificateId, generateVerificationToken, createVerificationPayload } from '@certiforge/certificate-engine';
import { generateQRCode, extractQRData, createVerificationUrl } from '@certiforge/qr';

describe('Real Certificate Generation', () => {
  // Mock template version for testing
  const mockTemplate = {
    id: 'test-template',
    width: 842,
    height: 595,
    orientation: 'landscape' as const,
    backgroundColor: '#ffffff',
    elements: JSON.stringify([
      {
        id: 'title',
        type: 'text',
        x: 421,
        y: 200,
        width: 400,
        height: 50,
        content: JSON.stringify({ text: 'Certificate of Achievement', fontSize: 24, fontWeight: 'bold', color: '#000000', textAlign: 'center' }),
      },
      {
        id: 'recipient',
        type: 'text',
        x: 421,
        y: 300,
        width: 400,
        height: 40,
        content: JSON.stringify({ text: '{{recipient_name}}', fontSize: 18, color: '#333333', textAlign: 'center' }),
      },
      {
        id: 'course',
        type: 'text',
        x: 421,
        y: 350,
        width: 400,
        height: 40,
        content: JSON.stringify({ text: '{{course_name}}', fontSize: 16, color: '#333333', textAlign: 'center' }),
      },
      {
        id: 'date',
        type: 'text',
        x: 421,
        y: 450,
        width: 400,
        height: 40,
        content: JSON.stringify({ text: '{{issue_date}}', fontSize: 14, color: '#666666', textAlign: 'center' }),
      },
    ]),
  };

  it('should generate a valid PDF for a single recipient', async () => {
    const pdfBytes = await renderCertificateToBuffer(
      mockTemplate as any,
      'CF-TEST-0001-AAAA',
      'John Doe',
      { course_name: 'Advanced JavaScript', issue_date: '2024-01-15' }
    );

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(1000);
    
    // Verify PDF magic bytes
    expect(pdfBytes[0]).toBe(0x25); // %
    expect(pdfBytes[1]).toBe(0x50); // P
    expect(pdfBytes[2]).toBe(0x44); // D
    expect(pdfBytes[3]).toBe(0x46); // F
  });

  it('should handle long recipient names', async () => {
    const longName = 'A Very Long Recipient Name That Exceeds Typical Certificate Field Widths And Should Trigger Text Fitting Algorithms To Prevent Overflow';
    const pdfBytes = await renderCertificateToBuffer(
      mockTemplate as any,
      'CF-TEST-0002-BBBB',
      longName,
      {}
    );

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it('should handle Unicode and accented characters', async () => {
    const unicodeNames = [
      'José María López',
      'François Müller',
      'Nguyễn Văn Anh',
      'Александр Петров',
    ];

    for (const name of unicodeNames) {
      const pdfBytes = await renderCertificateToBuffer(
        mockTemplate as any,
        `CF-TEST-UNICODE-${Date.now()}`,
        name,
        {}
      );
      expect(pdfBytes).toBeDefined();
      expect(pdfBytes.length).toBeGreaterThan(1000);
    }
  });

  it('should handle empty optional fields gracefully', async () => {
    const pdfBytes = await renderCertificateToBuffer(
      mockTemplate as any,
      'CF-TEST-0003-CCCC',
      'Test Recipient',
      {} // No optional fields
    );

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it('should generate unique certificate IDs', async () => {
    const ids = new Set<string>();
    const count = 100;

    for (let i = 0; i < count; i++) {
      const id = generateCertificateId();
      ids.add(id);
      expect(id).toMatch(/^CF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }

    expect(ids.size).toBe(count);
  });

  it('should validate certificate ID format', async () => {
    const validIds = [
      'CF-7XK4-92PM-Q8L2',
      'CF-ABCD-1234-EFGH',
      'CF-ZZZZ-9999-XXXX',
    ];

    const invalidIds = [
      'CF-7XK4-92PM-Q8L',  // Too short
      'CF-7XK492PM-Q8L2',  // Missing hyphen
      'cf-7XK4-92PM-Q8L2', // Lowercase
    ];

    for (const id of validIds) {
      expect(isValidCertificateId(id)).toBe(true);
    }

    for (const id of invalidIds) {
      expect(isValidCertificateId(id)).toBe(false);
    }
  });
});

describe('QR Code Generation and Verification', () => {
  it('should generate a valid QR code', async () => {
    const testData = JSON.stringify({
      certificateId: 'CF-7XK4-92PM-Q8L2',
      recipient: 'John Doe',
      issuedAt: new Date().toISOString(),
    });

    const qrBuffer = await generateQRCode(testData, 200);
    expect(qrBuffer).toBeDefined();
    expect(qrBuffer.length).toBeGreaterThan(0);
  });

  it('should generate QR codes for different data sizes', async () => {
    const sizes = [100, 200, 400];
    const testData = 'Certificate verification data';

    for (const size of sizes) {
      const qrBuffer = await generateQRCode(testData, size);
      expect(qrBuffer).toBeDefined();
      expect(qrBuffer.length).toBeGreaterThan(0);
    }
  });

  it('should handle extraction of JSON QR data', async () => {
    const originalData = JSON.stringify({
      type: 'verification',
      value: 'https://certiforge.app/verify/CF-7XK4-92PM-Q8L2',
    });

    const extracted = extractQRData(originalData);
    expect(extracted).not.toBeNull();
    expect(extracted!.type).toBe('verification');
    expect(extracted!.value).toContain('verify');
  });

  it('should handle plain URL extraction', async () => {
    const url = 'https://certiforge.app/verify/SOME-CERT-ID';
    const extracted = extractQRData(url);
    expect(extracted).not.toBeNull();
    expect(extracted!.type).toBe('url');
    expect(extracted!.value).toBe(url);
  });

  it('should create correct verification URLs', async () => {
    const url = createVerificationUrl('https://certiforge.app', 'CF-TEST-1234');
    expect(url).toBe('https://certiforge.app/verify/CF-TEST-1234');
  });

  it('should handle verification URL with trailing slash', async () => {
    const url = createVerificationUrl('https://certiforge.app/', 'CF-TEST-5678');
    expect(url).toBe('https://certiforge.app/verify/CF-TEST-5678');
  });
});

describe('Edge Cases', () => {
  it('should handle special characters in names', async () => {
    const specialNames = [
      "O'Brien",
      'Van Der Berg',
      'Smith-Jones',
      'Müller-Schmidt',
    ];

    for (const name of specialNames) {
      const pdfBytes = await renderCertificateToBuffer(
        {
          width: 842,
          height: 595,
          backgroundColor: '#ffffff',
          elements: JSON.stringify([{
            id: 'name',
            type: 'text',
            x: 100,
            y: 100,
            width: 200,
            height: 50,
            content: JSON.stringify({ text: '{{recipient_name}}', fontSize: 18 }),
          }]),
        } as any,
        `CF-SPECIAL-${Date.now()}`,
        name,
        {}
      );
      expect(pdfBytes.length).toBeGreaterThan(100);
    }
  });

  it('should handle minimal template', async () => {
    const minimalTemplate = {
      width: 842,
      height: 595,
      backgroundColor: '#ffffff',
      elements: JSON.stringify([
        {
          id: 'single',
          type: 'text',
          x: 100,
          y: 100,
          width: 200,
          height: 50,
          content: JSON.stringify({ text: '{{recipient_name}}', fontSize: 18 }),
        },
      ]),
    };

    const pdfBytes = await renderCertificateToBuffer(
      minimalTemplate as any,
      'CF-MINIMAL',
      'Test',
      {}
    );

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(100);
  });

  it('should handle missing optional metadata', async () => {
    const template = {
      width: 842,
      height: 595,
      backgroundColor: '#ffffff',
      elements: JSON.stringify([]),
    };

    const pdfBytes = await renderCertificateToBuffer(
      template as any,
      'CF-NOMETADATA',
      'No Metadata',
      {}
    );

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(100);
  });

  it('should generate verification tokens of correct length', () => {
    const token = generateVerificationToken();
    expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should create verification payloads', () => {
    const payload = createVerificationPayload(
      'CF-TEST-1234-ABCD',
      'John Doe',
      new Date('2024-01-15'),
      'verification-token-here'
    );

    const parsed = JSON.parse(payload);
    expect(parsed.id).toBe('CF-TEST-1234-ABCD');
    expect(parsed.name).toBe('John Doe');
    expect(parsed.verified).toBe(true);
    expect(parsed.platform).toBe('certiforge');
  });
});
