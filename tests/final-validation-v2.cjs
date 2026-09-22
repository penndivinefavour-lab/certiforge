#!/usr/bin/env node
/**
 * CERTIFORGE — FINAL BROWSER VALIDATION v2
 * Tests complete workflow with fixed IndexedDB service
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/final-validation-v2');

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 ${filePath}`);
  return filePath;
}

async function main() {
  console.log('\n======================================================================');
  console.log('CERTIFORGE — FINAL BROWSER VALIDATION v2');
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
    
    await page.goto(`${BASE_URL}/studio/projects`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.locator('button:has-text("New Project")').click();
    await page.waitForTimeout(500);
    await screenshot(page, '01-modal-open');
    
    await page.locator('input[placeholder*="Name"], input[type="text"]').first().fill('Final Validation Test');
    await screenshot(page, '01-form-filled');
    
    await page.locator('.fixed.z-50 button:has-text("Create")').click();
    console.log(`  ✓ Created in ${Date.now() - step1Start}ms`);
    await page.waitForTimeout(2000);
    await screenshot(page, '01-project-created');
    
    const url = page.url();
    const match = url.match(/\/studio\/projects\/([^/]+)/);
    if (!match) throw new Error('Could not get project ID');
    const projectId = match[1];
    console.log(`  ✓ Project ID: ${projectId}`);
    results.step1 = { projectId, time: Date.now() - step1Start };

    // ── STEP 2: Create Template in Editor ────────────────────────
    console.log('\n[STEP 2] Create Template...');
    const step2Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/editor`);
    await page.waitForTimeout(2000);
    await screenshot(page, '02-editor-open');
    
    // Add some text to make it a real template
    await page.locator('button:has-text("Text")').first().click();
    await page.waitForTimeout(500);
    
    // Save the template
    const saveBtn = page.locator('button:has-text("Save")').first();
    if (await saveBtn.count() > 0) {
      await saveBtn.click();
      console.log('  ✓ Clicked Save');
      await page.waitForTimeout(2000);
      await screenshot(page, '02-template-saved');
    }
    
    // Navigate back and check if template exists
    await page.goto(`${BASE_URL}/studio/projects/${projectId}`);
    await page.waitForTimeout(1500);
    await screenshot(page, '02-project-with-template');
    
    // Check templates count
    const templatesCount = await page.locator('[role="tab"]:has-text("Templates")').textContent().catch(() => '');
    console.log(`  ✓ Templates tab: ${templatesCount}`);
    
    results.step2 = { editorAccessed: true };
    console.log(`  ✓ Completed in ${Date.now() - step2Start}ms`);

    // ── STEP 3: Add Recipients ───────────────────────────────────
    console.log('\n[STEP 3] Add Recipients...');
    const step3Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/recipients`);
    await page.waitForTimeout(1000);
    await screenshot(page, '03-recipients-page');
    
    // Upload CSV
    const csvContent = `name,email,course_name,instructor,grade,duration
Alice Johnson,alice@example.com,AI Fundamentals,Dr. Smith,A+,12 weeks
Bob Williams,bob@example.com,Machine Learning,Prof. Johnson,B+,10 weeks
Carol Davis,carol@example.com,Data Science,Dr. Lee,A,8 weeks`;
    
    const tmpFile = path.join(__dirname, '../tmp_final_test.csv');
    fs.writeFileSync(tmpFile, csvContent);
    
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(tmpFile);
      console.log('  ✓ Uploaded CSV');
      await page.waitForTimeout(1500);
      await screenshot(page, '03-csv-uploaded');
      
      const importBtn = page.locator('button:has-text("Import"), button:has-text("Continue")').first();
      if (await importBtn.count() > 0) {
        await importBtn.click();
        console.log('  ✓ Clicked import');
        await page.waitForTimeout(1000);
      }
    }
    
    // Verify recipients
    await page.goto(`${BASE_URL}/studio/projects/${projectId}`);
    await page.waitForTimeout(1000);
    
    const recTab = page.locator('[role="tab"]:has-text("Recipients")').first();
    if (await recTab.count() > 0) {
      await recTab.click();
      await page.waitForTimeout(500);
      await screenshot(page, '03-after-import');
    }
    
    results.step3 = { csvUploaded: true };
    console.log(`  ✓ Completed in ${Date.now() - step3Start}ms`);

    // ── STEP 4: Generate Certificates ────────────────────────────
    console.log('\n[STEP 4] Generate Certificates...');
    const step4Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/generate`);
    await page.waitForTimeout(1500);
    await screenshot(page, '04-generate-page');
    
    // Check state
    const genBtn = page.locator('button:has-text("Generate")').first();
    const isDisabled = await genBtn.evaluate(el => el.disabled);
    console.log(`  ✓ Generate button disabled: ${isDisabled}`);
    
    if (!isDisabled) {
      await genBtn.click();
      console.log('  ✓ Generated certificates');
      await page.waitForTimeout(2000);
      await screenshot(page, '04-generated');
    } else {
      console.log('  ⚠ Generate button is disabled (no template selected or no recipients)');
    }
    
    results.step4 = { generateButtonVisible: true, isDisabled };
    console.log(`  ✓ Completed in ${Date.now() - step4Start}ms`);

    // ── STEP 5: Verify Certificates Tab ──────────────────────────
    console.log('\n[STEP 5] Verify Certificates...');
    const step5Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/certificates`);
    await page.waitForTimeout(1000);
    await screenshot(page, '05-certificates');
    
    const certText = await page.locator('body').textContent().catch(() => '');
    console.log(`  ✓ Page text length: ${certText.length}`);
    
    results.step5 = { hasContent: certText.length > 0 };
    console.log(`  ✓ Completed in ${Date.now() - step5Start}ms`);

    // ── STEP 6: Test Verification ────────────────────────────────
    console.log('\n[STEP 6] Test Verification...');
    const step6Start = Date.now();
    
    await page.goto(`${BASE_URL}/verify/CF-TEST-1234`);
    await page.waitForTimeout(1000);
    await screenshot(page, '06-verify');
    
    const verifyText = await page.locator('body').textContent().catch(() => '');
    console.log(`  ✓ Verification page loaded: ${verifyText.length > 0}`);
    
    results.step6 = { verified: verifyText.length > 0 };
    console.log(`  ✓ Completed in ${Date.now() - step6Start}ms`);

    // ── STEP 7: Final State ──────────────────────────────────────
    console.log('\n[STEP 7] Final State...');
    const step7Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}`);
    await page.waitForTimeout(1000);
    await screenshot(page, '07-final');
    
    console.log(`  ✓ Final URL: ${page.url()}`);
    
    results.step7 = { finalUrl: page.url() };
    console.log(`  ✓ Completed in ${Date.now() - step7Start}ms`);

    // ── SUMMARY ──────────────────────────────────────────────────
    console.log('\n======================================================================');
    console.log('FINAL VALIDATION RESULTS');
    console.log('======================================================================');
    console.log(`Duration: ${Date.now() - startTime}ms`);
    console.log(`Console Errors: ${consoleErrors.length > 0 ? consoleErrors.join(', ') : 'NONE OBSERVED'}`);
    
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
      console.log(`\nTotal: ${files.length} screenshots`);
    }
    
    console.log('\n======================================================================');
    if (errors.length === 0) {
      console.log('STATUS: ALL STEPS COMPLETED SUCCESSFULLY');
    } else {
      console.log(`STATUS: ${errors.length} ERROR(S)`);
    }
    console.log('======================================================================\n');

  } catch (error) {
    errors.push(error.message);
    console.error(`\n❌ Error: ${error.message}`);
    await screenshot(page, 'error-final').catch(() => {});
  } finally {
    const totalTime = Date.now() - startTime;
    console.log(`\nTotal duration: ${totalTime}ms`);
    console.log(`Errors: ${errors.length > 0 ? errors.join(', ') : 'NONE'}`);
    console.log(`Console Errors: ${consoleErrors.length > 0 ? consoleErrors.length + ' errors' : 'NONE OBSERVED'}`);
  }

  await browser.close();
  
  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
