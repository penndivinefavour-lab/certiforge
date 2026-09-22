# Next.js Build Cache Recovery

## Problem

Build cache corruption causes cryptic errors like:
- `Cannot find module './7749.js'`
- Server returns 500 Internal Server Error
- Stale content persists after code changes

## Symptoms

```bash
# Server starts but returns 500
curl http://localhost:3002/studio/projects
# Output: Internal Server Error

# Check for missing chunk references
grep -r "7749" .next/server/app/ --include="*.js" | head -3

# Verify chunk files exist
ls .next/server/chunks/ | grep "7749"
```

## Root Cause

Next.js 15+ uses dynamic chunk loading. When:
1. Source code changes between builds
2. Build manifest references chunks that don't exist
3. `.next` cache contains stale references

The dev server fails to load required chunks at runtime.

## Fix: Complete Cache Purge

```bash
# 1. Kill all node processes
pkill -9 -f node 2>/dev/null
sleep 2

# 2. Delete .next cache completely
rm -rf apps/web/.next
rm -rf apps/web/node_modules/.cache

# 3. Clean rebuild
node "C:/Users/USER/AppData/Roaming/npm/node_modules/pnpm/bin/pnpm.cjs" --filter web build

# 4. Start fresh dev server
cd apps/web && node node_modules/.bin/next dev --port 3002
```

## Prevention

Always clear cache when:
- Upgrading Next.js version
- Changing routing structure
- Adding/removing page components
- After package updates that affect bundling

## Verification Steps

After purge:

```bash
# 1. Verify build succeeds
pnpm --filter web build 2>&1 | grep -E "(Compiled|error)"

# 2. Check server responds
curl -s http://localhost:3002/studio | grep -o '<title>[^<]*</title>'

# 3. Verify page loads
curl -s http://localhost:3002/studio/projects | grep -o 'animate-spin\|Loading'
```

## Production vs Dev Server

**Dev server** (`next dev`):
- Hot reload enabled
- Faster startup
- Shows compilation errors in terminal
- Best for development

**Production server** (`next start`):
- Requires build first
- No hot reload
- Serves static pre-rendered pages
- Better performance
- Use after successful build

```bash
# Production workflow
pnpm --filter web build && node node_modules/.bin/next start -p 3002

# Dev workflow  
pnpm --filter web dev --port 3002
```

## Common Errors

### Error: "Cannot find module './XXXX.js'"
**Cause**: Build manifest references chunk that doesn't exist  
**Fix**: `rm -rf .next && pnpm --filter web build`

### Error: "Static page generation failed"
**Cause**: TypeScript error in page component  
**Fix**: Run `pnpm --filter web typecheck` to identify

### Error: "ENOENT: no such file or directory"
**Cause**: Missing dependency or corrupted node_modules  
**Fix**: `pnpm install && rm -rf .next && pnpm --filter web build`
