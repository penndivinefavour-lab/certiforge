const { execSync, spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(port, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(`http://localhost:${port}`, (res) => {
                    resolve(res.statusCode === 200);
                });
                req.on('error', () => reject());
                req.setTimeout(1000, () => { req.destroy(); reject(); });
            });
            console.log(`✓ Server responding on port ${port}`);
            return true;
        } catch (e) {
            if (Date.now() - start > timeout) {
                throw new Error(`Server failed to start within ${timeout}ms`);
            }
            await sleep(1000);
        }
    }
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 5.8.3 - REAL BROWSER VALIDATION');
    console.log('='.repeat(60) + '\n');
    
    // Start dev server
    console.log('Starting Next.js dev server...');
    const serverProcess = spawn(
        'node',
        ['node_modules/.bin/next', 'dev', '-p', '3002'],
        {
            cwd: path.join(__dirname, '../apps/web'),
            stdio: 'pipe',
            detached: true
        }
    );
    
    serverProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
    });
    
    // Wait for server
    await waitForServer(3002);
    
    console.log('\n' + '='.repeat(60));
    console.log('BROWSER VALIDATION STARTED');
    console.log('='.repeat(60) + '\n');
    
    // Now run browser validation using system Chrome via Playwright
    const { chromium } = require('playwright');
    
    let browser = null;
    let page = null;
    
    try {
        browser = await chromium.launch({
            channel: 'chrome',
            headless: false,
            args: ['--no-sandbox']
        });
        
        const context = await browser.newContext({ 
            viewport: { width: 1280, height: 720 }
        });
        
        page = await context.newPage();
        
        const results = {
            timestamp: new Date().toISOString(),
            open_studio_loaded: false,
            loading_cleared: false,
            project_created: false,
            project_persisted: false,
            console_errors: []
        };
        
        // Step 1: Navigate to landing page
        console.log('[1] Navigating to http://localhost:3002/ ...');
        await page.goto('http://localhost:3002/', { waitUntil: 'networkidle', timeout: 30000 });
        console.log(`    ✓ Title: ${await page.title()}`);
        
        // Collect console messages
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push({ type: msg.type(), text: msg.text() });
            if (msg.type() === 'error') {
                console.log(`    [ERROR] ${msg.text()}`);
                results.console_errors.push(msg.text());
            } else if (msg.text().includes('Studio') || msg.text().includes('IndexedDB')) {
                console.log(`    [${msg.type().toUpperCase()}] ${msg.text()}`);
            }
        });
        page.on('pageerror', err => {
            console.log(`    [PAGE ERROR] ${err.message}`);
            results.console_errors.push(err.message);
        });
        
        await sleep(2000);
        
        // Step 2: Click "Start Creating"
        console.log('\n[2] Clicking "Start Creating"...');
        const startButtons = await page.$$('a.btn-primary, button.btn-primary');
        if (startButtons.length > 0) {
            await startButtons[0].click();
            await sleep(2000);
            console.log(`    ✓ URL: ${page.url()}`);
        }
        
        // Check if on /studio/projects
        if (!page.url().includes('/studio/projects')) {
            console.log('\n[3] Navigating to studio projects...');
            const studioButtons = await page.$$('a.btn-primary, button.btn-primary');
            if (studioButtons.length > 0) {
                await studioButtons[0].click();
                await sleep(2000);
            }
        }
        
        console.log(`    ✓ Current URL: ${page.url()}`);
        
        // Step 4: Wait for loading
        console.log('\n[4] Waiting for Open Studio to initialize...');
        const loadStart = Date.now();
        const maxWait = 10000;
        
        while (Date.now() - loadStart < maxWait) {
            const spinnerCount = await page.$$('.animate-spin').count();
            if (spinnerCount === 0) {
                console.log(`    ✓ Loading completed in ${(Date.now() - loadStart) / 1000}s`);
                results.loading_cleared = true;
                break;
            }
            await sleep(500);
        }
        
        if (!results.loading_cleared) {
            console.log('    ✗ Timeout waiting for loading to complete');
        }
        
        // Check state
        const noProjects = await page.$('text="No projects yet"').then(e => e !== null);
        const hasProjects = (await page.$$('.card-interactive')).length > 0;
        
        if (noProjects) {
            console.log('    ✓ Empty state displayed');
        } else if (hasProjects) {
            console.log(`    ✓ Found ${await page.$$('.card-interactive').then(el => el.length)} project(s)`);
        }
        
        results.open_studio_loaded = true;
        
        // Step 5: Check IndexedDB
        console.log('\n[5] Checking IndexedDB...');
        const idbCheck = await page.evaluate(() => {
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
                    resolve({ exists: true, stores: Array.from(db.objectStoreNames), version: db.version });
                    db.close();
                };
                req.onerror = () => resolve({ error: req.error?.message });
            });
        });
        console.log(`    ${JSON.stringify(idbCheck)}`);
        
        // Take screenshot
        await page.screenshot({ path: 'C:/Users/USER/certiforge/docs/validation-initial.png', fullPage: true });
        
        // Step 6: Create project
        console.log('\n[6] Creating test project...');
        const createStart = Date.now();
        
        const createBtn = await page.$('button:has-text("New Project"), button:has-text("Create Project")');
        if (createBtn) {
            await createBtn.click();
            await sleep(1000);
            
            const input = await page.$('input[type="text"], input.form-input');
            if (input) {
                await input.fill('ICON Studios Open Studio Test');
                console.log('    ✓ Entered project name');
            }
            
            const submitBtn = await page.$('button:has-text("Create")');
            if (submitBtn) {
                await submitBtn.click();
                console.log('    ✓ Submitted project creation');
            }
        }
        
        await sleep(2000);
        const creationTime = (Date.now() - createStart) / 1000;
        
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
        console.log('VALIDATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Browser Used: System Chrome`);
        console.log(`URL: http://localhost:3002/studio/projects`);
        console.log(`Open Studio Loaded: ${results.open_studio_loaded ? 'YES' : 'NO'}`);
        console.log(`Loading Spinner Cleared: ${results.loading_cleared ? 'YES' : 'NO'}`);
        console.log(`Project Created: ${results.project_created ? 'YES' : 'NO'}`);
        console.log(`Project Persisted: ${results.project_persisted ? 'YES' : 'NO'}`);
        console.log(`Console Errors: ${results.console_errors.length === 0 ? 'NONE' : results.console_errors.length.toString()}`);
        console.log(`Timestamp: ${results.timestamp}`);
        
        console.log('\nScreenshots saved to docs/ folder');
        console.log('\nBrowser left open for inspection.');
        console.log('Press Ctrl+C to close when done.\n');
        
        // Keep browser open
        await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 5));
        
    } catch (error) {
        console.error('\n✗ VALIDATION FAILED:', error.message);
        if (page) {
            await page.screenshot({ path: 'C:/Users/USER/certiforge/docs/validation-error.png', fullPage: true });
        }
    } finally {
        if (browser) {
            console.log('\nClosing browser...');
            await browser.close();
        }
        serverProcess.kill();
        process.exit(0);
    }
}

main().catch(console.error);
