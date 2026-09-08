// CertiForge Open Studio Validation Script
const http = require('http');
const { execSync } = require('child_process');

async function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3002' + path, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== PHASE 5.8.1D VALIDATION ===\n');
  
  // Test all critical routes
  const routes = [
    '/',
    '/studio',
    '/studio/projects',
    '/studio/verify/test-001',
  ];
  
  console.log('📄 ROUTE VALIDATION:');
  for (const route of routes) {
    try {
      const resp = await get(route);
      const hasTailwind = resp.body.includes('min-h-screen') || resp.body.includes('bg-background');
      const size = resp.body.length;
      console.log(`  ✓ ${resp.status} ${route.padEnd(25)} ${size}b Tailwind:${hasTailwind ? 'YES' : 'NO'}`);
      
      // Check for loading state or empty state
      if (route === '/studio/projects') {
        if (resp.body.includes('Loading workspace')) {
          console.log('    ⚠ Still showing loading state - check browser console');
        } else if (resp.body.includes('No projects yet')) {
          console.log('    ✓ Shows empty state correctly');
        } else if (resp.body.includes('New Project')) {
          console.log('    ✓ Shows project creation controls');
        }
      }
    } catch (e) {
      console.log(`  ✗ ${route} - ERROR: ${e.message}`);
    }
  }
  
  // Test API endpoints
  console.log('\n🔌 API VALIDATION:');
  const apis = [
    '/api/studio/projects',
    '/api/studio/workspace',
  ];
  
  for (const api of apis) {
    try {
      const resp = await get(api);
      console.log(`  ${resp.status} ${api}`);
      try {
        const json = JSON.parse(resp.body);
        if (json.projects !== undefined) {
          console.log(`     Projects: ${json.projects.length}`);
        } else if (json.workspace) {
          console.log(`     Workspace: Found`);
        } else if (json.error) {
          console.log(`     Error: ${json.error}`);
        }
      } catch {}
    } catch (e) {
      console.log(`  ✗ ${api} - ERROR: ${e.message}`);
    }
  }
  
  // Check CSS
  console.log('\n🎨 CSS VALIDATION:');
  const home = await get('/');
  const cssMatch = home.body.match(/href="([^"]*css[^"]*)"/);
  if (cssMatch) {
    console.log(`  ✓ CSS file referenced: ${cssMatch[1].split('/').pop()}`);
    try {
      const cssResp = await get(cssMatch[1]);
      console.log(`  ✓ CSS loaded: ${cssResp.status} (${cssResp.body.length} bytes)`);
    } catch {}
  }
  
  // Verify key UI elements
  console.log('\n🔍 UI ELEMENTS CHECK:');
  const checks = [
    ['Navigation present', 'nav'],
    ['CertiForge branding', 'CertiForge'],
    ['Sign In link', 'Sign In'],
    ['Start Creating CTA', 'Start Creating'],
    ['Hero section', 'text-5xl'],
    ['Feature cards', 'rounded-xl'],
    ['How It Works section', 'How It Works'],
  ];
  
  for (const [name, text] of checks) {
    const found = home.body.includes(text);
    console.log(`  ${found ? '✓' : '✗'} ${name}: ${found ? 'FOUND' : 'MISSING'}`);
  }
  
  console.log('\n✅ VALIDATION COMPLETE\n');
}

main().catch(console.error);
