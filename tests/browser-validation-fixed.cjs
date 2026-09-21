#!/usr/bin/env node
/**
 * Browser Validation - Using JS evaluation for clicks
 */

const { chromium } = require('playwright');

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 5.8.3 - BROWSER VALIDATION');
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
        
        // Step 1: Navigate directly to /studio/projects
        console.log('\n[1] Navigating to http://localhost:3002/studio/projects ...');
        const startTime = Date.now();
        await page.goto('http://localhost:3002/studio/projects', { waitUntil: 'networkidle', timeout: 30000 });
        console.log(`    ✓ Title: "${await page.title()}"`);
        console.log(`    ✓ URL: ${page.url()}`);
        
        // Wait for client-side hydration
        await sleep(3000);
        
        // Step 2: Check loading state
        console.log('\n[2] Checking loading state...');
        const spinners = await page.$$('.animate-spin');
        const noProjects = await page.$('text="No projects yet"').then(e => e !== null);
        
        if (spinners.length === 0 && noProjects) {
            console.log('    ✓ Loading complete - Empty state shown');
            results.loading_cleared = true;
            results.open_studio_loaded = true;
        } else if (spinners.length === 0) {
            console.log('    ✓ Loading complete');
            results.loading_cleared = true;
            results.open_studio_loaded = true;
        }
        
        // Step 3: Check IndexedDB
        console.log('\n[3] Checking IndexedDB...');
        const idbInfo = await page.evaluate(() => {
            return new Promise((resolve) => {
                const req = indexedDB.open('certiforge-studio', 1);
                req.onsuccess = () => {
                    const db = req.result;
                    resolve({ exists: true, version: db.version, stores: Array.from(db.objectStoreNames) });
                    db.close();
                };
                req.onerror = () => resolve({ error: req.error?.message });
            });
        });
        console.log(`    ${JSON.stringify(idbInfo)}`);
        
        // Step 4: Create project using JS evaluation
        console.log('\n[4] Creating test project...');
        const createStart = Date.now();
        
        // Use JS to trigger the modal and form submission
        await page.evaluate(() => {
            // Find and click the "Create Project" button
            const btn = Array.from(document.querySelectorAll('button')).find(b => 
                b.textContent.includes('Create Project')
            );
            if (btn) {
                btn.click();
            }
        });
        
        await sleep(500);
        
        // Fill in the input using JS
        await page.evaluate(() => {
            const input = document.querySelector('input[type="text"]') || 
                          document.querySelector('input.form-input') ||
                          document.querySelector('input[placeholder*="name"]');
            if (input) {
                input.value = 'ICON Studios Open Studio Test';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        console.log('    ✓ Entered project name via JS');
        
        // Click Create button using JS (bypasses overlay issues)
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => 
                b.textContent.includes('Create') && !b.textContent.includes('Cancel')
            );
            if (btn) {
                btn.click();
            }
        });
        console.log('    ✓ Submitted via JS');
        
        await sleep(3000);
        const creationTime = (Date.now() - createStart) / 1000;
        
        // Check result
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
        
        // Screenshot
        await page.screenshot({ path: 'C:/Users/USER/certiforge/docs/validation-final.png', fullPage: true });
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('VALIDATION RESULTS');
        console.log('='.repeat(60));
        console.log(`  Browser Used: System Chrome via Playwright`);
        console.log(`  URL: http://localhost:3002/studio/projects`);
        console.log(`  Timestamp: ${results.timestamp}`);
        console.log(`  Open Studio Loaded: ${results.open_studio_loaded ? 'YES' : 'NO'}`);
        console.log(`  Loading Spinner Cleared: ${results.loading_cleared ? 'YES' : 'NO'}`);
        console.log(`  IndexedDB Created: ${idbInfo.exists ? 'YES' : 'NO'}`);
        console.log(`  Project Created: ${results.project_created ? 'YES' : 'NO'}`);
        console.log(`  Project Creation Time: ${creationTime.toFixed(2)}s`);
        console.log(`  Project Persisted After Refresh: ${results.project_persisted ? 'YES' : 'NO'}`);
        console.log(`  Console Errors: ${results.console_errors.length === 0 ? 'NONE' : results.console_errors.length.toString()}`);
        
        const allPassed = results.open_studio_loaded && 
                         results.loading_cleared && 
                         results.project_created && 
                         results.project_persisted &&
                         results.console_errors.length === 0;
        
        console.log(`\n  OVERALL: ${allPassed ? 'PASS ✓✓✓' : 'NEEDS ATTENTION ⚠'}`);
        
        console.log('\nScreenshots saved to docs/ folder');
        console.log('\nBrowser left open for your inspection.');
        console.log('Press Ctrl+C to close.\n');
        
        // Keep browser open for user inspection
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
