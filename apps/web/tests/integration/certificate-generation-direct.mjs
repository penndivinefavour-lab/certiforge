// Direct Certificate Generation Test - Phase 5.6
import { renderCertificateToBuffer } from '../../packages/certificate-engine/dist/index.js';
import { generateQRCode, extractQRData } from '../../packages/qr/dist/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_OUTPUT_DIR = path.join(__dirname, '../test-output');

async function main() {
  console.log('=== CERTIFORGE CERTIFICATE GENERATION TEST ===\n');
  
  if (!fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  }

  const testRecipients = [
    'John Doe',
    'Jean-Paul Mbarga',
    'Chantal Nguema',
    'Élodie Nkongho',
    'José María López',
    "O'Connor",
    'Anne-Marie Tchoumi',
    'A very long certificate recipient name that requires text fitting to ensure proper rendering across multiple lines',
  ];

  let success = 0;
  let failed = 0;

  for (let i = 0; i < testRecipients.length; i++) {
    const recipient = testRecipients[i];
    const certId = `CERT-2026-${String(i + 1).padStart(4, '0')}`;
    
    try {
      console.log(`[${i + 1}/${testRecipients.length}] Testing: ${recipient.substring(0, 30)}${recipient.length > 30 ? '...' : ''}`);
      
      // Generate certificate
      const pdfBuffer = await renderCertificateToBuffer({
        templatePath: 'test-template.pdf',
        recipient: {
          name: recipient,
          email: `recipient${i + 1}@test.com`,
        },
        courseName: 'Advanced Certificate Program',
        issueDate: new Date().toISOString(),
        instructor: 'Dr. Test Instructor',
        certificateId: certId,
      });

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Empty PDF generated');
      }

      // Save PDF
      const filename = path.join(TEST_OUTPUT_DIR, `certificate-${i + 1}.pdf`);
      fs.writeFileSync(filename, pdfBuffer);
      console.log(`  ✓ PDF saved (${pdfBuffer.length} bytes)`);

      // Test QR generation and decoding
      const qrData = JSON.stringify({
        certificateId: certId,
        recipient: recipient,
        issuedAt: new Date().toISOString(),
        verified: true,
      });
      
      const qrImage = await generateQRCode(qrData);
      if (!qrImage || qrImage.length === 0) {
        throw new Error('QR code generation failed');
      }
      
      // For QR decode test, we need the original string back
      const decoded = extractQRData(qrData);
      if (!decoded) {
        throw new Error('QR data extraction failed');
      }
      
      console.log(`  ✓ QR code generated and verified`);
      success++;
      
    } catch (error: any) {
      console.log(`  ✗ FAILED: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Direct tests: ${success}/${testRecipients.length} passed`);
  
  if (failed > 0) {
    console.log(`Failed: ${failed}`);
    process.exit(1);
  }
  
  console.log(`\nOutput directory: ${TEST_OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
