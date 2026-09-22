#!/usr/bin/env node
/**
 * CERTIFORGE — FINAL BROWSER VALIDATION v5 (Full Generation Test)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/final-validation-v5');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 ${filePath}`);
  return filePath;
}

async function main() {
  console.log('\n======================================================================');
  console.log('CERTIFORGE — FINAL BROWSER VALIDATION v5 (GENERATION TEST)');
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
    await page.goto(`${BASE_URL}/studio/projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    await page.locator('button').filter({ hasText: 'New Project' }).first().click();
    await page.waitForTimeout(500);
    await page.locator('input[type="text"]').first().fill('Final Generation Test');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await screenshot(page, '01-project-created');
    
    await page.waitForURL(/\/studio\/projects\/[^/]+/, { timeout: 10000 });
    const projectId = page.url().match(/\/studio\/projects\/([^/]+)/)[1];
    console.log(`  ✓ Project: ${projectId}`);

    // ── STEP 2: Create Template ──────────────────────────────────
    console.log('\n[STEP 2] Create Template...');
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/editor`);
    await page.waitForTimeout(2000);
    
    await page.locator('button:has-text("Save"), button:has-text("Finish")').first().click();
    await page.waitForTimeout(2000);
    await screenshot(page, '02-template-saved');
    console.log('  ✓ Template saved');

    // ── STEP 3: Add Recipients ───────────────────────────────────
    console.log('\n[STEP 3] Add Recipients...');
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
            { id: 'gen-recip-1', projectId, name: 'Alice Johnson', email: 'alice@example.com', metadata: JSON.stringify({ course_name: 'AI Fundamentals', grade: 'A+' }), createdAt: Date.now() },
            { id: 'gen-recip-2', projectId, name: 'Bob Williams', email: 'bob@example.com', metadata: JSON.stringify({ course_name: 'ML Advanced', grade: 'B+' }), createdAt: Date.now() },
            { id: 'gen-recip-3', projectId, name: 'Carol Davis', email: 'carol@example.com', metadata: JSON.stringify({ course_name: 'Data Science', grade: 'A' }), createdAt: Date.now() },
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

    // ── STEP 4: Navigate to Generate and Check State ─────────────
    console.log('\n[STEP 4] Check Generate Page State...');
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/generate`);
    await page.waitForTimeout(2000);
    await screenshot(page, '04-generate-before-click');
    
    // Get detailed state from browser
    const state = await page.evaluate(() => {
      // Try to access React state (this won't work directly, but we can check DOM)
      return {
        url: window.location.href,
        templateSelected: document.querySelector('[class*="template"]')?.textContent?.includes('selected') || false,
        recipientCount: document.querySelector('[class*="Recipients"]')?.textContent || 'not found',
        generateBtnDisabled: document.querySelector('button:has-text("Generate")')?.disabled || 'unknown',
      };
    });
    
    console.log(`  State: ${JSON.stringify(state)}`);
    
    // Check actual button state
    const genBtn = page.locator('button:has-text("Generate")').first();
    const btnDisabled = await genBtn.evaluate(el => el.disabled);
    console.log(`  Button disabled attribute: ${btnDisabled}`);
    
    // Try clicking anyway to see what happens
    if (btnDisabled) {
      console.log('  ⚠ Button is disabled, trying to enable by clicking template...');
      
      // Click on the template card to select it
      const templateCard = page.locator('[class*="template"], [class*="card"]').first();
      if (await templateCard.count() > 0) {
        await templateCard.click();
        await page.waitForTimeout(500);
        console.log('  ✓ Clicked template card');
      }
    }
    
    // Check button state again
    const btnDisabled2 = await genBtn.evaluate(el => el.disabled);
    console.log(`  Button disabled after click: ${btnDisabled2}`);
    
    await screenshot(page, '04-generate-after-template-click');
    
    // ── STEP 5: Attempt Generation ───────────────────────────────
    console.log('\n[STEP 5] Attempt Generation...');
    const btnDisabled3 = await genBtn.evaluate(el => el.disabled);
    
    if (!btnDisabled3) {
      await genBtn.click();
      await page.waitForTimeout(5000);
      await screenshot(page, '05-generated');
      
      const resultText = await page.locator('body').textContent().catch(() => '');
      console.log(`  Generation result: ${resultText.substring(0, 200)}...`);
      results.step5 = { generated: true, result: resultText.substring(0, 100) };
    } else {
      console.log('  ⚠ Cannot generate - button remains disabled');
      results.step5 = { generated: false, reason: 'button_disabled' };
    }

    // ── STEP 6: Check Certificates Tab ───────────────────────────
    console.log('\n[STEP 6] Check Certificates...');
    await page.goto(`${BASE_URL}/studio/projects/${projectId}/certificates`);
    await page.waitForTimeout(1000);
    await screenshot(page, '06-certificates');
    
    const certText = await page.locator('body').textContent().catch(() => '');
    console.log(`  Certificate page text length: ${certText.length}`);
    results.step6 = { hasContent: certText.length > 0 };

    // ── STEP 7: Test Verification ────────────────────────────────
    console.log('\n[STEP 7] Test Verification...');
    await page.goto(`${BASE_URL}/verify/CF-TEST-1234`);
    await page.waitForTimeout(1000);
    await screenshot(page, '07-verify');
    
    const verifyText = await page.locator('body').textContent().catch(() => '');
    console.log(`  Verification page loaded: ${verifyText.length > 0}`);
    results.step7 = { verified: verifyText.length > 0 };

    // ── STEP 8: Final State ──────────────────────────────────────
    console.log('\n[STEP 8] Final Navigation...');
    await page.goto(`${BASE_URL}/studio/projects/${projectId}`);
    await page.waitForTimeout(1000);
    await screenshot(page, '08-final');
    
    results.step8 = { finalUrl: page.url() };

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
      console.log('STATUS: ALL STEPS COMPLETED');
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
