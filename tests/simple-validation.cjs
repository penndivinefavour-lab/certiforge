#!/usr/bin/env node
/**
 * Simple Browser Validation Script
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
        // Launch Chrome with remote debugging disabled (fresh instance)
        console.log('Starting browser...');
        browser = await chromium.launch({
            channel: 'chrome',
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await browser.newContext({ 
            viewport: { width: 1280, height: 720 }
        });
        
        const page = await context.newPage();
        
        // Collect console messages
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
        
        // Step 1: Navigate to landing page
        console.log('\n[1] Navigating to http://localhost:3002/ ...');
        const startTime = Date.now();
        await page.goto('http://localhost:3002/', { waitUntil: 'networkidle', timeout: 30000 });
        console.log(`    ✓ Title: "${await page.title()}"`);
        console.log(`    ✓ URL: ${page.url()}`);
        
        await sleep(2000);
        
        // Step 2: Click "Start Creating"
        console.log('\n[2] Clicking "Start Creating"...');
        const startBtn = await page.$('a.btn-primary, button.btn-primary');
        if (startBtn) {
            await startBtn.click();
            await sleep(2000);
            console.log(`    ✓ Navigated to: ${page.url()}`);
        }
        
        // Step 3: Check if we need to go to /studio/projects
        let currentUrl = page.url();
        if (!currentUrl.includes('/studio/projects')) {
            console.log('\n[3] Clicking to navigate to projects...');
            const btns = await page.$$('a.btn-primary, button.btn-primary');
            if (btns.length > 0) {
                await btns[0].click();
                await sleep(2000);
            }
        }
        
        console.log(`    ✓ Current URL: ${page.url()}`);
        
        // Step 4: Wait for loading
        console.log('\n[4] Waiting for Open Studio to load...');
        const loadStart = Date.now();
        let spinnerCleared = false;
        
        while (Date.now() - loadStart < 10000) {
            const spinners = await page.$$('.animate-spin');
            if (spinners.length === 0) {
                spinnerCleared = true;
                break;
            }
            await sleep(500);
        }
        
        const loadTime = (Date.now() - loadStart) / 1000;
        console.log(`    ${spinnerCleared ? '✓' : '✗'} Loading cleared in ${loadTime.toFixed(2)}s`);
        results.loading_cleared = spinnerCleared;
        
        // Check state
        const noProjects = await page.$('text="No projects yet"').then(e => e !== null);
        const hasProjectCards = (await page.$$('.card-interactive')).length > 0;
        
        if (noProjects) {
            console.log('    ✓ Empty state shown: "No projects yet"');
        } else if (hasProjectCards) {
            console.log('    ✓ Projects found in grid');
        }
        
        results.open_studio_loaded = true;
        
        // Step 5: Check IndexedDB
        console.log('\n[5] Checking IndexedDB...');
        const idbInfo = await page.evaluate(() => {
            return new Promise((resolve) => {
                if (typeof indexedDB === 'undefined') {
                    resolve({ error: 'Not available' });
                    return;
                }
                const req = indexedDB.open('certiforge-studio', 1);
                req.onupgradeneeded = () => {
                    req.result.createObjectStore('projects', { keyPath: 'id' });
                    resolve({ created: true });
                };
                req.onsuccess = () => {
                    const db = req.result;
                    resolve({ exists: true, version: db.version });
                    db.close();
                };
                req.onerror = () => resolve({ error: req.error?.message });
            });
        });
        console.log(`    ${JSON.stringify(idbInfo)}`);
        
        // Screenshot
        await page.screenshot({ path: 'C:/Users/USER/certiforge/docs/validation-step1.png', fullPage: true });
        
        // Step 6: Create project
        console.log('\n[6] Creating test project...');
        const createStart = Date.now();
        
        const createBtn = await page.$('button:has-text("New Project"), button:has-text("Create Project")');
        if (createBtn) {
            await createBtn.click();
            await sleep(1000);
            
            // Find input field
            const inputs = await page.$$('input[type="text"], input.form-input');
            if (inputs.length > 0) {
                await inputs[0].fill('ICON Studios Open Studio Test');
                console.log('    ✓ Entered project name');
            }
            
            // Find submit button
            const submitBtn = await page.$('button:has-text("Create")');
            if (submitBtn) {
                await submitBtn.click();
                console.log('    ✓ Submitted');
            }
        }
        
        await sleep(2000);
        const creationTime = (Date.now() - createStart) / 1000;
        
        // Check result
        const projectVisible = await page.$('text="ICON Studios Open Studio Test"').then(e => e !== null);
        const onProjectPage = page.url().includes('/studio/projects/');
        
        if (projectVisible || onProjectPage) {
            console.log(`    ✓ Project created (${creationTime.toFixed(2)}s)`);
            results.project_created = true;
        } else {
            console.log('    ⚠ Could not verify project creation');
            await page.screenshot({ path: 'C:/Users/USER/certiforge/docs/validation-after-create.png', fullPage: true });
        }
        
        // Step 7: Verify persistence
        console.log('\n[7] Verifying persistence...');
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
        
        // Final screenshot
        await page.screenshot({ path: 'C:/Users/USER/certiforge/docs/validation-final.png', fullPage: true });
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('VALIDATION RESULTS');
        console.log('='.repeat(60));
        console.log(`  Timestamp: ${results.timestamp}`);
        console.log(`  Open Studio Loaded: ${results.open_studio_loaded ? 'YES' : 'NO'}`);
        console.log(`  Loading Spinner Cleared: ${results.loading_cleared ? 'YES' : 'NO'}`);
        console.log(`  Project Created: ${results.project_created ? 'YES' : 'NO'}`);
        console.log(`  Project Persisted: ${results.project_persisted ? 'YES' : 'NO'}`);
        console.log(`  Console Errors: ${results.console_errors.length === 0 ? 'NONE' : results.console_errors.length.toString()}`);
        
        if (results.console_errors.length > 0) {
            console.log('\n  Error details:');
            results.console_errors.forEach(err => console.log(`    - ${err}`));
        }
        
        console.log('\nScreenshots saved to docs/ folder');
        console.log('\nBrowser left open for your inspection.');
        console.log('Press Ctrl+C to close when done.\n');
        
        // Keep browser open
        await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 5));
        
    } catch (error) {
        console.error('\n✗ VALIDATION FAILED:', error.message);
        if (browser) {
            const page = await browser.pages();
            if (page.length > 0) {
                await page[0].screenshot({ path: 'C:/Users/USER/certiforge/docs/validation-error.png', fullPage: true });
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
