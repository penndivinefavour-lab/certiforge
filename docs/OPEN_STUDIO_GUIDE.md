# Open Studio — Standalone Deployment Guide

## Overview

Open Studio is the no-account-required mode of CertiForge. It runs entirely in the browser with no backend dependencies.

## Architecture

```
Browser (Client-Side Only)
        ↓
    IndexedDB
        ↓
    Local Persistence
```

**No server-side processing required.**

## Deployment Options

### Option 1: Netlify (Recommended)

1. Push code to GitHub
2. Connect repository in Netlify
3. Configure:
   - Build command: `pnpm build`
   - Publish directory: `apps/web/.next`
4. Deploy

**No environment variables required.**

### Option 2: Static Hosting

Since Open Studio is a static Next.js app when built:

```bash
# Build for production
pnpm build

# The output in apps/web/.next is self-contained
# Can be served by any static hosting provider
```

Providers:
- Vercel
- GitHub Pages
- Cloudflare Pages
- Firebase Hosting
- Any web server (nginx, Apache)

### Option 3: Self-Hosted

```bash
# Clone repository
git clone https://github.com/penndivinefavour-lab/certiforge.git
cd certiforge

# Install dependencies
pnpm install

# Build
pnpm build

# Serve with any static file server
npx serve apps/web/.next
```

## Features Available in Open Studio

✅ Create projects  
✅ Upload certificate templates (PDF/Image)  
✅ Visual template editor  
✅ Import recipients (CSV)  
✅ Generate certificates  
✅ Download as ZIP  
✅ Verify certificates locally  

## Data Storage

All data is stored in **browser IndexedDB**:
- `certiforge-open-studio` database
- Multiple object stores (projects, templates, recipients, certificates)
- Local to the user's browser
- Survives page reloads
- Cleared on browser data cleanup

**Important:** Data is NOT synchronized across devices. Each browser has its own local storage.

## Limitations

| Feature | Open Studio | Cloud SaaS |
|---------|-------------|------------|
| Account | ❌ Not required | ✅ Required |
| Multi-device sync | ❌ Local only | ✅ Cloud sync |
| Persistent storage | ⚠️ Browser-dependent | ✅ Database |
| Team collaboration | ❌ No | ✅ Yes |
| Organization management | ❌ No | ✅ Yes |
| Audit logging | ❌ No | ✅ Yes |
| Certificate revocation | ⚠️ Local only | ✅ Server-side |

## Verification Semantics

### Local Verification (Open Studio)
- Certificate verification is **local-only**
- QR codes contain verification URLs pointing to your deployment
- Verification works if viewer has same browser/storage
- **Not suitable for public proof of authenticity**

### Public Verification (Cloud SaaS)
- Server-side certificate registry
- Anyone can verify via URL
- Immutable record of issuance
- Suitable for official credentials

## URL Structure

```
/                          → Landing page
/studio                    → Open Studio entry
/studio/projects           → List projects
/studio/projects/[id]      → Project detail
/studio/projects/[id]/editor → Template editor
/studio/projects/[id]/recipients → Recipient management
/studio/projects/[id]/generate → Generate certificates
/studio/verify/[cert]      → Verify certificate (local)
/verify/[cert]             → Public verification (Cloud mode)
```

## Customization

### Change App Name
Edit `apps/web/src/app/studio/page.tsx`:
```tsx
<h1>CERTIFORGE</h1>
<p className="text-xl text-white/60">Your Brand Name</p>
```

### Customize Storage Key
Edit `packages/open-studio/src/db.ts`:
```typescript
const DB_NAME = 'your-brand-open-studio';
```

### Modify Validation Rules
Edit `apps/web/src/lib/recipients.ts` for CSV parsing logic.

## Troubleshooting

### "Cannot open IndexedDB"
- Ensure HTTPS in production (some browsers restrict IndexedDB on HTTP)
- Clear browser cache and retry
- Check browser privacy settings

### Data Loss After Update
- IndexedDB persists across app updates
- Version upgrades handled automatically
- Consider adding export/import feature for backup

### Storage Quota Exceeded
- Most browsers allow 50MB+ for IndexedDB
- Large recipient lists may exceed quota
- Implement pagination or chunking for large datasets

## Performance Notes

- Editor renders best with <500 recipients
- ZIP generation may freeze UI for >100 certificates
- Consider Web Workers for heavy processing
- PDF rendering is CPU-intensive

## Security Considerations

Open Studio data is:
- ✅ Encrypted at rest (browser handles this)
- ✅ Isolated per origin
- ✅ Not accessible to other websites
- ⚠️ Visible to anyone with browser access
- ⚠️ Lost if browser data cleared

**Do not store sensitive personal information in Open Studio.**

Use Cloud SaaS mode for:
- PII processing
- Official credentials
- Audit requirements
- Multi-user scenarios
