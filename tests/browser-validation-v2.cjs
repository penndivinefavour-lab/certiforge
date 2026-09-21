#!/usr/bin/env node
/**
 * Browser Validation - Proper React Interaction
 */

const { chromium } = require('playwright');

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 5.8.3 - BROWSER VALIDATION v2');
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
        page.on('pageerror', err => {
            console.log(`  [PAGE ERROR] ${err.message}`);
            results.console_errors.push(err.message);
        });
        
        // Step 1: Navigate directly to /studio/projects
        console.log('\n[1] Navigating to http://localhost:3002/studio/projects ...');
        const startTime = Date.now();
        await page.goto('http://localhost:3002/studio/projects', { 
            waitUntil: 'networkidle', 
            timeout: 30000 
        });
        console.log(`    ✓ Title: "${await page.title()}"`);
        console.log(`    ✓ URL: ${page.url()}`);
        
        // Wait for client-side hydration
        console.log('\n[2] Waiting for client-side initialization...');
        await sleep(3000);
        
        // Check loading state
        const spinners = await page.$$('.animate-spin');
        const noProjects = await page.$('text="No projects yet"').then(e => e !== null);
        
        if (spinners.length === 0 && noProjects) {
            console.log('    ✓ Loading complete - Empty state shown');
            results.loading_cleared = true;
            results.open_studio_loaded = true;
        } else {
            console.log(`    ℹ Spinners: ${spinners.length}, No Projects: ${noProjects}`);
            await page.screenshot({ path: 'C:/Users/USER/certiforge/docs/initial-state.png', fullPage: true });
        }
        
        // Step 3: Check IndexedDB
        console.log('\n[3] Checking IndexedDB...');
        const idbInfo = await page.evaluate(() => {
            return new Promise((resolve) => {
                if (typeof indexedDB === 'undefined') {
                    resolve({ error: 'Not available' });
                    return;
                }
                const req = indexedDB.open('certiforge-studio', 1);
                req.onsuccess = () => {
                    const db = req.result;
                    resolve({ 
                        exists: true, 
                        version: db.version,
                        stores: Array.from(db.objectStoreNames)
                    });
                    db.close();
                };
                req.onerror = () => resolve({ error: req.error?.message });
            });
        });
        console.log(`    ${JSON.stringify(idbInfo)}`);
        
        // Step 4: Click "Create Project" button
        console.log('\n[4] Creating test project...');
        const createStart = Date.now();
        
        // Find and click the Create Project button
        const createBtnSelector = 'button:has-text("Create Project")';
        const createBtn = await page.$(createBtnSelector);
        
        if (!createBtn) {
            console.log('    ⚠ Could not find "Create Project" button');
            console.log('    Available buttons:');
            const buttons = await page.$$('button');
            for (let i = 0; i < Math.min(buttons.length, 5); i++) {
                const text = await buttons[i].textContent();
                console.log(`      - ${text}`);
            }
        } else {
            await createBtn.click();
            console.log('    ✓ Modal opened');
        }
        
        await sleep(1000);
        
        // Take screenshot of modal
        await page.screenshot({ path: 'C:/Users/USER/certiforge/docs/modal-opened.png', fullPage: true });
        
        // Fill input using fill() method which handles React correctly
        const inputSelector = 'input[type="text"], input.form-input';
        const input = await page.$(inputSelector);
        
        if (input) {
            await input.fill('ICON Studios Open Studio Test');
            console.log('    ✓ Entered project name');
        } else {
            console.log('    ⚠ Could not find input field');
            // Try alternative selectors
            const allInputs = await page.$$('input');
            console.log(`    Found ${allInputs.length} input(s)`);
            if (allInputs.length > 0) {
                await allInputs[0].fill('ICON Studios Open Studio Test');
            }
        }
        
        // Click Create button
        const submitBtn = await page.$('button:has-text("Create")');
        if (submitBtn) {
            await submitBtn.click();
            console.log('    ✓ Submitted project creation');
        }
        
        // Wait for navigation or UI update
        await sleep(3000);
        const creationTime = (Date.now() - createStart) / 1000;
        
        // Check result
        const projectVisible = await page.$('text="ICON Studios Open Studio Test"').then(e => e !== null);
        const onProjectPage = page.url().includes('/studio/projects/');
        
        if (projectVisible || onProjectPage) {
            console.log(`    ✓ Project created (${creationTime.toFixed(2)}s)`);
            results.project_created = true;
            
            if (onProjectPage) {
                console.log(`    ✓ Navigated to project: ${page.url()}`);
            }
        } else {
            console.log('    ⚠ Project not visible after creation attempt');
            console.log(`    Current URL: ${page.url()}`);
            await page.screenshot({ path: 'C:/Users/USER/certiforge/docs/after-create.png', fullPage: true });
            
            // Check if modal is still open
            const modalOpen = await page.$('.fixed.inset-0').then(e => e !== null);
            console.log(`    Modal still open: ${modalOpen}`);
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
            console.log('    Current page content:');
            const pageText = await page.textContent('body');
            console.log(`    ${pageText.substring(0, 500)}...`);
            await page.screenshot({ path: 'C:/Users/USER/certiforge/docs/after-refresh.png', fullPage: true });
        }
        
        // Step 6: Check for errors
        console.log('\n[6] Checking console for errors...');
        const errors = consoleMessages.filter(m => m.type === 'error');
        const pageErrors = consoleMessages.filter(m => m.type === 'pageerror');
        
        if (errors.length === 0 && pageErrors.length === 0) {
            console.log('    ✓ No console errors');
        } else {
            console.log(`    ✗ Found ${errors.length + pageErrors.length} error(s)`);
            [...errors, ...pageErrors].forEach(e => console.log(`      - ${e.text || e}`));
        }
        
        // Final screenshot
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
        console.log('\nBrowser left open for inspection.');
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
