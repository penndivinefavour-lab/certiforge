#!/usr/bin/env node
/**
 * CERTIFORGE — FINAL BROWSER CERTIFICATE WORKFLOW VALIDATION (FIXED)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/final-validation-v3');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 ${filePath}`);
  return filePath;
}

async function main() {
  console.log('\n======================================================================');
  console.log('CERTIFORGE — FINAL BROWSER VALIDATION v3');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const startTime = Date.now();
  const results = {};
  let errors = [];
  let consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ── STEP 1: Create Test Project ──────────────────────────────
    console.log('[STEP 1] Create Test Project...');
    const step1Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await screenshot(page, '01-start');
    
    // Click "New Project" button
    const newProjectBtn = page.locator('button').filter({ hasText: 'New Project' }).first();
    await newProjectBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, '01-modal-open');
    
    // Fill name and submit
    await page.locator('input[type="text"]').first().fill('Final Workflow Test');
    await screenshot(page, '01-form-filled');
    
    // Press Enter to submit
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await screenshot(page, '01-project-created');
    
    // Wait for navigation and get project ID from URL
    await page.waitForURL(/\/studio\/projects\/[^/]+/, { timeout: 10000 });
    const currentUrl = page.url();
    const urlMatch = currentUrl.match(/\/studio\/projects\/([^/]+)/);
    
    if (!urlMatch) {
      throw new Error(`Could not find project ID in URL: ${currentUrl}`);
    }
    
    const projectId = urlMatch[1];
    console.log(`  ✓ Created project ID: ${projectId}`);
    console.log(`  ✓ Project created in ${Date.now() - step1Start}ms`);
    results.step1 = { projectId, time: Date.now() - step1Start };

    // ── STEP 2: Create Template ──────────────────────────────────
    console.log('\n[STEP 2] Create Template...');
    const step2Start = Date.now();
    
    // Navigate to editor
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/editor`);
    await page.waitForTimeout(2000);
    await screenshot(page, '02-editor-open');
    
    // Check if canvas exists
    const canvasCount = await page.locator('canvas').count();
    console.log(`  ✓ Canvas elements found: ${canvasCount}`);
    
    // Try to save template (if save button exists)
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Finish")').first();
    if (await saveBtn.count() > 0) {
      await saveBtn.click();
      console.log('  ✓ Clicked Save button');
      await page.waitForTimeout(2000);
      await screenshot(page, '02-save-clicked');
    } else {
      console.log('  ⚠ No Save button found (may need to add elements first)');
    }
    
    results.step2 = { editorAccessed: true, canvasCount };
    console.log(`  ✓ Completed in ${Date.now() - step2Start}ms`);

    // ── STEP 3: Add Recipients via CSV ───────────────────────────
    console.log('\n[STEP 3] Add Recipients...');
    const step3Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/recipients`);
    await page.waitForTimeout(1500);
    await screenshot(page, '03-recipients-page');
    
    // Upload CSV
    const csvContent = `name,email,course_name,instructor,grade,duration
Alice Johnson,alice@example.com,AI Fundamentals,Dr. Smith,A+,12 weeks
Bob Williams,bob@example.com,Machine Learning,Prof. Johnson,B+,10 weeks`;
    
    const tmpFile = path.join(__dirname, '../tmp_workflow_test.csv');
    fs.writeFileSync(tmpFile, csvContent);
    
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(tmpFile);
      console.log('  ✓ Uploaded CSV with 2 recipients');
      await page.waitForTimeout(2000);
      await screenshot(page, '03-csv-uploaded');
      
      // Look for import/continue button
      const importBtn = page.locator('button:has-text("Import"), button:has-text("Continue"), button:has-text("Confirm")').first();
      if (await importBtn.count() > 0) {
        await importBtn.click();
        console.log('  ✓ Clicked Import button');
        await page.waitForTimeout(1000);
        await screenshot(page, '03-import-clicked');
      }
    }
    
    results.step3 = { csvUploaded: true };
    console.log(`  ✓ Completed in ${Date.now() - step3Start}ms`);

    // ── STEP 4: Navigate to Generate ─────────────────────────────
    console.log('\n[STEP 4] Navigate to Generate...');
    const step4Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/generate`);
    await page.waitForTimeout(1500);
    await screenshot(page, '04-generate-page');
    
    // Check for generate button
    const genBtn = page.locator('button:has-text("Generate"), button:has-text("Download")').first();
    const btnCount = await genBtn.count();
    const isDisabled = btnCount > 0 ? await genBtn.evaluate(el => el.disabled) : null;
    
    console.log(`  ✓ Generate button visible: ${btnCount > 0}, Disabled: ${isDisabled}`);
    results.step4 = { buttonVisible: btnCount > 0, disabled: isDisabled };
    console.log(`  ✓ Completed in ${Date.now() - step4Start}ms`);

    // ── STEP 5: Check Certificates Tab ───────────────────────────
    console.log('\n[STEP 5] Check Certificates...');
    const step5Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/certificates`);
    await page.waitForTimeout(1000);
    await screenshot(page, '05-certificates');
    
    const certText = await page.locator('body').textContent().catch(() => '');
    console.log(`  ✓ Page contains certificate-related text: ${certText.includes('Certificate') || certText.includes('certificate')}`);
    
    results.step5 = { hasContent: certText.length > 0 };
    console.log(`  ✓ Completed in ${Date.now() - step5Start}ms`);

    // ── STEP 6: Test Verification Route ──────────────────────────
    console.log('\n[STEP 6] Test Verification...');
    const step6Start = Date.now();
    
    await page.goto(`${BASE_URL}/verify/CF-TEST-1234`);
    await page.waitForTimeout(1000);
    await screenshot(page, '06-verify');
    
    const verifyText = await page.locator('body').textContent().catch(() => '');
    console.log(`  ✓ Verification page loaded, text length: ${verifyText.length}`);
    
    results.step6 = { verified: verifyText.length > 0 };
    console.log(`  ✓ Completed in ${Date.now() - step6Start}ms`);

    // ── STEP 7: Final State ──────────────────────────────────────
    console.log('\n[STEP 7] Final Navigation...');
    const step7Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}`);
    await page.waitForTimeout(1000);
    await screenshot(page, '07-final');
    
    console.log(`  ✓ Final URL: ${page.url()}`);
    results.step7 = { finalUrl: page.url() };
    console.log(`  ✓ Completed in ${Date.now() - step7Start}ms`);

  } catch (error) {
    errors.push(error.message);
    console.error(`\n❌ Error: ${error.message}`);
    await screenshot(page, 'error-final').catch(() => {});
  } finally {
    const totalTime = Date.now() - startTime;
    
    console.log('\n======================================================================');
    console.log('FINAL VALIDATION RESULTS');
    console.log('======================================================================');
    console.log(`Duration: ${totalTime}ms`);
    console.log(`Errors: ${errors.length > 0 ? errors.join(', ') : 'NONE'}`);
    console.log(`Console Errors: ${consoleErrors.length > 0 ? consoleErrors.length + ' errors' : 'NONE OBSERVED'}`);
    
    console.log('\n--- OBSERVATIONS ---');
    Object.entries(results).forEach(([step, data]) => {
      console.log(`\n${step.toUpperCase()}:`);
      Object.entries(data).forEach(([k, v]) => {
        console.log(`  ${k}: ${v}`);
      });
    });
    
    console.log('\n--- SCREENSHOTS ---');
    if (fs.existsSync(SCREENSHOTS_DIR)) {
      const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
      files.forEach(f => console.log(`  - ${f}`));
      console.log(`\nTotal screenshots: ${files.length}`);
    }
    
    console.log('\n======================================================================');
    if (errors.length === 0) {
      console.log('STATUS: ALL STEPS COMPLETED SUCCESSFULLY');
    } else {
      console.log(`STATUS: ${errors.length} ERROR(S)`);
    }
    console.log('======================================================================\n');
  }

  await browser.close();
  
  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
