#!/usr/bin/env node
/**
 * CERTIFORGE — CLEAR INDEXEDDB AND REVALIDATE
 */

const { chromium } = require('playwright');

async function main() {
  console.log('\n=== Clearing IndexedDB ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Clear IndexedDB
  await page.goto('http://localhost:3002');
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const request = indexedDB.deleteDatabase('certiforge-studio');
      request.onsuccess = () => resolve('Deleted');
      request.onerror = () => resolve('Failed to delete');
      request.onblocked = () => resolve('Blocked');
    });
  });

  console.log('IndexedDB cleared');
  await browser.close();
  console.log('\nPlease refresh your browser and run validation again.\n');
}

main().catch(console.error);
