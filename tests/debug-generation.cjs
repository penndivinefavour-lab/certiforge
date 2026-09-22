#!/usr/bin/env node
/**
 * CERTIFORGE — DEBUG GENERATION FLOW
 */

const { chromium } = require('playwright');

async function main() {
  console.log('\n=== Debug Generation Flow ===\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Collect console logs
  const logs = [];
  page.on('console', msg => {
    if (msg.type() === 'log') logs.push(`LOG: ${msg.text()}`);
    if (msg.type() === 'error') logs.push(`ERROR: ${msg.text()}`);
  });

  try {
    // Navigate to generate page with existing project
    await page.goto('http://localhost:3002/studio/projects');
    await page.waitForTimeout(2000);
    
    // Get the project ID from the page
    const projectId = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/studio/projects/"]');
      if (links.length > 0) {
        const href = links[0].getAttribute('href');
        return href.match(/\/studio\/projects\/([^/]+)/)[1];
      }
      return null;
    });
    
    console.log(`Found project ID: ${projectId}`);
    
    if (!projectId) {
      console.log('No project found, creating one...');
      // Create new project
      await page.click('button:has-text("New Project")');
      await page.waitForSelector('input[type="text"]');
      await page.fill('input[type="text"]', 'Debug Test');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      
      const newProjectId = page.url().match(/\/studio\/projects\/([^/]+)/)[1];
      console.log(`Created project: ${newProjectId}`);
    }
    
    // Navigate to generate page
    const finalProjectId = projectId || await page.evaluate(() => {
      const match = window.location.href.match(/\/studio\/projects\/([^/]+)/);
      return match ? match[1] : null;
    });
    
    console.log(`Navigating to generate with project: ${finalProjectId}`);
    await page.goto(`http://localhost:3002/studio/projects/${finalProjectId}/generate`);
    await page.waitForTimeout(3000);
    
    // Check current state
    const state = await page.evaluate(() => {
      return {
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 800),
        buttons: Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.innerText.substring(0, 50),
          disabled: b.disabled
        })).filter(b => b.text.includes('Generate') || b.text.includes('Save')),
      };
    });
    
    console.log('\n--- Page State ---');
    console.log(JSON.stringify(state, null, 2));
    
    // Try to find and check all interactive elements
    const interactive = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, [role="button"], .clickable'))
        .map(el => ({
          tag: el.tagName,
          text: el.innerText?.substring(0, 50),
          disabled: el.disabled,
          class: el.className.substring(0, 50)
        }));
    });
    
    console.log('\n--- Interactive Elements ---');
    console.log(JSON.stringify(interactive, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'docs/debug-gen.png', fullPage: false });
    console.log('\n📸 Screenshot: docs/debug-gen.png');
    
    // Check IndexedDB directly
    const dbData = await page.evaluate((projectId) => {
      return new Promise((resolve) => {
        const request = indexedDB.open('certiforge-studio', 2);
        
        request.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(['templates', 'recipients', 'certificates'], 'readonly');
          
          const templates = [];
          const recipients = [];
          const certificates = [];
          
          const templateReq = tx.objectStore('templates').getAll();
          const recipReq = tx.objectStore('recipients').getAll();
          const certReq = tx.objectStore('certificates').getAll();
          
          templateReq.onsuccess = () => templates.push(...(templateReq.result || []));
          recipReq.onsuccess = () => recipients.push(...(recipReq.result || []));
          certReq.onsuccess = () => certificates.push(...(certReq.result || []));
          
          tx.oncomplete = () => {
            resolve({
              templates: templates.filter(t => t.projectId === projectId).length,
              recipients: recipients.filter(r => r.projectId === projectId).length,
              certificates: certificates.filter(c => c.projectId === projectId).length,
              allCertificates: certificates.filter(c => c.projectId === projectId)
            });
          };
          
          tx.onerror = () => resolve({ error: 'Transaction failed' });
          db.close();
        };
        
        request.onerror = () => resolve({ error: 'Open failed' });
      });
    }, finalProjectId);
    
    console.log('\n--- IndexedDB State ---');
    console.log(JSON.stringify(dbData, null, 2));
    
    // Wait and check again for async completion
    console.log('\nWaiting 5 seconds for async operations...');
    await page.waitForTimeout(5000);
    
    const dbDataAfter = await page.evaluate((projectId) => {
      return new Promise((resolve) => {
        const request = indexedDB.open('certiforge-studio', 2);
        
        request.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(['certificates'], 'readonly');
          const certReq = tx.objectStore('certificates').getAll();
          
          certReq.onsuccess = () => {
            const certs = (certReq.result || []).filter(c => c.projectId === projectId);
            resolve({
              count: certs.length,
              certs: certs.map(c => ({ id: c.id, number: c.certificateNumber, recipient: c.recipientName }))
            });
          };
          db.close();
        };
        
        request.onerror = () => resolve({ error: 'Failed' });
      });
    }, finalProjectId);
    
    console.log('\n--- Certificates After Wait ---');
    console.log(JSON.stringify(dbDataAfter, null, 2));
    
    console.log('\n--- Console Logs (last 20) ---');
    console.log(logs.slice(-20).join('\n'));
    
    await page.screenshot({ path: 'docs/debug-gen-after.png', fullPage: false });
    console.log('\n📸 Screenshot: docs/debug-gen-after.png');
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
