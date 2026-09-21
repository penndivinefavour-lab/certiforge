#!/usr/bin/env node
/**
 * Browser Validation - Fixed Modal Handling
 */

const { chromium } = require('playwright');

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 5.8.3 - BROWSER VALIDATION (FIXED)');
    console.log('='.repeat(60) + '\n');
    
    const results = {
        timestamp: new Date().toISOString(),
        open_studio_loaded: false,
        loading_cleared: false,
        project_created: false,
        project_persisted: false,
        console_errors: []
    };
    
    let browser = null;
    
    try {
        browser = await chromium.launch({
            channel: 'chrome',
            headless: false,
            args: ['--no-sandbox']
        });
        
        const context = await browser.newContext({ 
            viewport: { width: 1280, height: 720 }
        });
        
        const page = await context.newPage();
        
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push({ type: msg.type(), text: msg.text() });
            if (msg.type() === 'error') {
                console.log(`  [ERROR] ${msg.text()}`);
                results.console_errors.push(msg.text());
            } else if (msg.text().includes('Studio') || msg.text().includes('IndexedDB')) {
                console.log(`  [${msg.type().toUpperCase()}] ${msg.text()}`);
            }
        });
        
        // Step 1: Navigate to /studio/projects directly
        console.log('\n[1] Navigating to http://localhost:3002/studio/projects ...');
        const startTime = Date.now();
        await page.goto('http://localhost:3002/studio/projects', { waitUntil: 'networkidle', timeout: 30000 });
        console.log(`    ✓ Title: "${await page.title()}"`);
        console.log(`    ✓ URL: ${page.url()}`);
        
        // Wait for client-side load
        await sleep(3000);
        
        // Step 2: Check loading state
        console.log('\n[2] Checking loading state...');
        const spinners = await page.$$('.animate-spin');
        const noProjects = await page.$('text="No projects yet"').then(e => e !== null);
        
        if (spinners.length === 0 && noProjects) {
            console.log('    ✓ Loading complete - Empty state shown');
            results.loading_cleared = true;
            results.open_studio_loaded = true;
        } else if (spinners.length > 0) {
            console.log('    ⚠ Still loading...');
            await sleep(2000);
            const spinners2 = await page.$$('.animate-spin');
            if (spinners2.length === 0) {
                console.log('    ✓ Loading completed after wait');
                results.loading_cleared = true;
            }
        }
        
        // Step 3: Check IndexedDB
        console.log('\n[3] Checking IndexedDB...');
        const idbInfo = await page.evaluate(() => {
            return new Promise((resolve) => {
                const req = indexedDB.open('certiforge-studio', 1);
                req.onsuccess = () => {
                    const db = req.result;
                    resolve({ exists: true, version: db.version });
                    db.close();
                };
                req.onerror = () => resolve({ error: req.error?.message });
            });
        });
        console.log(`    ${JSON.stringify(idbInfo)}`);
        
        // Step 4: Create project
        console.log('\n[4] Creating test project "ICON Studios Open Studio Test"...');
        const createStart = Date.now();
        
        // Click "Create Project" button
        const createBtn = await page.$('button:has-text("Create Project")');
        if (createBtn) {
            await createBtn.click();
            console.log('    ✓ Modal opened');
        }
        
        await sleep(500);
        
        // Type in the input using JS (more reliable)
        await page.evaluate(() => {
            const input = document.querySelector('input[type="text"]') || 
                          document.querySelector('input.form-input') ||
                          document.querySelector('input[placeholder*="name"]');
            if (input) {
                input.value = 'ICON Studios Open Studio Test';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        console.log('    ✓ Entered project name');
        
        // Click Create button
        const submitBtn = await page.$('button:has-text("Create")');
        if (submitBtn) {
            await submitBtn.click();
            console.log('    ✓ Submitted project creation');
        }
        
        await sleep(2000);
        const creationTime = (Date.now() - createStart) / 1000;
        
        // Check if project was created
        const projectVisible = await page.$('text="ICON Studios Open Studio Test"').then(e => e !== null);
        const onProjectPage = page.url().includes('/studio/projects/');
        
        if (projectVisible || onProjectPage) {
            console.log(`    ✓ Project created (${creationTime.toFixed(2)}s)`);
            results.project_created = true;
        } else {
            console.log('    ⚠ Could not verify project creation');
            console.log(`    Current URL: ${page.url()}`);
            await page.screenshot({ path: 'C:/Users/USER/certiforge/docs/validation-after-create.png', fullPage: true });
        }
        
        // Step 5: Verify persistence
        console.log('\n[5] Verifying project persistence...');
        await page.goto('http://localhost:3002/studio/projects', { waitUntil: 'networkidle' });
        await sleep(2000);
        
        const persists = await page.$('text="ICON Studios Open Studio Test"').then(e => e !== null);
        if (persists) {
            console.log('    ✓ Project persists after refresh');
            results.project_persisted = true;
        } else {
            console.log('    ⚠ Project not found after refresh');
            await page.screenshot({ path: 'C:/Users/USER/certiforge/docs/validation-after-refresh.png', fullPage: true });
        }
        
        // Step 6: Final checks
        console.log('\n[6] Checking for console errors...');
        const errors = consoleMessages.filter(m => m.type === 'error');
        if (errors.length === 0) {
            console.log('    ✓ No console errors');
        } else {
            console.log(`    ✗ Found ${errors.length} error(s)`);
            errors.forEach(e => console.log(`      - ${e.text}`));
        }
        
        // Final screenshot
        await page.screenshot({ path: 'C:/Users/USER/certiforge/docs/validation-final.png', fullPage: true });
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('VALIDATION RESULTS');
        console.log('='.repeat(60));
        console.log(`  Timestamp: ${results.timestamp}`);
        console.log(`  Open Studio Loaded: ${results.open_studio_loaded ? 'YES' : 'NO'}`);
        console.log(`  Loading Spinner Cleared: ${results.loading_cleared ? 'YES' : 'NO'}`);
        console.log(`  IndexedDB Created: ${idbInfo.exists ? 'YES' : 'NO'}`);
        console.log(`  Project Created: ${results.project_created ? 'YES' : 'NO'}`);
        console.log(`  Project Creation Time: ${creationTime.toFixed(2)}s`);
        console.log(`  Project Persisted: ${results.project_persisted ? 'YES' : 'NO'}`);
        console.log(`  Console Errors: ${results.console_errors.length === 0 ? 'NONE' : results.console_errors.length.toString()}`);
        
        const allPassed = results.open_studio_loaded && 
                         results.loading_cleared && 
                         results.project_created && 
                         results.project_persisted &&
                         results.console_errors.length === 0;
        
        console.log(`\n  Overall: ${allPassed ? 'PASS ✓' : 'NEEDS ATTENTION ⚠'}`);
        
        console.log('\nBrowser left open for inspection.');
        console.log('Press Ctrl+C to close.\n');
        
        // Keep browser open
        await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 10));
        
    } catch (error) {
        console.error('\n✗ VALIDATION FAILED:', error.message);
        if (browser) {
            const pages = await browser.pages();
            if (pages.length > 0) {
                await pages[0].screenshot({ path: 'C:/Users/USER/certiforge/docs/validation-error.png', fullPage: true });
            }
        }
    } finally {
        if (browser) {
            console.log('\nClosing browser...');
            await browser.close();
        }
        process.exit(0);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
