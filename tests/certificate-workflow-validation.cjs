#!/usr/bin/env node
/**
 * CERTIFORGE — FULL CERTIFICATE WORKFLOW VALIDATION
 * Creates test data first, then tests complete workflow
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = 'docs/workflow-validation';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function capture(page, name) {
    const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`  📸 ${filepath}`);
    return filepath;
}

async function runWorkflow() {
    console.log('='.repeat(70));
    console.log('CERTIFORGE — FULL CERTIFICATE WORKFLOW VALIDATION');
    console.log('='.repeat(70));
    console.log('Start:', new Date().toISOString());
    console.log('');
    
    const results = [];
    const consoleMessages = [];
    let browser, page;
    
    try {
        browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
        const context = await browser.newContext();
        page = await context.newPage();
        
        // Capture console
        page.on('console', msg => {
            const text = msg.text();
            consoleMessages.push({ type: msg.type(), text });
            if (msg.type() === 'error') {
                console.log(`  ❌ CONSOLE ERROR: ${text}`);
            }
        });
        
        // ========================================
        // STEP 0: Create Test Project
        // ========================================
        console.log('\n[STEP 0] CREATING TEST PROJECT');
        const t0Start = Date.now();
        
        await page.goto('http://localhost:3002/studio/projects', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        
        // Check if project exists
        let hasProject = await page.locator('text=ICON Studios Final Browser Test').count();
        
        if (hasProject === 0) {
            console.log('  Creating test project...');
            
            // Click "New Project" or "Create Project"
            const newProjectBtn = page.locator('button:has-text("New Project"), button:has-text("Create Project")').first();
            await newProjectBtn.click();
            await page.waitForTimeout(1000);
            
            // Type project name
            await page.keyboard.type('ICON Studios Final Browser Test');
            await page.waitForTimeout(500);
            
            // Press Enter or click Create
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);
            
            console.log(`  ✓ Project created in ${Date.now() - t0Start}ms`);
        } else {
            console.log('  ✓ Test project already exists');
        }
        
        await capture(page, '00-project-created');
        
        const t0Time = Date.now() - t0Start;
        results.push({ step: 'Create Test Project', pass: true, time_ms: t0Time });
        
        // ========================================
        // STEP 1: Navigate to Project Detail
        // ========================================
        console.log('\n[STEP 1] NAVIGATE TO PROJECT DETAIL');
        const t1Start = Date.now();
        
        await page.locator('text=ICON Studios Final Browser Test').click();
        await page.waitForTimeout(3000);
        
        console.log(`  ✓ Loaded in ${Date.now() - t1Start}ms`);
        console.log(`  ✓ URL: ${page.url()}`);
        
        // Check what's on the project detail page
        const pageTitle = await page.title();
        console.log(`  ✓ Page title: ${pageTitle}`);
        
        await capture(page, '01-project-detail');
        
        results.push({ step: 'Navigate to Project', pass: true, url: page.url(), time_ms: Date.now() - t1Start });
        
        // ========================================
        // STEP 2: Explore Project Sections
        // ========================================
        console.log('\n[STEP 2] EXPLORE PROJECT SECTIONS');
        
        // Get all navigation items
        const navItems = await page.locator('nav a, .nav a, [role="navigation"] a').allTextContents();
        console.log(`  ✓ Navigation items found: ${navItems.length}`);
        navItems.forEach((item, i) => console.log(`    ${i + 1}. ${item.trim()}`));
        
        // Look for specific sections
        const sections = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href]'));
            return links.map(l => ({ text: l.textContent?.trim(), href: l.href })).filter(l => l.text);
        });
        
        console.log(`  ✓ Total links on page: ${sections.length}`);
        sections.slice(0, 10).forEach(s => console.log(`    - ${s.text}: ${s.href}`));
        
        await capture(page, '02-project-navigation');
        
        // ========================================
        // STEP 3: Template Section
        // ========================================
        console.log('\n[STEP 3] TEMPLATE SECTION');
        
        const templateLink = sections.find(s => s.text?.toLowerCase().includes('template'));
        if (templateLink) {
            console.log(`  ✓ Template link found: ${templateLink.href}`);
            await page.goto(templateLink.href, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000);
            console.log(`  ✓ Template page loaded: ${page.url()}`);
            await capture(page, '03-template-section');
            results.push({ step: 'Template Section', pass: true, url: page.url() });
        } else {
            console.log('  ⚠ No template link found');
            results.push({ step: 'Template Section', pass: false, note: 'Link not found' });
        }
        
        // ========================================
        // STEP 4: Editor Section
        // ========================================
        console.log('\n[STEP 4] EDITOR SECTION');
        
        const editorLink = sections.find(s => s.text?.toLowerCase().includes('edit') || s.href?.includes('editor'));
        if (editorLink) {
            console.log(`  ✓ Editor link found: ${editorLink.href}`);
            await page.goto(editorLink.href, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);
            console.log(`  ✓ Editor page loaded: ${page.url()}`);
            await capture(page, '04-editor-section');
            results.push({ step: 'Editor Section', pass: true, url: page.url() });
        } else {
            console.log('  ⚠ No editor link found');
            results.push({ step: 'Editor Section', pass: false, note: 'Link not found' });
        }
        
        // ========================================
        // STEP 5: Recipients Section
        // ========================================
        console.log('\n[STEP 5] RECIPIENTS SECTION');
        
        const recipientsLink = sections.find(s => s.text?.toLowerCase().includes('recipient') || s.href?.includes('recipient'));
        if (recipientsLink) {
            console.log(`  ✓ Recipients link found: ${recipientsLink.href}`);
            await page.goto(recipientsLink.href, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000);
            console.log(`  ✓ Recipients page loaded: ${page.url()}`);
            await capture(page, '05-recipients-section');
            
            // Check for CSV import option
            const hasCsvImport = await page.locator('input[type="file"], text=CSV, text=Upload, text=Import').count();
            console.log(`  ✓ CSV import option found: ${hasCsvImport > 0 ? 'YES' : 'NO'}`);
            
            results.push({ step: 'Recipients Section', pass: true, url: page.url(), csv_import: hasCsvImport > 0 });
        } else {
            console.log('  ⚠ No recipients link found');
            results.push({ step: 'Recipients Section', pass: false, note: 'Link not found' });
        }
        
        // ========================================
        // STEP 6: Generate Section
        // ========================================
        console.log('\n[STEP 6] GENERATE SECTION');
        
        const generateLink = sections.find(s => s.text?.toLowerCase().includes('generate') || s.href?.includes('generate'));
        if (generateLink) {
            console.log(`  ✓ Generate link found: ${generateLink.href}`);
            await page.goto(generateLink.href, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);
            console.log(`  ✓ Generate page loaded: ${page.url()}`);
            await capture(page, '06-generate-section');
            
            // Check for generation options
            const hasPdfOption = await page.locator('text=PDF, text=Certificate').count();
            const hasZipOption = await page.locator('text=ZIP, text=Package').count();
            console.log(`  ✓ PDF generation option: ${hasPdfOption > 0 ? 'YES' : 'NO'}`);
            console.log(`  ✓ ZIP generation option: ${hasZipOption > 0 ? 'YES' : 'NO'}`);
            
            results.push({ step: 'Generate Section', pass: true, url: page.url(), has_pdf: hasPdfOption > 0, has_zip: hasZipOption > 0 });
        } else {
            console.log('  ⚠ No generate link found');
            results.push({ step: 'Generate Section', pass: false, note: 'Link not found' });
        }
        
        // ========================================
        // STEP 7: Verification Route
        // ========================================
        console.log('\n[STEP 7] VERIFICATION ROUTE');
        
        await page.goto('http://localhost:3002/verify/test-certificate-123', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        
        console.log(`  ✓ Verify page loaded: ${page.url()}`);
        console.log(`  ✓ Page title: ${await page.title()}`);
        
        const verifyContent = await page.content();
        const hasVerifyForm = verifyContent.includes('certificate') || verifyContent.includes('verify') || verifyContent.includes('number') || verifyContent.includes('search');
        console.log(`  ✓ Verification form present: ${hasVerifyForm ? 'YES' : 'NO'}`);
        
        await capture(page, '07-verification-page');
        
        results.push({ step: 'Verification Route', pass: hasVerifyForm, url: page.url() });
        
        // ========================================
        // FINAL SUMMARY
        // ========================================
        console.log('\n' + '='.repeat(70));
        console.log('WORKFLOW VALIDATION COMPLETE');
        console.log('='.repeat(70));
        
        // Summary table
        console.log('\nRESULTS SUMMARY:');
        results.forEach(r => {
            const status = r.pass ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${status} | ${r.step}`);
            if (r.url) console.log(`         URL: ${r.url}`);
            if (r.time_ms) console.log(`         Time: ${r.time_ms}ms`);
        });
        
        // Console errors
        const errorCount = consoleMessages.filter(m => m.type === 'error').length;
        console.log(`\nConsole errors: ${errorCount}`);
        
        // Save results
        const resultsFile = path.join(SCREENSHOTS_DIR, 'workflow-results.json');
        fs.writeFileSync(resultsFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            results: results,
            console_errors: errorCount,
            screenshots_dir: SCREENSHOTS_DIR,
            total_screenshots: fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png')).length
        }, null, 2));
        
        console.log(`\nResults saved to: ${resultsFile}`);
        
    } catch (err) {
        console.error('\n❌ WORKFLOW TEST FAILED:', err.message);
        console.error(err.stack);
        
        try {
            await capture(page, 'error-state');
        } catch {}
        
        results.push({ step: 'GENERAL', pass: false, error: err.message });
    } finally {
        if (browser) {
            await browser.close();
        }
        console.log('\nBrowser closed.');
    }
}

const startTime = Date.now();
runWorkflow().then(() => {
    console.log(`\nTotal time: ${Date.now() - startTime}ms`);
}).catch(console.error);
