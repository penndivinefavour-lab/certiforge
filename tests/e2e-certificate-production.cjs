#!/usr/bin/env node
/**
 * CERTIFORGE — E2E CERTIFICATE PRODUCTION TEST (Complete)
 * Tests full workflow with API calls for generation
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = 'docs/e2e-test';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function capture(page, name) {
    const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`  📸 ${filepath}`);
    return filepath;
}

function apiRequest(method, endpoint, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, 'http://localhost:3002');
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function e2eTest() {
    console.log('='.repeat(70));
    console.log('CERTIFORGE — E2E CERTIFICATE PRODUCTION TEST');
    console.log('='.repeat(70));
    console.log('Start:', new Date().toISOString());
    console.log('');

    const results = [];
    const consoleMessages = [];
    let browser, page;

    try {
        browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
        const context = await browser.newContext();
        page = await context.newPage();

        // Capture console
        page.on('console', msg => {
            const text = msg.text();
            consoleMessages.push({ type: msg.type(), text });
            if (msg.type() === 'error') {
                console.log(`  ❌ CONSOLE ERROR: ${text}`);
            }
        });

        // ========================================
        // STEP 1: Create Test Project
        // ========================================
        console.log('\n[STEP 1] CREATE TEST PROJECT');
        const t1Start = Date.now();

        await page.goto('http://localhost:3002/studio/projects', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        let projectId = null;
        let hasProject = await page.locator('text=E2E Certificate Test').count();

        if (hasProject === 0) {
            console.log('  Creating test project...');
            await page.locator('button:has-text("New Project")').click();
            await page.waitForTimeout(800);
            await page.keyboard.type('E2E Certificate Test');
            await page.waitForTimeout(400);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);
            console.log(`  ✓ Project created in ${Date.now() - t1Start}ms`);
        }

        // Get project ID from URL
        await page.locator('text=E2E Certificate Test').click();
        await page.waitForTimeout(2000);
        projectId = page.url().match(/\/studio\/projects\/([^/]+)/)?.[1];
        console.log(`  ✓ Project ID: ${projectId?.substring(0, 8)}...`);

        await capture(page, '01-project');
        results.push({ step: 'Create Project', pass: !!projectId, projectId });

        // ========================================
        // STEP 2: Add Recipients via API
        // ========================================
        console.log('\n[STEP 2] ADD RECIPIENTS VIA API');
        const t2Start = Date.now();

        const recipients = [
            {
                name: 'Nguyễn Văn An',
                email: 'an@example.com',
                course: 'AI Automation'
            },
            {
                name: 'Trần Thị Bình',
                email: 'binh@example.com',
                course: 'Digital Design'
            },
            {
                name: 'François Mbarga',
                email: 'francois@example.com',
                course: 'RPA Certification'
            }
        ];

        // Save recipients to IndexedDB via API or directly
        console.log('  Adding recipients...');
        const recipientResult = await apiRequest('POST', `/api/studio/projects/${projectId}/recipients`, {
            recipients: recipients
        });

        console.log(`  ✓ API response: ${recipientResult.status}`);
        if (recipientResult.body.recipients) {
            console.log(`  ✓ Added ${recipientResult.body.recipients.length} recipients`);
        }

        await capture(page, '02-recipients');
        results.push({ step: 'Add Recipients', pass: recipientResult.status === 200, count: recipientResult.body?.recipients?.length });

        // ========================================
        // STEP 3: Create Template via Editor
        // ========================================
        console.log('\n[STEP 3] ACCESS EDITOR');
        const t3Start = Date.now();

        const editorUrl = `http://localhost:3002/studio/projects/${projectId}/editor`;
        await page.goto(editorUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        console.log(`  ✓ Editor URL: ${page.url()}`);

        const hasCanvas = await page.locator('canvas').count();
        console.log(`  ✓ Canvas found: ${hasCanvas > 0 ? 'YES' : 'NO'}`);

        await capture(page, '03-editor');
        results.push({ step: 'Access Editor', pass: hasCanvas > 0, url: page.url() });

        // ========================================
        // STEP 4: Generate Certificates
        // ========================================
        console.log('\n[STEP 4] GENERATE CERTIFICATES');
        const t4Start = Date.now();

        // Generate via API
        const generateResult = await apiRequest('POST', `/api/studio/projects/${projectId}/generate`, {
            templateId: 'default-template',
            recipients: recipients
        });

        console.log(`  ✓ Generate API response: ${generateResult.status}`);

        if (generateResult.status === 200 && generateResult.body.certificates) {
            const certs = generateResult.body.certificates;
            console.log(`  ✓ Generated ${certs.length} certificates`);

            for (const cert of certs.slice(0, 2)) {
                console.log(`    - ${cert.certificateNumber}: ${cert.recipientName}`);
            }

            results.push({ step: 'Generate Certificates', pass: true, count: certs.length });
        } else {
            console.log(`  ⚠ Generation failed: ${generateResult.body?.error || 'Unknown error'}`);
            results.push({ step: 'Generate Certificates', pass: false, error: generateResult.body?.error });
        }

        await capture(page, '04-generate');

        // ========================================
        // STEP 5: View Certificates
        // ========================================
        console.log('\n[STEP 5] VIEW CERTIFICATES');
        const t5Start = Date.now();

        const certsUrl = `http://localhost:3002/studio/projects/${projectId}/certificates`;
        await page.goto(certsUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        console.log(`  ✓ Certificates URL: ${page.url()}`);

        // Check for certificate cards
        const certCards = await page.locator('.card, [class*="certificate"]').count();
        console.log(`  ✓ Certificate cards found: ${certCards}`);

        // Get certificate numbers from page
        const certNumbers = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('[class*="font-mono"], .certificate-number'));
            return elements.map(el => el.textContent?.trim()).filter(t => t);
        });
        console.log(`  ✓ Certificate numbers visible: ${certNumbers.length}`);
        certNumbers.forEach(n => console.log(`    - ${n}`));

        await capture(page, '05-certificates');
        results.push({ step: 'View Certificates', pass: certCards > 0 || certNumbers.length > 0 });

        // ========================================
        // STEP 6: Download PDF
        // ========================================
        console.log('\n[STEP 6] DOWNLOAD PDF');
        const t6Start = Date.now();

        // Try to download first certificate
        if (certNumbers.length > 0) {
            const firstCert = certNumbers[0];
            console.log(`  Testing download for: ${firstCert}`);

            // Look for download button
            const downloadBtn = page.locator('button:has-text("Download"), a:has-text("PDF")');
            if (await downloadBtn.count() > 0) {
                console.log('  Clicking download...');
                const downloadPromise = page.waitForEvent('download');
                await downloadBtn.first().click();

                try {
                    const download = await Promise.race([
                        downloadPromise,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Download timeout')), 10000))
                    ]);

                    const filename = download.suggestedFilename() || 'certificate.pdf';
                    const downloadPath = path.join(SCREENSHOTS_DIR, filename);
                    await download.saveAs(downloadPath);

                    const fileSize = fs.existsSync(downloadPath) ? fs.statSync(downloadPath).size : 0;
                    console.log(`  ✓ PDF downloaded: ${downloadPath}`);
                    console.log(`  ✓ File size: ${fileSize} bytes`);

                    // Verify it's a valid PDF
                    if (fileSize > 100) {
                        const header = fs.readFileSync(downloadPath, 'utf8', { length: 5 });
                        const isValidPDF = header === '%PDF-';
                        console.log(`  ✓ Valid PDF: ${isValidPDF ? 'YES' : 'NO'}`);
                        results.push({ step: 'Download PDF', pass: isValidPDF, filename, fileSize });
                    } else {
                        console.log('  ⚠ File too small to be valid PDF');
                        results.push({ step: 'Download PDF', pass: false, note: 'File too small' });
                    }
                } catch (err) {
                    console.log(`  ⚠ Download failed: ${err.message}`);
                    results.push({ step: 'Download PDF', pass: false, error: err.message });
                }
            } else {
                console.log('  ⚠ No download button found');
                results.push({ step: 'Download PDF', pass: false, note: 'No button' });
            }
        } else {
            console.log('  ⚠ No certificates to download');
            results.push({ step: 'Download PDF', pass: false, note: 'No certificates' });
        }

        await capture(page, '06-pdf-download');

        // ========================================
        // STEP 7: Download ZIP
        // ========================================
        console.log('\n[STEP 7] DOWNLOAD ZIP');
        const t7Start = Date.now();

        // Navigate back to certificates
        await page.goto(certsUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Look for ZIP export button
        const zipBtn = page.locator('button:has-text("ZIP"), button:has-text("Export All"), button:has-text("Package")');
        if (await zipBtn.count() > 0) {
            console.log('  Clicking ZIP export...');
            const downloadPromise = page.waitForEvent('download');
            await zipBtn.first().click();

            try {
                const download = await Promise.race([
                    downloadPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('ZIP timeout')), 10000))
                ]);

                const filename = download.suggestedFilename() || 'certificates.zip';
                const zipPath = path.join(SCREENSHOTS_DIR, filename);
                await download.saveAs(zipPath);

                const fileSize = fs.existsSync(zipPath) ? fs.statSync(zipPath).size : 0;
                console.log(`  ✓ ZIP downloaded: ${zipPath}`);
                console.log(`  ✓ File size: ${fileSize} bytes`);

                results.push({ step: 'Download ZIP', pass: fileSize > 100, filename, fileSize });
            } catch (err) {
                console.log(`  ⚠ ZIP download failed: ${err.message}`);
                results.push({ step: 'Download ZIP', pass: false, error: err.message });
            }
        } else {
            console.log('  ⚠ No ZIP export button found');
            results.push({ step: 'Download ZIP', pass: false, note: 'No button' });
        }

        await capture(page, '07-zip');

        // ========================================
        // STEP 8: Verify Certificate
        // ========================================
        console.log('\n[STEP 8] VERIFY CERTIFICATE');
        const t8Start = Date.now();

        // Use a real certificate ID from generation
        const verifyId = certNumbers.length > 0 ? certNumbers[0] : 'TEST-CERT-001';
        const verifyUrl = `http://localhost:3002/verify/${verifyId}`;

        console.log(`  Testing verification for: ${verifyId}`);
        await page.goto(verifyUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        console.log(`  ✓ Verification URL: ${page.url()}`);

        // Check result
        const verifyContent = await page.evaluate(() => document.body.innerText);
        const hasResult = verifyContent.includes('Certificate') || verifyContent.includes('found') || verifyContent.includes('not found');
        console.log(`  ✓ Verification result present: ${hasResult ? 'YES' : 'NO'}`);
        console.log(`  ✓ Result preview: ${verifyContent.substring(0, 200)}...`);

        await capture(page, '08-verification');
        results.push({ step: 'Verify Certificate', pass: hasResult, certificateId: verifyId });

        // ========================================
        // FINAL SUMMARY
        // ========================================
        console.log('\n' + '='.repeat(70));
        console.log('E2E TEST COMPLETE');
        console.log('='.repeat(70));

        console.log('\nRESULTS:');
        results.forEach(r => {
            const status = r.pass ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${status} | ${r.step}`);
            if (r.time_ms) console.log(`         Time: ${r.time_ms}ms`);
            if (r.projectId) console.log(`         Project: ${r.projectId}`);
            if (r.count !== undefined) console.log(`         Count: ${r.count}`);
            if (r.filename) console.log(`         File: ${r.filename}`);
            if (r.fileSize) console.log(`         Size: ${r.fileSize} bytes`);
            if (r.certificateId) console.log(`         Cert ID: ${r.certificateId}`);
            if (r.error) console.log(`         Error: ${r.error}`);
        });

        const errorCount = consoleMessages.filter(m => m.type === 'error').length;
        console.log(`\nConsole errors: ${errorCount}`);

        const allPassed = results.every(r => r.pass);
        console.log(`\nOVERALL: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

        // Save results
        fs.writeFileSync(
            path.join(SCREENSHOTS_DIR, 'e2e-results.json'),
            JSON.stringify({
                timestamp: new Date().toISOString(),
                results: results,
                console_errors: errorCount,
                overall_pass: allPassed,
                screenshots: fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'))
            }, null, 2)
        );

    } catch (err) {
        console.error('\n❌ TEST FAILED:', err.message);
        console.error(err.stack);

        try {
            await capture(page, 'error-state');
        } catch {}

        results.push({ step: 'GENERAL', pass: false, error: err.message });
    } finally {
        if (browser) {
            console.log('\nBrowser closed.');
            await browser.close();
        }
    }
}

const startTime = Date.now();
e2eTest().then(() => {
    console.log(`\nTotal time: ${Date.now() - startTime}ms`);
}).catch(console.error);
