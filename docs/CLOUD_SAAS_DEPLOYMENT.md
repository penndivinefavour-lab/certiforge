# Cloud SaaS Deployment Guide

## Overview

Cloud SaaS mode provides full authentication, organization management, persistent storage, and public certificate verification.

## Requirements

### Infrastructure

1. **PostgreSQL Database** (required)
   - Free tier options: Supabase, Neon, Railway
   - Minimum: PostgreSQL 14+
   - Estimated cost: $0-20/month for small deployments

2. **Web Host** (recommended)
   - Netlify (free tier available)
   - Vercel (free tier available)
   - Any Node.js hosting

3. **Domain** (optional)
   - For custom verification URLs
   - For professional branding

### Environment Variables

Create `.env.local` (development) or configure in hosting dashboard (production):

```env
# Required
DATABASE_URL=postgresql://user:password@host:5432/certiforge
SESSION_SECRET=your-random-32-character-minimum-secret-here

# Optional but recommended
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_VERIFICATION_BASE_URL=https://verify.yourdomain.com
```

## Database Setup

### Step 1: Create Database

Using psql:

```sql
CREATE DATABASE certiforge;
CREATE USER certiforge WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE certiforge TO certiforge;
```

### Step 2: Run Migrations

The schema is defined in `apps/web/prisma/schema.prisma`. Even though we use raw queries, the schema file serves as documentation.

To apply the schema:

```bash
cd apps/web
psql $DATABASE_URL -f prisma/schema.sql
```

Or manually create tables using the schema definition.

### Step 3: Verify Connection

Test your database connection:

```bash
# Using the app's db check endpoint (if implemented)
curl http://localhost:3000/api/health
```

## Deployment

### Netlify Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin master
   ```

2. **Connect to Netlify**
   - Go to netlify.com
   - "Add new site" → "Import an existing project"
   - Select your GitHub repository

3. **Configure Build Settings**
   ```
   Base directory: Leave empty
   Build command: pnpm build
   Publish directory: apps/web/.next
   ```

4. **Add Environment Variables**
   ```
   DATABASE_URL: postgresql://...
   SESSION_SECRET: your-secret-here
   NEXT_PUBLIC_APP_URL: https://your-site.netlify.app
   ```

5. **Deploy**
   Click "Deploy site"

### Vercel Deployment

Similar to Netlify, but:
- Build command: `pnpm build`
- Output directory: `apps/web/.next`
- Install `vercel` CLI: `npm i -g vercel`
- Deploy: `vercel --prod`

### Manual Deployment

```bash
# Clone and install
git clone https://github.com/penndivinefavour-lab/certiforge.git
cd certiforge
pnpm install

# Configure environment
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your values

# Build
pnpm build

# Start production server
cd apps/web
NODE_ENV=production node .next/standalone/apps/web/server.js
```

## Verification Domain Setup

For professional certificate verification:

1. **Get a domain** (e.g., `certiforge.yourorg.com`)
2. **Configure DNS** to point to your hosting
3. **Update env vars:**
   ```
   NEXT_PUBLIC_APP_URL=https://certiforge.yourorg.com
   NEXT_PUBLIC_VERIFICATION_BASE_URL=https://verify.yourorg.com
   ```
4. **Update SSL certificate** (automatic with most hosts)

## Security Hardening

### After Deployment

1. **Change default secrets**
   - SESSION_SECRET should be unique and secure
   - Use `openssl rand -hex 32` to generate

2. **Enable HTTPS**
   - All modern hosts provide free TLS
   - Enforce HTTPS in production

3. **Set up monitoring**
   - Error tracking (Sentry, etc.)
   - Uptime monitoring
   - Database connection monitoring

4. **Configure backups**
   - Daily database backups
   - Point-in-time recovery

## Scaling Considerations

### Current Limitations

- Single PostgreSQL instance
- No caching layer
- No CDN for static assets
- ZIP generation blocks event loop

### Optimization Opportunities

1. **Database indexing**
   ```sql
   CREATE INDEX idx_certificates_verification_token ON certificates(verificationToken);
   CREATE INDEX idx_certificates_certificate_number ON certificates(certificateNumber);
   CREATE INDEX idx_sessions_token ON sessions(token);
   ```

2. **Connection pooling**
   - Use PgBouncer or similar for high traffic
   - Configure pool size in DATABASE_URL

3. **Static asset CDN**
   - Upload templates to object storage
   - Use CloudFront/Cloudflare for delivery

## Troubleshooting

### "Database connection failed"
- Verify DATABASE_URL format
- Check database is reachable from host
- Ensure SSL is configured if required

### "Session expired immediately"
- Verify SESSION_SECRET is set
- Check cookieSameSite configuration
- Ensure HTTPS is enabled in production

### "404 on verification page"
- Verify NEXT_PUBLIC_APP_URL is correct
- Check routing configuration
- Ensure dynamic routes are built

### Slow certificate generation
- Check database connection quality
- Monitor memory usage
- Consider chunking large batches

## Monitoring & Maintenance

### Logs to Watch
- Database connection errors
- Session validation failures
- Certificate generation failures
- Import validation errors

### Regular Tasks
- Rotate SESSION_SECRET annually
- Update Node.js and dependencies
- Backup database regularly
- Review user feedback for issues

## Cost Estimates

### Free Tier (Small Scale)
- **Netlify**: Free for personal use
- **Supabase**: Free tier (500MB database)
- **Neon**: Free tier (0.5GB database)
- **Total**: $0/month for <100 users

### Paid Tier (Production)
- **Hosting**: $20-50/month
- **Database**: $15-30/month
- **Custom domain**: $12/year
- **Total**: ~$50-100/month for 1000+ users

## Support

For issues:
1. Check this guide first
2. Review application logs
3. Verify environment configuration
4. Test database connectivity
5. Contact support if unresolved
