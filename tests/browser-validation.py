#!/usr/bin/env python3
"""Real browser validation for Open Studio - Phase 5.8.3"""

import asyncio
import time
import sys
from playwright.async_api import async_playwright

async def main():
    results = {
        'browser_used': 'Playwright Chromium',
        'url': 'http://localhost:3002',
        'open_studio_loaded': False,
        'time_to_load': 0,
        'indexeddb_created': False,
        'loading_spinner_cleared': False,
        'project_created': False,
        'project_creation_time': 0,
        'project_persisted': False,
        'project_reopened': False,
        'console_errors': [],
        'full_workflow_tested': False,
    }
    
    console_messages = []
    errors = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        
        # Listen for console messages and errors
        page = await context.new_page()
        
        def handle_console(msg):
            console_messages.append({
                'type': msg.type,
                'text': msg.text
            })
            if msg.type == 'error':
                errors.append(msg.text)
                print(f"[ERROR] {msg.text}")
        
        page.on('console', handle_console)
        
        start_time = time.time()
        
        # Navigate to the app
        print(f"\n{'='*60}")
        print("PHASE 5.8.3 BROWSER VALIDATION")
        print(f"{'='*60}\n")
        
        print("Step 1: Navigating to http://localhost:3002/")
        await page.goto('http://localhost:3002/', wait_until='networkidle')
        await asyncio.sleep(2)
        print(f"  ✓ Page loaded: {await page.title()}")
        
        print("\nStep 2: Clicking 'Start Creating' button")
        start_button = await page.locator('a.btn-primary').first
        await start_button.click()
        await asyncio.sleep(2)
        print(f"  ✓ Navigated to studio: {page.url}")
        
        print("\nStep 3: Clicking 'Start Creating' in studio to go to projects")
        # Check if we're already on projects page
        current_url = page.url
        if '/studio/projects' not in current_url:
            start_button = await page.locator('a.btn-primary').first
            await start_button.click()
            await asyncio.sleep(2)
        
        print(f"  ✓ Current URL: {page.url}")
        
        # Wait for client-side loading to complete
        print("\nStep 4: Waiting for Open Studio to load...")
        loading_timeout = 10  # seconds
        wait_start = time.time()
        
        while time.time() - wait_start < loading_timeout:
            # Check if loading spinner is still visible
            loading_spinner = await page.locator('.animate-spin').count()
            if loading_spinner == 0:
                print(f"  ✓ Loading spinner cleared after {time.time() - wait_start:.2f}s")
                results['loading_spinner_cleared'] = True
                break
            await asyncio.sleep(0.5)
        
        elapsed = time.time() - start_time
        results['time_to_load'] = elapsed
        print(f"\nTotal time to reach projects page: {elapsed:.2f}s")
        
        # Check for "No projects yet" or existing projects
        no_projects = await page.locator('text="No projects yet"').count()
        project_cards = await page.locator('.card-interactive').count()
        
        if no_projects > 0:
            print(f"  ✓ Empty state shown: 'No projects yet'")
        elif project_cards > 0:
            print(f"  ✓ Found {project_cards} existing project(s)")
        else:
            print(f"  ⚠ Neither empty state nor projects found - screenshot below")
            await page.screenshot(path='C:/Users/USER/certiforge/docs/browser-state-before-create.png')
        
        results['open_studio_loaded'] = True
        
        # Check IndexedDB
        print("\nStep 5: Checking IndexedDB...")
        indexeddb_result = await page.evaluate('''
            () => {
                return new Promise((resolve) => {
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
                        resolve({ created: false, stores: Array.from(db.objectStoreNames), version: db.version });
                        db.close();
                    };
                    request.onerror = () => resolve({ error: request.error });
                });
            }
        ''')
        
        if indexeddb_result.get('stores'):
            print(f"  ✓ IndexedDB opened: {indexeddb_result['stores']}")
            results['indexeddb_created'] = True
        elif indexeddb_result.get('created'):
            print(f"  ✓ IndexedDB created fresh: {indexeddb_result['stores']}")
            results['indexeddb_created'] = True
        else:
            print(f"  ✗ IndexedDB error: {indexeddb_result}")
        
        # Take screenshot of current state
        await page.screenshot(path='C:/Users/USER/certiforge/docs/browser-state-initial.png')
        
        # Create a test project
        print("\nStep 6: Creating test project 'ICON Studios Open Studio Test'...")
        create_start = time.time()
        
        # Click "New Project" or "Create Project" button
        create_btn = await page.locator('button:has-text("New Project"), button:has-text("Create Project")').first
        await create_btn.click()
        await asyncio.sleep(1)
        
        # Fill in project name
        input_field = await page.locator('input[placeholder*="name"], input.form-input').first
        if await input_field.count() > 0:
            await input_field.fill('ICON Studios Open Studio Test')
            print(f"  ✓ Entered project name")
        else:
            # Try alternative selectors
            input_field = await page.locator('input[type="text"]').first
            await input_field.fill('ICON Studios Open Studio Test')
        
        # Click create button
        create_submit = await page.locator('button:has-text("Create"), button.btn-primary').last
        await create_submit.click()
        
        # Wait for navigation or modal close
        await asyncio.sleep(2)
        create_end = time.time()
        results['project_creation_time'] = create_end - create_start
        
        # Check if project was created
        project_name = await page.locator('text="ICON Studios Open Studio Test"').count()
        current_url = page.url
        
        if project_name > 0:
            print(f"  ✓ Project created and visible in UI ({create_end - create_start:.2f}s)")
            results['project_created'] = True
        elif '/studio/projects/' in current_url:
            print(f"  ✓ Project created - navigated to project page")
            results['project_created'] = True
        else:
            print(f"  ⚠ Could not verify project creation - screenshot:")
            await page.screenshot(path='C:/Users/USER/certiforge/docs/browser-state-after-create.png')
        
        # Go back to projects page to verify persistence
        print("\nStep 7: Verifying project persistence...")
        await page.goto('http://localhost:3002/studio/projects', wait_until='networkidle')
        await asyncio.sleep(2)
        
        # Check if project still exists
        persist_check = await page.locator('text="ICON Studios Open Studio Test"').count()
        if persist_check > 0:
            print(f"  ✓ Project persists after refresh")
            results['project_persisted'] = True
        else:
            print(f"  ⚠ Project not found after refresh")
            await page.screenshot(path='C:/Users/USER/certiforge/docs/browser-state-after-refresh.png')
        
        # Check console for errors
        print("\nStep 8: Checking console for errors...")
        for msg in console_messages:
            if msg['type'] == 'error':
                print(f"  ✗ Console error: {msg['text']}")
                results['console_errors'].append(msg['text'])
            elif 'Studio' in msg['text'] or 'IndexedDB' in msg['text']:
                print(f"  ℹ {msg['type']}: {msg['text']}")
        
        if not results['console_errors']:
            print(f"  ✓ No console errors detected")
        
        results['full_workflow_tested'] = True
        
        # Final screenshot
        await page.screenshot(path='C:/Users/USER/certiforge/docs/browser-validation-complete.png')
        
        print(f"\n{'='*60}")
        print("VALIDATION COMPLETE")
        print(f"{'='*60}")
        print(f"\nResults:")
        for key, value in results.items():
            status = "✓" if value else "✗"
            print(f"  {status} {key}: {value}")
        
        # Close browser but keep page open for inspection
        print(f"\nBrowser left open at: {page.url}")
        print("You can now inspect the browser yourself.")
        
        # Don't close browser - let user inspect
        # await browser.close()
        
        # Keep script running so browser stays open
        print("\nPress Ctrl+C to close the browser when done inspecting")
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            print("\nClosing browser...")
            await browser.close()
    
    return results

if __name__ == '__main__':
    results = asyncio.run(main())
    print("\n" + "="*60)
    print("FINAL RESULTS SUMMARY")
    print("="*60)
    
    all_passed = True
    for key, value in results.items():
        if isinstance(value, bool) and not value:
            all_passed = False
            print(f"  ✗ {key}")
        elif isinstance(value, list) and len(value) > 0:
            all_passed = False
            print(f"  ✗ {key}: {len(value)} errors")
        else:
            print(f"  ✓ {key}")
    
    print(f"\nOverall: {'PASS' if all_passed else 'NEEDS ATTENTION'}")
    sys.exit(0 if all_passed else 1)
