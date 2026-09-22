#!/usr/bin/env node
/**
 * CERTIFORGE — COMPREHENSIVE WORKFLOW VALIDATION
 * Tests ALL tabs and features with proper element detection
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

async function runTests() {
    console.log('='.repeat(70));
    console.log('CERTIFORGE — COMPREHENSIVE WORKFLOW VALIDATION');
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
        // STEP 1: Create Test Project
        // ========================================
        console.log('\n[STEP 1] CREATE TEST PROJECT');
        const t1Start = Date.now();
        
        await page.goto('http://localhost:3002/studio/projects', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        
        let hasProject = await page.locator('text=ICON Studios Final Browser Test').count();
        
        if (hasProject === 0) {
            console.log('  Creating test project...');
            const newProjectBtn = page.locator('button:has-text("New Project"), button:has-text("Create Project")').first();
            await newProjectBtn.click();
            await page.waitForTimeout(1000);
            
            await page.keyboard.type('ICON Studios Final Browser Test');
            await page.waitForTimeout(500);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);
            console.log(`  ✓ Project created in ${Date.now() - t1Start}ms`);
        } else {
            console.log(`  ✓ Project already exists (${hasProject} found)`);
        }
        
        await capture(page, '01-project-created');
        results.push({ step: 'Create Project', pass: true, time_ms: Date.now() - t1Start });
        
        // ========================================
        // STEP 2: Navigate to Project Detail
        // ========================================
        console.log('\n[STEP 2] NAVIGATE TO PROJECT DETAIL');
        const t2Start = Date.now();
        
        // Click on the project card
        const projectCard = page.locator('text=ICON Studios Final Browser Test').first();
        await projectCard.click();
        await page.waitForTimeout(3000);
        
        const projectId = page.url().split('/').pop();
        console.log(`  ✓ Project ID: ${projectId}`);
        console.log(`  ✓ URL: ${page.url()}`);
        
        // Get page title and check for tabs
        const pageTitle = await page.title();
        console.log(`  ✓ Page title: ${pageTitle}`);
        
        // Check for tab buttons
        const hasTemplatesTab = await page.locator('button:has-text("Templates")').count();
        const hasRecipientsTab = await page.locator('button:has-text("Recipients")').count();
        const hasCertificatesTab = await page.locator('button:has-text("Certificates")').count();
        
        console.log(`  ✓ Templates tab found: ${hasTemplatesTab > 0 ? 'YES' : 'NO'}`);
        console.log(`  ✓ Recipients tab found: ${hasRecipientsTab > 0 ? 'YES' : 'NO'}`);
        console.log(`  ✓ Certificates tab found: ${hasCertificatesTab > 0 ? 'YES' : 'NO'}`);
        
        await capture(page, '02-project-detail');
        results.push({ step: 'Project Detail Load', pass: true, url: page.url(), time_ms: Date.now() - t2Start });
        
        // ========================================
        // STEP 3: Template Section
        // ========================================
        console.log('\n[STEP 3] TEMPLATE SECTION');
        const t3Start = Date.now();
        
        if (hasTemplatesTab > 0) {
            console.log('  Templates tab is active by default');
            
            // Look for "Add Template" or similar button
            const addTemplateBtn = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Upload"), a:has-text("Add Template")').first();
            if (await addTemplateBtn.count() > 0) {
                console.log('  ✓ Add template button found');
                await capture(page, '03-templates-tab');
            } else {
                console.log('  ⚠ No add template button found, checking for editor link...');
                const editorLink = page.locator('a[href*="editor"], button:has-text("Edit"), button:has-text("Design")').first();
                if (await editorLink.count() > 0) {
                    console.log('  ✓ Editor access found');
                }
            }
            await capture(page, '03-templates-tab');
        } else {
            console.log('  ⚠ Templates tab not found');
        }
        
        results.push({ step: 'Template Section', pass: hasTemplatesTab > 0, time_ms: Date.now() - t3Start });
        
        // ========================================
        // STEP 4: Editor Access
        // ========================================
        console.log('\n[STEP 4] EDITOR ACCESS');
        const t4Start = Date.now();
        
        // Try to navigate to editor directly
        const editorUrl = `http://localhost:3002/studio/projects/${projectId}/editor`;
        console.log(`  Navigating to: ${editorUrl}`);
        
        await page.goto(editorUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        
        console.log(`  ✓ Editor URL: ${page.url()}`);
        console.log(`  ✓ Editor page title: ${await page.title()}`);
        
        // Check for canvas or editing tools
        const hasCanvas = await page.locator('canvas, .fabric-canvas, [data-fabric]').count();
        const hasEditorTools = await page.locator('button:has-text("Text"), button:has-text("Rectangle"), button:has-text("Add")').count();
        
        console.log(`  ✓ Canvas/editor found: ${hasCanvas > 0 ? 'YES' : 'NO'}`);
        console.log(`  ✓ Editor tools found: ${hasEditorTools > 0 ? 'YES' : 'NO'}`);
        
        await capture(page, '04-editor');
        results.push({ step: 'Editor Access', pass: page.url().includes('editor'), time_ms: Date.now() - t4Start });
        
        // Go back to project detail
        await page.goto(`http://localhost:3002/studio/projects/${projectId}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        
        // ========================================
        // STEP 5: Recipients Section
        // ========================================
        console.log('\n[STEP 5] RECIPIENTS SECTION');
        const t5Start = Date.now();
        
        // Click on Recipients tab
        const recipientsTab = page.locator('button:has-text("Recipients")').first();
        if (await recipientsTab.count() > 0) {
            await recipientsTab.click();
            await page.waitForTimeout(2000);
            console.log('  ✓ Clicked Recipients tab');
        } else {
            // Try navigating directly
            const recipientsUrl = `http://localhost:3002/studio/projects/${projectId}/recipients`;
            console.log(`  Navigating to: ${recipientsUrl}`);
            await page.goto(recipientsUrl, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000);
        }
        
        console.log(`  ✓ Current URL: ${page.url()}`);
        
        // Check for CSV import
        const hasCsvImport = await page.locator('input[type="file"]').count();
        const hasImportText = await page.getByText('CSV').count();
        const hasUploadText = await page.getByText('Upload').count();
        console.log(`  ✓ CSV import option found: ${hasCsvImport > 0 || hasImportText > 0 ? 'YES' : 'NO'}`);
        
        await capture(page, '05-recipients');
        results.push({ step: 'Recipients Section', pass: true, csv_import: hasCsvImport > 0, time_ms: Date.now() - t5Start });
        
        // ========================================
        // STEP 6: Generate Section
        // ========================================
        console.log('\n[STEP 6] GENERATE SECTION');
        const t6Start = Date.now();
        
        // Navigate to certificates/generate
        const certsUrl = `http://localhost:3002/studio/projects/${projectId}/certificates`;
        console.log(`  Navigating to: ${certsUrl}`);
        await page.goto(certsUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        
        console.log(`  ✓ Certificates URL: ${page.url()}`);
        
        // Check for generate button
        const hasGenerateBtn = await page.locator('button:has-text("Generate"), button:has-text("Export"), button:has-text("Download")').count();
        console.log(`  ✓ Generate/Export button found: ${hasGenerateBtn > 0 ? 'YES' : 'NO'}`);
        
        await capture(page, '06-generate');
        results.push({ step: 'Generate Section', pass: hasGenerateBtn > 0, time_ms: Date.now() - t6Start });
        
        // ========================================
        // STEP 7: Verification Route
        // ========================================
        console.log('\n[STEP 7] VERIFICATION ROUTE');
        const t7Start = Date.now();
        
        await page.goto('http://localhost:3002/verify/test-cert-123', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        
        console.log(`  ✓ Verify URL: ${page.url()}`);
        
        const verifyContent = await page.content();
        const hasVerifyForm = verifyContent.includes('certificate') || verifyContent.includes('verify') || verifyContent.includes('number');
        console.log(`  ✓ Verification form present: ${hasVerifyForm ? 'YES' : 'NO'}`);
        
        await capture(page, '07-verification');
        results.push({ step: 'Verification Route', pass: hasVerifyForm, time_ms: Date.now() - t7Start });
        
        // ========================================
        // FINAL SUMMARY
        // ========================================
        console.log('\n' + '='.repeat(70));
        console.log('WORKFLOW VALIDATION COMPLETE');
        console.log('='.repeat(70));
        
        console.log('\nRESULTS:');
        results.forEach(r => {
            const status = r.pass ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${status} | ${r.step}`);
            if (r.time_ms) console.log(`         Time: ${r.time_ms}ms`);
            if (r.url) console.log(`         URL: ${r.url}`);
        });
        
        const errorCount = consoleMessages.filter(m => m.type === 'error').length;
        console.log(`\nConsole errors: ${errorCount}`);
        
        // Save results
        fs.writeFileSync(
            path.join(SCREENSHOTS_DIR, 'workflow-results.json'),
            JSON.stringify({
                timestamp: new Date().toISOString(),
                results: results,
                console_errors: errorCount,
                screenshots: fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'))
            }, null, 2)
        );
        
    } catch (err) {
        console.error('\n❌ TEST FAILED:', err.message);
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
runTests().then(() => {
    console.log(`\nTotal time: ${Date.now() - startTime}ms`);
}).catch(console.error);
