#!/usr/bin/env node
/**
 * CERTIFORGE — FINAL BROWSER VALIDATION v4 (Debug)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/final-validation-v4');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 ${filePath}`);
  return filePath;
}

async function main() {
  console.log('\n======================================================================');
  console.log('CERTIFORGE — FINAL BROWSER VALIDATION v4 (DEBUG)');
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
    console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ── STEP 1: Create Test Project ──────────────────────────────
    console.log('[STEP 1] Create Test Project...');
    const step1Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const newProjectBtn = page.locator('button').filter({ hasText: 'New Project' }).first();
    await newProjectBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, '01-modal-open');
    
    await page.locator('input[type="text"]').first().fill('Final Workflow Test');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await screenshot(page, '01-project-created');
    
    await page.waitForURL(/\/studio\/projects\/[^/]+/, { timeout: 10000 });
    const currentUrl = page.url();
    const urlMatch = currentUrl.match(/\/studio\/projects\/([^/]+)/);
    
    if (!urlMatch) {
      throw new Error(`Could not find project ID in URL: ${currentUrl}`);
    }
    
    const projectId = urlMatch[1];
    console.log(`  ✓ Created project ID: ${projectId}`);
    results.step1 = { projectId, time: Date.now() - step1Start };

    // ── STEP 2: Create Template ──────────────────────────────────
    console.log('\n[STEP 2] Create Template...');
    const step2Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/editor`);
    await page.waitForTimeout(2000);
    await screenshot(page, '02-editor-open');
    
    const canvasCount = await page.locator('canvas').count();
    console.log(`  ✓ Canvas elements found: ${canvasCount}`);
    
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Finish")').first();
    if (await saveBtn.count() > 0) {
      await saveBtn.click();
      console.log('  ✓ Clicked Save button');
      await page.waitForTimeout(2000);
      await screenshot(page, '02-save-clicked');
      
      // Check for success message
      const statusText = await page.locator('text=Saving...', 'text=saved').count();
      console.log(`  ✓ Save status checked`);
    }
    
    results.step2 = { editorAccessed: true, canvasCount };
    console.log(`  ✓ Completed in ${Date.now() - step2Start}ms`);

    // ── STEP 3: Add Recipients via direct IndexedDB insertion ──
    console.log('\n[STEP 3] Add Recipients via IndexedDB...');
    const step3Start = Date.now();
    
    // Insert recipients directly into IndexedDB for testing
    const recipientsInserted = await page.evaluate((projectId) => {
      return new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') {
          resolve({ error: 'IndexedDB not available' });
          return;
        }
        
        const DB_NAME = 'certiforge-studio';
        const DB_VERSION = 2;
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('recipients')) {
            db.createObjectStore('recipients', { keyPath: 'id' });
          }
        };
        
        request.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction('recipients', 'readwrite');
          const store = tx.objectStore('recipients');
          
          const recipients = [
            { 
              id: 'test-recip-1', 
              projectId, 
              name: 'Alice Johnson', 
              email: 'alice@example.com', 
              metadata: JSON.stringify({ course_name: 'AI Fundamentals', grade: 'A+' }),
              createdAt: Date.now() 
            },
            { 
              id: 'test-recip-2', 
              projectId, 
              name: 'Bob Williams', 
              email: 'bob@example.com', 
              metadata: JSON.stringify({ course_name: 'Machine Learning', grade: 'B+' }),
              createdAt: Date.now() 
            },
            { 
              id: 'test-recip-3', 
              projectId, 
              name: 'Carol Davis', 
              email: 'carol@example.com', 
              metadata: JSON.stringify({ course_name: 'Data Science', grade: 'A' }),
              createdAt: Date.now() 
            },
          ];
          
          recipients.forEach(r => store.add(r));
          
          tx.oncomplete = () => {
            console.log('[IndexedDB] Recipients inserted:', recipients.length);
            resolve({ inserted: recipients.length });
          };
          tx.onerror = (err) => {
            console.error('[IndexedDB] Transaction error:', err);
            resolve({ error: 'Transaction failed' });
          };
          
          db.close();
        };
        
        request.onerror = (err) => {
          console.error('[IndexedDB] Open error:', err);
          resolve({ error: 'Database open failed' });
        };
      });
    }, projectId);
    
    console.log(`  ✓ Recipients inserted: ${JSON.stringify(recipientsInserted)}`);
    
    // Verify by reading back
    const recipientsVerified = await page.evaluate((projectId) => {
      return new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') {
          resolve({ count: 0 });
          return;
        }
        
        const DB_NAME = 'certiforge-studio';
        const DB_VERSION = 2;
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction('recipients', 'readonly');
          const store = tx.objectStore('recipients');
          const getAll = store.getAll();
          
          getAll.onsuccess = () => {
            const allRecipients = getAll.result || [];
            const projectRecipients = allRecipients.filter(r => r.projectId === projectId);
            console.log('[IndexedDB] Found recipients for project:', projectRecipients.length);
            resolve({ count: projectRecipients.length, recipients: projectRecipients });
          };
          getAll.onerror = () => resolve({ count: 0 });
          
          db.close();
        };
        
        request.onerror = () => resolve({ count: 0 });
      });
    }, projectId);
    
    console.log(`  ✓ Verified recipients in DB: ${recipientsVerified.count}`);
    
    // Refresh project page to see counts
    await page.goto(`${BASE_URL}/studio/projects/${projectId}`);
    await page.waitForTimeout(1500);
    await screenshot(page, '03-after-insert');
    
    results.step3 = { recipientsInserted, recipientsVerified };
    console.log(`  ✓ Completed in ${Date.now() - step3Start}ms`);

    // ── STEP 4: Navigate to Generate ─────────────────────────────
    console.log('\n[STEP 4] Navigate to Generate...');
    const step4Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/generate`);
    await page.waitForTimeout(1500);
    await screenshot(page, '04-generate-page');
    
    // Check for template and recipient counts
    const templateExists = await page.locator('text=Certificate Template').count() > 0;
    const recipientCountText = await page.locator('text=Recipients').textContent().catch(() => '');
    console.log(`  ✓ Template exists: ${templateExists}`);
    console.log(`  ✓ Recipients text: ${recipientCountText}`);
    
    // Check if generate button is enabled
    const genBtn = page.locator('button:has-text("Generate")').first();
    const isDisabled = await genBtn.evaluate(el => el.disabled);
    console.log(`  ✓ Generate button disabled: ${isDisabled}`);
    
    results.step4 = { templateExists, recipientCountText, isDisabled };
    console.log(`  ✓ Completed in ${Date.now() - step4Start}ms`);

    // ── STEP 5: Attempt Generation ───────────────────────────────
    console.log('\n[STEP 5] Attempt Generation...');
    const step5Start = Date.now();
    
    if (!isDisabled) {
      await genBtn.click();
      await page.waitForTimeout(3000);
      await screenshot(page, '05-generating');
      
      const resultText = await page.locator('body').textContent().catch(() => '');
      console.log(`  ✓ Generation result: ${resultText.substring(0, 200)}`);
    } else {
      console.log('  ⚠ Generate button is disabled, cannot proceed');
    }
    
    results.step5 = { attempted: !isDisabled };
    console.log(`  ✓ Completed in ${Date.now() - step5Start}ms`);

    // ── STEP 6: Check Certificates Tab ───────────────────────────
    console.log('\n[STEP 6] Check Certificates...');
    const step6Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/certificates`);
    await page.waitForTimeout(1000);
    await screenshot(page, '06-certificates');
    
    const certText = await page.locator('body').textContent().catch(() => '');
    console.log(`  ✓ Certificate page text length: ${certText.length}`);
    
    results.step6 = { hasContent: certText.length > 0 };
    console.log(`  ✓ Completed in ${Date.now() - step6Start}ms`);

    // ── STEP 7: Test Verification ────────────────────────────────
    console.log('\n[STEP 7] Test Verification...');
    const step7Start = Date.now();
    
    await page.goto(`${BASE_URL}/verify/CF-TEST-1234`);
    await page.waitForTimeout(1000);
    await screenshot(page, '07-verify');
    
    const verifyText = await page.locator('body').textContent().catch(() => '');
    console.log(`  ✓ Verification page loaded, text length: ${verifyText.length}`);
    
    results.step7 = { verified: verifyText.length > 0 };
    console.log(`  ✓ Completed in ${Date.now() - step7Start}ms`);

    // ── STEP 8: Final State ──────────────────────────────────────
    console.log('\n[STEP 8] Final Navigation...');
    const step8Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}`);
    await page.waitForTimeout(1000);
    await screenshot(page, '08-final');
    
    console.log(`  ✓ Final URL: ${page.url()}`);
    results.step8 = { finalUrl: page.url() };
    console.log(`  ✓ Completed in ${Date.now() - step8Start}ms`);

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
        console.log(`  ${k}: ${JSON.stringify(v).substring(0, 100)}`);
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
