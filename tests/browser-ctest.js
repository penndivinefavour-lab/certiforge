const { chromium } = require('playwright');

async function main() {
    console.log('Launching browser...');
    
    // Try to connect to existing Chrome instance with CDP
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const page = await context.pages()[0] || await context.newPage();
    
    console.log('Browser connected!');
    console.log('Page URL:', await page.url());
    console.log('Page title:', await page.title());
    
    // Check for errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error('CONSOLE ERROR:', msg.text());
        }
    });
    
    // Screenshot
    await page.screenshot({ path: '/tmp/browser-test.png', fullPage: true });
    console.log('Screenshot saved: /tmp/browser-test.png');
    
    await browser.close();
}

main().catch(console.error);
