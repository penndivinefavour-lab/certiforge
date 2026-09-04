# CertiForge Deployment Guide

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 10.12.0+
- PostgreSQL 14+
- Git

### Step 1: Clone and Install

```bash
git clone https://github.com/penndivinefavour-lab/certiforge.git
cd certiforge
pnpm install
```

### Step 2: Setup Database

```bash
# Create database user and database
psql -U postgres -c "CREATE USER certiforge WITH PASSWORD 'your_secure_password';"
psql -U postgres -c "CREATE DATABASE certiforge OWNER certiforge;"
```

### Step 3: Configure Environment

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:
```env
DATABASE_URL=postgresql://certiforge:your_secure_password@localhost:5432/certiforge
SESSION_SECRET=your-secure-random-string-minimum-32-chars
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### Step 4: Initialize Database

```bash
cd apps/web
npx prisma db push
npx prisma db seed
```

### Step 5: Run Development Server

```bash
cd ../..
pnpm dev
```

Open http://localhost:3002

## Netlify Deployment

### Prerequisites

- GitHub repository
- Production PostgreSQL database
- Netlify account

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Prepare for Netlify deployment"
git push origin master
```

### Step 2: Connect to Netlify

1. Log in to Netlify dashboard
2. Click "Add new site" → "Import an existing project"
3. Select GitHub and authorize
4. Choose the `certiforge` repository

### Step 3: Configure Build

| Setting | Value |
|---------|-------|
| Build command | `pnpm build` |
| Publish directory | `apps/web/.next` |
| Base directory | (leave empty) |

### Step 4: Add Environment Variables

| Variable | Value |
|----------|-------|
| DATABASE_URL | Your production PostgreSQL connection string |
| SESSION_SECRET | Secure random string (32+ chars) |
| NEXT_PUBLIC_APP_URL | Your Netlify domain |

### Step 5: Deploy

Click "Deploy site"

## Production Database Options

### Supabase (Recommended)

1. Create account at supabase.com
2. Create new project
3. Copy connection string from Settings → Database
4. Set `DATABASE_URL` in Netlify

### Railway

1. Create account at railway.app
2. Deploy PostgreSQL template
3. Copy connection string
4. Set `DATABASE_URL` in Netlify

### PlanetScale

1. Create account at planetscale.com
2. Create database
3. Note: Requires Prisma MySQL adapter (not currently configured)

## Troubleshooting

### Build Fails

- Ensure `DATABASE_URL` is set in Netlify
- Check that all dependencies are in `package.json`
- Review build logs in Netlify dashboard

### Database Connection Errors

- Verify connection string format
- Ensure database allows connections from Netlify IPs
- Check firewall rules

### Environment Variables Not Working

- Restart deployment after adding variables
- Verify variable names match exactly
- Check for trailing whitespace
