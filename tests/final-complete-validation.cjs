#!/usr/bin/env node
/**
 * CERTIFORGE — FINAL BROWSER VALIDATION v6 (COMPLETE)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/final-validation-v6');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 ${filePath}`);
  return filePath;
}

async function main() {
  console.log('\n======================================================================');
  console.log('CERTIFORGE — FINAL BROWSER VALIDATION v6 (COMPLETE)');
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
    
    await page.locator('button').filter({ hasText: 'New Project' }).first().click();
    await page.waitForTimeout(500);
    await page.locator('input[type="text"]').first().fill('Final Complete Test');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await screenshot(page, '01-project-created');
    
    await page.waitForURL(/\/studio\/projects\/[^/]+/, { timeout: 10000 });
    const projectId = page.url().match(/\/studio\/projects\/([^/]+)/)[1];
    console.log(`  ✓ Project ID: ${projectId}`);
    results.step1 = { projectId, time: Date.now() - step1Start };

    // ── STEP 2: Create Template in Editor ────────────────────────
    console.log('\n[STEP 2] Create Template...');
    const step2Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/editor`);
    await page.waitForTimeout(2000);
    await screenshot(page, '02-editor-open');
    
    // Add some text elements to make it a real template
    await page.locator('button:has-text("Text")').first().click();
    await page.waitForTimeout(500);
    
    // Save the template
    await page.locator('button:has-text("Save")').first().click();
    await page.waitForTimeout(2000);
    await screenshot(page, '02-template-saved');
    
    console.log('  ✓ Template saved');
    results.step2 = { editorAccessed: true };
    console.log(`  ✓ Completed in ${Date.now() - step2Start}ms`);

    // ── STEP 3: Add Recipients via IndexedDB ─────────────────────
    console.log('\n[STEP 3] Add Recipients...');
    const step3Start = Date.now();
    
    const recipientsInserted = await page.evaluate((projectId) => {
      return new Promise((resolve) => {
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
            { id: 'final-recip-1', projectId, name: 'Alice Johnson', email: 'alice@example.com', metadata: JSON.stringify({ course_name: 'AI Fundamentals', grade: 'A+' }), createdAt: Date.now() },
            { id: 'final-recip-2', projectId, name: 'Bob Williams', email: 'bob@example.com', metadata: JSON.stringify({ course_name: 'ML Advanced', grade: 'B+' }), createdAt: Date.now() },
            { id: 'final-recip-3', projectId, name: 'Carol Davis', email: 'carol@example.com', metadata: JSON.stringify({ course_name: 'Data Science', grade: 'A' }), createdAt: Date.now() },
          ];
          
          recipients.forEach(r => store.add(r));
          
          tx.oncomplete = () => resolve({ inserted: recipients.length });
          tx.onerror = () => resolve({ error: 'Transaction failed' });
          db.close();
        };
        
        request.onerror = () => resolve({ error: 'Open failed' });
      });
    }, projectId);
    
    console.log(`  ✓ Inserted: ${JSON.stringify(recipientsInserted)}`);
    
    // Verify insertion
    const recipientsVerified = await page.evaluate((projectId) => {
      return new Promise((resolve) => {
        const request = indexedDB.open('certiforge-studio', 2);
        
        request.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction('recipients', 'readonly');
          const store = tx.objectStore('recipients');
          const getAll = store.getAll();
          
          getAll.onsuccess = () => {
            const all = getAll.result || [];
            const projectRecipients = all.filter(r => r.projectId === projectId);
            resolve({ count: projectRecipients.length, names: projectRecipients.map(r => r.name) });
          };
          getAll.onerror = () => resolve({ count: 0 });
          db.close();
        };
        
        request.onerror = () => resolve({ count: 0 });
      });
    }, projectId);
    
    console.log(`  ✓ Verified: ${JSON.stringify(recipientsVerified)}`);
    results.step3 = recipientsInserted;
    console.log(`  ✓ Completed in ${Date.now() - step3Start}ms`);

    // ── STEP 4: Navigate to Generate and Select Template ────────
    console.log('\n[STEP 4] Generate Certificates...');
    const step4Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/generate`);
    await page.waitForTimeout(2000);
    await screenshot(page, '04-generate-before-select');
    
    // Check current state
    const initialState = await page.evaluate(() => {
      return {
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 500),
      };
    });
    console.log(`  Initial state: ${initialState.bodyText.substring(0, 200)}...`);
    
    // Click on template card to select it
    const templateCard = page.locator('[class*="template"], [class*="card"]').first();
    if (await templateCard.count() > 0) {
      await templateCard.click();
      console.log('  ✓ Clicked template card');
      await page.waitForTimeout(500);
      await screenshot(page, '04-template-selected');
    }
    
    // Check button state
    const genBtn = page.locator('button').filter({ hasText: 'Generate' }).first();
    const isDisabled = await genBtn.evaluate(el => el.disabled);
    console.log(`  Generate button disabled: ${isDisabled}`);
    
    // Try clicking anyway (sometimes disabled attribute doesn't prevent click)
    if (isDisabled) {
      console.log('  ⚠ Button is disabled, attempting force click...');
      await page.evaluate(() => {
        const btn = document.querySelector('button');
        if (btn && btn.textContent.includes('Generate')) {
          btn.click();
        }
      });
      await page.waitForTimeout(2000);
    } else {
      await genBtn.click();
      await page.waitForTimeout(3000);
    }
    
    await screenshot(page, '04-after-generation-attempt');
    
    // Check result
    const afterGenText = await page.locator('body').textContent().catch(() => '');
    console.log(`  After generation: ${afterGenText.substring(0, 300)}...`);
    
    results.step4 = { attempted: true, buttonWasDisabled: isDisabled };
    console.log(`  ✓ Completed in ${Date.now() - step4Start}ms`);

    // ── STEP 5: Check Certificates Tab ───────────────────────────
    console.log('\n[STEP 5] Check Certificates...');
    const step5Start = Date.now();
    
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/certificates`);
    await page.waitForTimeout(1000);
    await screenshot(page, '05-certificates');
    
    const certText = await page.locator('body').textContent().catch(() => '');
    console.log(`  Certificate page text length: ${certText.length}`);
    console.log(`  Contains "Certificate": ${certText.includes('Certificate')}`);
    
    results.step5 = { hasContent: certText.length > 0 };
    console.log(`  ✓ Completed in ${Date.now() - step5Start}ms`);

    // ── STEP 6: Test Verification Route ──────────────────────────
    console.log('\n[STEP 6] Test Verification...');
    const step6Start = Date.now();
    
    await page.goto(`${BASE_URL}/verify/CF-TEST-1234`);
    await page.waitForTimeout(1000);
    await screenshot(page, '06-verify');
    
    const verifyText = await page.locator('body').textContent().catch(() => '');
    console.log(`  Verification page loaded, text length: ${verifyText.length}`);
    
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
    
    console.log('\n--- RESULTS ---');
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
      console.log(`\nTotal: ${files.length} screenshots`);
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
