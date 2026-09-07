// Phase 5.6 Certificate Generation Integration Test
// Tests real PDF generation, QR code creation/verification
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(process.cwd(), 'test-output');

async function main() {
  console.log('=== CERTIFORGE INTEGRATION TEST ===\n');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  let success = 0;
  let failed = 0;
  
  // Test 1: Package build verification
  console.log('[TEST 1] Checking package builds...');
  try {
    const packages = ['certificate-engine', 'qr', 'pdf-engine', 'validation', 'editor', 'types', 'config'];
    for (const pkg of packages) {
      const distPath = path.join('packages', pkg, 'dist');
      if (fs.existsSync(distPath)) {
        const files = fs.readdirSync(distPath);
        console.log(`  ✓ ${pkg}: ${files.length} compiled artifacts`);
      } else {
        console.log(`  ✗ ${pkg}: NO DIST`);
        failed++;
      }
    }
    success += packages.length;
  } catch (e) {
    console.log(`  ✗ Build check failed: ${e.message}`);
    failed++;
  }
  
  // Test 2: QR Code functionality
  console.log('\n[TEST 2] Testing QR code generation...');
  try {
    const qrTest = require('./packages/qr/dist/index.js');
    const testData = JSON.stringify({ cert: 'CERT-2026-TEST', verified: true });
    const qrBuffer = await qrTest.generateQRCode(testData, 200);
    
    if (qrBuffer && qrBuffer.length > 0) {
      console.log(`  ✓ QR generated: ${qrBuffer.length} bytes`);
      
      // Test decode extraction
      const decoded = qrTest.extractQRData(testData);
      if (decoded && decoded.type === 'verification') {
        console.log(`  ✓ QR data extracted correctly`);
        success += 2;
      } else {
        console.log(`  ✗ QR decode failed`);
        failed++;
      }
    } else {
      console.log(`  ✗ QR generation failed`);
      failed++;
    }
  } catch (e) {
    console.log(`  ✗ QR test failed: ${e.message}`);
    failed++;
  }
  
  // Test 3: Certificate renderer basic functionality
  console.log('\n[TEST 3] Testing certificate renderer...');
  try {
    const certEngine = require('./packages/certificate-engine/dist/index.js');
    
    // Create minimal template version
    const mockTemplate = {
      width: 800,
      height: 600,
      orientation: 'landscape',
      backgroundColor: '#ffffff',
      elements: JSON.stringify([
        { id: 'title', type: 'text', x: 400, y: 250, width: 400, height: 50, content: JSON.stringify({ text: 'Certificate of Achievement', fontSize: 24, fontWeight: 'bold' }) },
        { id: 'recipient', type: 'text', x: 400, y: 350, width: 400, height: 40, content: JSON.stringify({ text: '{{recipient_name}}', fontSize: 18 }) },
      ]),
    };
    
    const pdfBytes = await certEngine.renderCertificateToBuffer(mockTemplate, 'CERT-TEST-001', 'Test Recipient');
    
    if (pdfBytes && pdfBytes.length > 1000) {
      console.log(`  ✓ Certificate rendered: ${pdfBytes.length} bytes`);
      
      // Save test PDF
      const pdfPath = path.join(OUTPUT_DIR, 'test-certificate.pdf');
      fs.writeFileSync(pdfPath, Buffer.from(pdfBytes));
      console.log(`  ✓ Saved to: ${pdfPath}`);
      
      success += 2;
    } else {
      console.log(`  ✗ Certificate render failed`);
      failed++;
    }
  } catch (e) {
    console.log(`  ✗ Certificate test failed: ${e.message}`);
    failed++;
  }
  
  // Test 4: Type checking passes
  console.log('\n[TEST 4] Verifying TypeScript types...');
  try {
    const result = execSync('node "C:/Users/USER/AppData/Roaming/npm/node_modules/pnpm/bin/pnpm.cjs" --filter web typecheck', {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: 60000,
    });
    console.log(`  ✓ Typecheck passed`);
    success++;
  } catch (e) {
    console.log(`  ✗ Typecheck failed: ${e.stdout?.slice(-500) || e.message}`);
    failed++;
  }
  
  // Test 5: Unit tests pass
  console.log('\n[TEST 5] Running unit tests...');
  try {
    const result = execSync('node "C:/Users/USER/AppData/Roaming/npm/node_modules/pnpm/bin/pnpm.cjs" test', {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: 120000,
    });
    // Extract test count
    const match = result.match(/(\d+)\/(\d+) tests? passing/);
    if (match) {
      const [_, passed, total] = match;
      console.log(`  ✓ Tests: ${passed}/${total} passing`);
      success++;
    } else {
      console.log(`  ✓ Tests passed`);
      success++;
    }
  } catch (e) {
    console.log(`  ✗ Tests failed: ${e.stdout?.slice(-500) || e.message}`);
    failed++;
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n⚠ Some integration tests failed');
    process.exit(1);
  } else {
    console.log('\n✓ All integration tests passed');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
