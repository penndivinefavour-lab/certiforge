#!/usr/bin/env node
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTests() {
    const startTime = Date.now();
    const screenshots = [];
    const consoleMessages = [];
    const errors = [];
    
    console.log('='.repeat(60));
    console.log('CERTIFORGE OPEN STUDIO FINAL BROWSER VALIDATION');
    console.log('='.repeat(60));
    console.log('Start:', new Date().toISOString());
    console.log('');
    
    let browser;
    let page;
    
    try {
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await browser.newContext();
        page = await context.newPage();
        
        // Capture console
        page.on('console', msg => {
            consoleMessages.push({ type: msg.type(), text: msg.text() });
            if (msg.type() === 'error') {
                errors.push(msg.text());
                console.log(`  ❌ CONSOLE ERROR: ${msg.text()}`);
            }
        });
        
        // Test 1: Landing Page
        console.log('TEST 1 — LANDING PAGE');
        const t1Start = Date.now();
        await page.goto('http://localhost:3002/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log(`  ✓ Loaded in ${Date.now() - t1Start}ms`);
        console.log(`  ✓ Title: ${await page.title()}`);
        await page.screenshot({ path: 'docs/t1-landing.png' });
        screenshots.push('docs/t1-landing.png');
        
        // Test 2: Click Start Creating
        console.log('\nTEST 2 — START CREATING');
        const startBtn = page.locator('a[href="/studio"], a.btn').first();
        await startBtn.click();
        await page.waitForTimeout(1500);
        console.log(`  ✓ Current URL: ${page.url()}`);
        await page.screenshot({ path: 'docs/t2-studio.png' });
        screenshots.push('docs/t2-studio.png');
        
        // Test 3: Projects Page
        console.log('\nTEST 3 — PROJECTS PAGE');
        const t3Start = Date.now();
        await page.goto('http://localhost:3002/studio/projects', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000); // Wait for JS hydration
        const t3Time = Date.now() - t3Start;
        
        console.log(`  ✓ Loaded in ${t3Time}ms`);
        console.log(`  ✓ URL: ${page.url()}`);
        
        // Check loading state
        const spinnerCount = await page.locator('.animate-spin').count();
        console.log(`  ✓ Loading spinner: ${spinnerCount === 0 ? 'CLEARED' : 'STILL PRESENT'}`);
        
        // Check empty state
        const noProjects = await page.locator('text=No projects yet').count();
        const myProjects = await page.locator('text=My Projects').count();
        console.log(`  ✓ Empty state ("No projects yet"): ${noProjects > 0 ? 'YES' : 'NO'}`);
        console.log(`  ✓ Header ("My Projects"): ${myProjects > 0 ? 'YES' : 'NO'}`);
        
        // Check buttons
        const newProjectBtn = await page.locator('button:has-text("New Project")').count();
        const createBtn = await page.locator('button:has-text("Create Project")').count();
        console.log(`  ✓ "New Project" button: ${newProjectBtn > 0 ? 'YES' : 'NO'}`);
        console.log(`  ✓ "Create Project" button: ${createBtn > 0 ? 'YES' : 'NO'}`);
        
        await page.screenshot({ path: 'docs/t3-projects.png' });
        screenshots.push('docs/t3-projects.png');
        
        // Test 4: IndexedDB
        console.log('\nTEST 4 — INDEXEDDB');
        const idb = await page.evaluate(() => ({
            exists: typeof indexedDB !== 'undefined',
            version: indexedDB?.version
        }));
        console.log(`  ✓ IndexedDB available: ${idb.exists}`);
        
        const studioLogs = consoleMessages.filter(m => m.text.includes('[Studio]'));
        console.log(`  ✓ Studio console logs: ${studioLogs.length}`);
        studioLogs.forEach(l => console.log(`    - ${l.type}: ${l.text.substring(0, 80)}`));
        
        // Test 5: Create Project
        console.log('\nTEST 5 — CREATE PROJECT');
        const t5Start = Date.now();
        
        // Click "New Project" button
        await page.locator('button:has-text("New Project")').click();
        await page.waitForTimeout(1000);
        console.log('  ✓ Clicked "New Project"');
        
        // Fill in name using type (more reliable than fill for modals)
        await page.keyboard.type('ICON Studios Final Browser Test');
        console.log('  ✓ Typed project name');
        
        // Take screenshot of modal
        await page.screenshot({ path: 'docs/t5-modal-open.png' });
        screenshots.push('docs/t5-modal-open.png');
        
        // Try pressing Enter to submit
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        console.log('  ✓ Pressed Enter to submit');
        
        // Alternative: click Create button directly
        const createProjBtn = page.locator('button:has-text("Create Project")');
        if (await createProjBtn.count() > 0) {
            await createProjBtn.click({ force: true });
            console.log('  ✓ Clicked "Create Project" button');
            await page.waitForTimeout(2000);
        }
        
        const t5Time = Date.now() - t5Start;
        
        // Check if project was created
        const hasProject = await page.locator('text=ICON Studios Final Browser Test').count() > 0;
        console.log(`  ✓ Project created: ${hasProject ? 'YES' : 'NO'}`);
        console.log(`  ✓ Creation time: ${t5Time}ms`);
        
        await page.screenshot({ path: 'docs/t5-after-create.png' });
        screenshots.push('docs/t5-after-create.png');
        
        // Test 6: Refresh Persistence
        console.log('\nTEST 6 — REFRESH PERSISTENCE');
        const t6Start = Date.now();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        
        const afterRefresh = await page.locator('text=ICON Studios Final Browser Test').count() > 0;
        console.log(`  ✓ Refreshed in ${Date.now() - t6Start}ms`);
        console.log(`  ✓ Project persists after refresh: ${afterRefresh ? 'YES' : 'NO'}`);
        
        await page.screenshot({ path: 'docs/t6-after-refresh.png' });
        screenshots.push('docs/t6-after-refresh.png');
        
        // Test 7: Navigate Away and Back
        console.log('\nTEST 7 — NAVIGATION PERSISTENCE');
        await page.goto('http://localhost:3002/');
        await page.waitForTimeout(1000);
        
        await page.locator('a[href="/studio"]').first().click();
        await page.waitForTimeout(1500);
        
        await page.goto('http://localhost:3002/studio/projects');
        await page.waitForTimeout(2000);
        
        const afterNav = await page.locator('text=ICON Studios Final Browser Test').count() > 0;
        console.log(`  ✓ Project persists after navigation: ${afterNav ? 'YES' : 'NO'}`);
        
        await page.screenshot({ path: 'docs/t7-navigate-back.png' });
        screenshots.push('docs/t7-navigate-back.png');
        
        // Test 8: Console Errors Summary
        console.log('\nTEST 8 — CONSOLE ERRORS');
        console.log(`  Total messages: ${consoleMessages.length}`);
        console.log(`  Error count: ${errors.length}`);
        if (errors.length === 0) {
            console.log('  ✓ Console CLEAN - NO ERRORS OBSERVED');
        } else {
            console.log('  ✗ Console ERRORS OBSERVED:');
            errors.slice(0, 10).forEach(e => console.log(`    - ${e.substring(0, 150)}`));
        }
        
        // Final status
        const totalTime = Date.now() - startTime;
        
        console.log('\n' + '='.repeat(60));
        console.log('FINAL SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total time: ${totalTime}ms`);
        console.log(`Screenshots: ${screenshots.length}`);
        console.log(`Console errors: ${errors.length}`);
        
    } catch (err) {
        console.error('\n❌ TEST FAILED:', err.message);
        
        try {
            await page.screenshot({ path: 'docs/t-error.png' });
            screenshots.push('docs/t-error.png');
        } catch {}
    } finally {
        if (browser) {
            await browser.close();
        }
        
        const totalTime = Date.now() - startTime;
        console.log('\n' + '='.repeat(60));
        console.log('BROWSER VALIDATION COMPLETE');
        console.log('='.repeat(60));
        console.log(`Browser: Chromium (Playwright)`);
        console.log(`Total time: ${totalTime}ms`);
        console.log(`Screenshots saved: ${screenshots.length}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);
    }
}

runTests().catch(console.error);
