#!/usr/bin/env node
const { chromium } = require('playwright');

async function main() {
  console.log('\n=== Debug Projects Page ===\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3002/studio/projects');
  await page.waitForTimeout(3000);
  
  // Check for New Project button
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText.substring(0, 50),
      visible: b.offsetParent !== null,
      disabled: b.disabled
    }));
  });
  
  console.log('Buttons found:', JSON.stringify(buttons, null, 2));
  
  // Take screenshot
  await page.screenshot({ path: 'docs/debug-projects.png', fullPage: false });
  console.log('\n📸 Screenshot: docs/debug-projects.png');
  
  await browser.close();
}

main().catch(console.error);
