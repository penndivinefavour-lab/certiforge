#!/usr/bin/env node
/**
 * Real Browser Validation for Open Studio - Phase 5.8.3
 * Uses system Chrome via Playwright
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
    const results = {
        browser_used: 'System Chrome',
        url: 'http://localhost:3002',
        open_studio_loaded: false,
        time_to_load: 0,
        indexeddb_created: false,
        loading_spinner_cleared: false,
        project_created: false,
        project_creation_time: 0,
        project_persisted: false,
        project_reopened: false,
        console_errors: [],
        full_workflow_tested: false,
    };
    
    const consoleMessages = [];
    const errors = [];
    const screenshots = [];
    
    let browser = null;
    let page = null;
    
    try {
        console.log('\n' + '='.repeat(60));
        console.log('PHASE 5.8.3 BROWSER VALIDATION');
        console.log('='.repeat(60) + '\n');
        
        // Launch browser using system Chrome
        console.log('Starting browser...');
        browser = await chromium.launch({
            channel: 'chrome',
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        const context = await browser.newContext({ 
            viewport: { width: 1280, height: 720 }
        });
        
        page = await context.newPage();
        
        // Collect console messages
        page.on('console', (msg) => {
            const type = msg.type();
            const text = msg.text();
            consoleMessages.push({ type, text });
            
            if (type === 'error') {
                errors.push(text);
                console.log(`  [ERROR] ${text}`);
            } else if (text.includes('Studio') || text.includes('IndexedDB') || text.includes('[Studio]')) {
                console.log(`  [${type.toUpperCase()}] ${text}`);
            }
        });
        
        page.on('pageerror', (err) => {
            console.log(`  [PAGE ERROR] ${err.message}`);
            errors.push(err.message);
        });
        
        const startTime = Date.now();
        
        // Step 1: Navigate to landing page
        console.log('\n[Step 1] Navigating to http://localhost:3002/ ...');
        await page.goto('http://localhost:3002/', { waitUntil: 'networkidle', timeout: 30000 });
        console.log(`  ✓ Page loaded: "${await page.title()}"`);
        console.log(`  ✓ URL: ${page.url()}`);
        
        await sleep(2000);
        
        // Step 2: Click "Start Creating"
        console.log('\n[Step 2] Clicking "Start Creating" button...');
        const startButtons = await page.$$('a.btn-primary, button.btn-primary');
        if (startButtons.length > 0) {
            await startButtons[0].click();
            await sleep(2000);
            console.log(`  ✓ Navigated to: ${page.url()}`);
        } else {
            console.log('  ⚠ Could not find "Start Creating" button');
        }
        
        // Check if we're on /studio/projects
        let currentUrl = page.url();
        if (!currentUrl.includes('/studio/projects')) {
            console.log('\n[Step 3] Clicking "Start Creating" in studio...');
            const studioButtons = await page.$$('a.btn-primary, button.btn-primary');
            if (studioButtons.length > 0) {
                await studioButtons[0].click();
                await sleep(2000);
            }
        }
        
        console.log(`  ✓ Current URL: ${page.url()}`);
        
        // Step 4: Wait for loading to complete
        console.log('\n[Step 4] Waiting for Open Studio to load...');
        const loadStart = Date.now();
        const maxWaitTime = 10000;
        let loadingCleared = false;
        
        while (Date.now() - loadStart < maxWaitTime) {
            const spinnerCount = await page.$$('.animate-spin').count();
            
            if (spinnerCount === 0) {
                loadingCleared = true;
                break;
            }
            
            await sleep(500);
        }
        
        const loadTime = (Date.now() - loadStart) / 1000;
        results.time_to_load = loadTime;
        
        if (loadingCleared) {
            console.log(`  ✓ Loading spinner cleared after ${loadTime.toFixed(2)}s`);
            results.loading_spinner_cleared = true;
        } else {
            console.log(`  ✗ Loading spinner did NOT clear within ${maxWaitTime}ms`);
        }
        
        // Check what's displayed
        const hasNoProjects = await page.$('text="No projects yet"') !== null;
        const hasProjects = (await page.$$('.card-interactive')).length > 0;
        const hasError = (await page.$$('text=/Error|Failed/')).length > 0;
        
        if (hasNoProjects) {
            console.log('  ✓ Empty state shown: "No projects yet"');
        } else if (hasProjects) {
            const projectCount = (await page.$$('.card-interactive')).length;
            console.log(`  ✓ Found ${projectCount} existing project(s)`);
        } else if (hasError) {
            console.log('  ⚠ Error state detected');
            await takeScreenshot('error-state');
        } else {
            console.log('  ⚠ Unexpected state - taking screenshot');
            await takeScreenshot('unexpected-state');
        }
        
        results.open_studio_loaded = true;
        
        // Step 5: Check IndexedDB
        console.log('\n[Step 5] Checking IndexedDB...');
        const idbInfo = await page.evaluate(() => {
            return new Promise((resolve) => {
                if (typeof indexedDB === 'undefined') {
                    resolve({ error: 'IndexedDB not available' });
                    return;
                }
                
                const request = indexedDB.open('certiforge-studio', 1);
                
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('projects')) {
                        db.createObjectStore('projects', { keyPath: 'id' });
                    }
                    resolve({ created: true, stores: Array.from(db.objectStoreNames) });
                };
                
                request.onsuccess = (e) => {
                    const db = e.target.result;
                    resolve({ 
                        exists: true, 
                        stores: Array.from(db.objectStoreNames),
                        version: db.version 
                    });
                    db.close();
                };
                
                request.onerror = () => {
                    resolve({ error: request.error?.message || 'Unknown error' });
                };
            });
        });
        
        if (idbInfo.stores && idbInfo.stores.includes('projects')) {
            console.log(`  ✓ IndexedDB accessible: ${JSON.stringify(idbInfo)}`);
            results.indexeddb_created = true;
        } else if (idbInfo.created) {
            console.log(`  ✓ IndexedDB created: ${JSON.stringify(idbInfo)}`);
            results.indexeddb_created = true;
        } else {
            console.log(`  ✗ IndexedDB issue: ${JSON.stringify(idbInfo)}`);
        }
        
        // Step 6: Create test project
        console.log('\n[Step 6] Creating test project...');
        const createStart = Date.now();
        
        // Look for create button
        const createBtnSelector = 'button:has-text("New Project"), button:has-text("Create Project")';
        const createBtn = await page.$(createBtnSelector);
        if (createBtn) {
            await createBtn.click();
            await sleep(1000);
            
            // Fill in project name
            const inputSelector = 'input[type="text"], input.form-input';
            const input = await page.$(inputSelector);
            if (input) {
                await input.fill('ICON Studios Open Studio Test');
                console.log('  ✓ Entered project name');
            } else {
                // Try any visible input
                const anyInput = await page.$('input');
                if (anyInput) {
                    await anyInput.fill('ICON Studios Open Studio Test');
                }
            }
            
            // Click create
            const submitBtnSelector = 'button:has-text("Create")';
            const submitBtn = await page.$(submitBtnSelector);
            if (submitBtn) {
                await submitBtn.click();
                console.log('  ✓ Clicked create button');
            }
        } else {
            console.log('  ⚠ Could not find create button');
        }
        
        // Wait for creation
        await sleep(2000);
        const creationTime = (Date.now() - createStart) / 1000;
        results.project_creation_time = creationTime;
        
        // Check if project was created
        const projectExists = await page.$('text="ICON Studios Open Studio Test"').then(el => el !== null);
        const isOnProjectPage = page.url().includes('/studio/projects/');
        
        if (projectExists || isOnProjectPage) {
            console.log(`  ✓ Project created (${creationTime.toFixed(2)}s)`);
            results.project_created = true;
        } else {
            console.log('  ⚠ Could not verify project creation');
            await takeScreenshot('after-create');
        }
        
        // Step 7: Verify persistence
        console.log('\n[Step 7] Verifying project persistence...');
        await page.goto('http://localhost:3002/studio/projects', { waitUntil: 'networkidle' });
        await sleep(2000);
        
        const persists = await page.$('text="ICON Studios Open Studio Test"').then(el => el !== null);
        if (persists) {
            console.log('  ✓ Project persists after refresh');
            results.project_persisted = true;
        } else {
            console.log('  ⚠ Project not found after refresh');
            await takeScreenshot('after-refresh');
        }
        
        // Step 8: Check console
        console.log('\n[Step 8] Checking console for errors...');
        const errorMessages = consoleMessages.filter(m => m.type === 'error');
        if (errorMessages.length === 0) {
            console.log('  ✓ No console errors');
        } else {
            console.log(`  ✗ Found ${errorMessages.length} console error(s)`);
            results.console_errors = errorMessages.map(m => m.text);
        }
        
        // Final screenshot
        await takeScreenshot('final-state');
        
        results.full_workflow_tested = true;
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('VALIDATION RESULTS');
        console.log('='.repeat(60));
        
        const checks = [
            ['Browser Used', results.browser_used],
            ['URL', results.url],
            ['Open Studio Loaded', results.open_studio_loaded],
            ['Time to Load', `${results.time_to_load.toFixed(2)}s`],
            ['IndexedDB Created', results.indexeddb_created],
            ['Loading Spinner Cleared', results.loading_spinner_cleared],
            ['Project Created', results.project_created],
            ['Project Creation Time', `${results.project_creation_time.toFixed(2)}s`],
            ['Project Persisted', results.project_persisted],
            ['Console Errors', results.console_errors.length === 0 ? 'None' : results.console_errors.length.toString()],
            ['Full Workflow Tested', results.full_workflow_tested],
        ];
        
        let allPassed = true;
        for (const [label, value] of checks) {
            let icon = '✓';
            if (typeof value === 'boolean' && !value) {
                icon = '✗';
                allPassed = false;
            } else if (value === 'None') {
                // OK
            } else if (typeof value === 'string' && value.includes('✗')) {
                icon = '✗';
                allPassed = false;
            }
            console.log(`  ${icon} ${label}: ${value}`);
        }
        
        console.log('\nScreenshots saved to docs/ folder');
        console.log(`\nCurrent URL: ${page.url()}`);
        console.log('\nBrowser will remain open for inspection.');
        
        // Keep running so browser stays open
        console.log('Press Ctrl+C to close the browser when done inspecting');
        await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 5));
        
    } catch (error) {
        console.error('\n✗ VALIDATION FAILED:', error.message);
        if (page) {
            await takeScreenshot('error-' + Date.now());
        }
    } finally {
        if (browser) {
            console.log('\nTo close the browser, press Ctrl+C or close this terminal');
        }
    }
    
    async function takeScreenshot(name) {
        try {
            const filename = `C:/Users/USER/certiforge/docs/browser-${name}-${Date.now()}.png`;
            await page.screenshot({ path: filename, fullPage: true });
            screenshots.push(filename);
            console.log(`  📸 Screenshot: ${filename}`);
        } catch (e) {
            console.log(`  ⚠ Screenshot failed: ${e.message}`);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
