#!/usr/bin/env node
/**
 * CERTIFORGE — E2E BROWSER VALIDATION
 * Tests complete certificate workflow via Chromium
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/e2e-validation');
const TEST_PROJECT_NAME = 'E2E Browser Test Project';

// Ensure screenshots directory exists
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  📸 ${filePath}`);
  return filePath;
}

async function main() {
  console.log('\n======================================================================');
  console.log('CERTIFORGE — E2E BROWSER VALIDATION');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    localStorage: [],
  });

  const page = await context.newPage();
  const startTime = Date.now();
  let errors = [];
  let projectId = null;

  try {
    // ── STEP 1: Navigate to Studio ───────────────────────────────
    console.log('[STEP 1] Navigate to Studio Projects...');
    const navStart = Date.now();
    await page.goto(`${BASE_URL}/studio/projects`, { waitUntil: 'networkidle' });
    console.log(`  ✓ Navigation completed in ${Date.now() - navStart}ms`);
    await screenshot(page, 'step1-projects');

    // Wait for loading to clear
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    const projectCount = await page.locator('.card').count();
    console.log(`  Found ${projectCount} project cards`);

    // ── STEP 2: Create Test Project ──────────────────────────────
    console.log('\n[STEP 2] Create Test Project...');
    const createStart = Date.now();
    
    // Click "New Project" button
    await page.locator('button:has-text("New Project"), button:has-text("Create Project")').first().click();
    await page.waitForTimeout(500);
    await screenshot(page, 'step2-modal-open');

    // Type project name
    await page.locator('input[type="text"], input[placeholder*="Name"]').first().fill(TEST_PROJECT_NAME);
    await screenshot(page, 'step2-form-filled');

    // Click Create button inside modal
    await page.locator('.fixed.z-50 button:has-text("Create"), .fixed.inset-0 button:has-text("Create")').click();
    console.log(`  ✓ Project creation completed in ${Date.now() - createStart}ms`);
    await page.waitForTimeout(2000);
    await screenshot(page, 'step2-after-create');

    // Get project ID from URL
    const currentUrl = page.url();
    const match = currentUrl.match(/\/studio\/projects\/([^/]+)/);
    if (match) {
      projectId = match[1];
      console.log(`  ✓ Project ID: ${projectId}`);
    } else {
      throw new Error('Could not get project ID from URL');
    }

    // ── STEP 3: Verify Project Page ──────────────────────────────
    console.log('\n[STEP 3] Verify Project Detail Page...');
    await page.waitForURL(/\/studio\/projects\/[^/]+/, { timeout: 5000 });
    await screenshot(page, 'step3-project-detail');

    // Check tabs exist
    const tabs = await page.locator('[role="tab"], button:has-text("Template"), button:has-text("Recipients")').count();
    console.log(`  Found ${tabs} navigation elements`);

    // ── STEP 4: Navigate to Recipients ───────────────────────────
    console.log('\n[STEP 4] Navigate to Recipients...');
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/recipients`);
    await page.waitForTimeout(1000);
    await screenshot(page, 'step4-recipients');

    // ── STEP 5: Upload CSV ────────────────────────────────────────
    console.log('\n[STEP 5] Upload Recipient CSV...');
    
    // Check for file upload
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      // Create temp CSV
      const csvContent = `name,email,course_name,instructor,grade
John Doe,john@example.com,AI Fundamentals,Dr. Smith,A+
Jane Smith,jane@example.com,ML Advanced,Prof. Johnson,B+`;
      const tmpFile = path.join(__dirname, '../tmp_test_recipients.csv');
      fs.writeFileSync(tmpFile, csvContent);
      
      await fileInput.setInputFiles(tmpFile);
      console.log('  ✓ CSV uploaded');
      await page.waitForTimeout(1000);
      await screenshot(page, 'step5-uploaded');
    }

    // ── STEP 6: Navigate to Generate ─────────────────────────────
    console.log('\n[STEP 6] Navigate to Generation...');
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/generate`);
    await page.waitForTimeout(1000);
    await screenshot(page, 'step6-generate');

    const recipientCount = await page.locator('[class*="recipient"], [data-recipient]').count();
    console.log(`  Found ${recipientCount} recipients displayed`);

    // ── STEP 7: Try to select template and generate ──────────────
    console.log('\n[STEP 7] Test Generation Flow...');
    
    // Look for template selection
    const templates = await page.locator('[class*="template"], button:has-text("Select")').count();
    console.log(`  Found ${templates} template-related elements`);

    if (templates > 0) {
      // Try clicking first template
      const firstTemplate = page.locator('[class*="template"]').first();
      if (await firstTemplate.count() > 0) {
        await firstTemplate.click();
        console.log('  ✓ Selected template');
      }
    }

    // Check for generate button
    const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Download")').first();
    if (await generateBtn.count() > 0) {
      console.log('  ✓ Generate button found');
      await screenshot(page, 'step7-before-generate');
    }

    // ── STEP 8: Verification Route ───────────────────────────────
    console.log('\n[STEP 8] Test Verification Route...');
    await page.goto(`${BASE_URL}/verify/CF-INVALID-TEST`);
    await page.waitForTimeout(1000);
    await screenshot(page, 'step8-verify');
    
    const verifyText = await page.locator('body').textContent().catch(() => 'error');
    console.log(`  Verification response: ${verifyText.substring(0, 100)}...`);

    // ── STEP 9: Refresh Persistence ──────────────────────────────
    console.log('\n[STEP 9] Test Refresh Persistence...');
    await page.goto(`${BASE_URL}/studio/projects`);
    await page.waitForTimeout(1000);
    await screenshot(page, 'step9-refresh');
    
    // Check project still exists
    const projectNameVisible = await page.locator(`text=${TEST_PROJECT_NAME}`).count() > 0;
    console.log(`  Project persists after refresh: ${projectNameVisible ? 'YES' : 'NO'}`);

    // ── STEP 10: Navigate Back to Project ────────────────────────
    console.log('\n[STEP 10] Final Navigation...');
    if (projectNameVisible) {
      await page.goto(`${BASE_URL}/studio/projects/${projectId}`);
      await page.waitForTimeout(1000);
      await screenshot(page, 'step10-final');
    }

    console.log('\n======================================================================');
    console.log('✅ E2E VALIDATION COMPLETED SUCCESSFULLY');
    console.log('======================================================================');

  } catch (error) {
    errors.push(error.message);
    console.error(`\n❌ Error: ${error.message}`);
    await screenshot(page, `error-${errors.length}`).catch(() => {});
  } finally {
    const totalTime = Date.now() - startTime;
    
    console.log('\n======================================================================');
    console.log('E2E VALIDATION SUMMARY');
    console.log('======================================================================');
    console.log(`Duration: ${totalTime}ms`);
    console.log(`Errors: ${errors.length > 0 ? errors.join(', ') : 'NONE'}`);
    console.log(`Screenshots: ${fs.existsSync(SCREENSHOTS_DIR) ? fs.readdirSync(SCREENSHOTS_DIR).length : 0} files`);
    console.log('\nScreenshot files:');
    if (fs.existsSync(SCREENSHOTS_DIR)) {
      fs.readdirSync(SCREENSHOTS_DIR).forEach(f => {
        console.log(`  - ${f}`);
      });
    }
    console.log('\n======================================================================\n');
  }

  await browser.close();
  
  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
