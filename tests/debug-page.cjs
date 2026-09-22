#!/usr/bin/env node
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '../docs/debug-screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    console.log(`PAGE ERROR: ${err.message}`);
    consoleErrors.push(err.message);
  });

  console.log('Navigating to /studio/projects...');
  await page.goto('http://localhost:3002/studio/projects', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'debug-projects.png'), fullPage: true });
  console.log('Screenshot saved');
  
  // Check page content
  const title = await page.title();
  console.log(`Title: ${title}`);
  
  const bodyText = await page.locator('body').textContent().catch(() => 'error');
  console.log(`Body text (first 500 chars): ${bodyText.substring(0, 500)}`);
  
  // Check for buttons
  const newProjectBtn = page.locator('button:has-text("New Project"), button:has-text("Create Project")');
  const btnCount = await newProjectBtn.count();
  console.log(`Found ${btnCount} "New Project" buttons`);
  
  // Check what's on the page
  const allButtons = await page.locator('button').count();
  console.log(`Total buttons on page: ${allButtons}`);
  
  // Get all visible text
  const allText = await page.evaluate(() => document.body.innerText);
  console.log(`Page text:\n${allText.substring(0, 1000)}`);
  
  await browser.close();
}

main().catch(console.error);
