# Open Studio

CertiForge can now be used **without creating an account**.

## Two Modes of Operation

### 1. Open Studio (No Account Required)

**What works:**
- ✅ Create projects
- ✅ Upload and edit certificate templates
- ✅ Import recipients from CSV
- ✅ Generate PDF certificates
- ✅ Download certificates
- ✅ Verify certificates (locally)

**What's stored:**
- All data is stored **locally in your browser** using IndexedDB
- No data is sent to any server
- No account, no email, no password required

**Limitations:**
- ⚠️ Certificates are only verifiable in the same browser
- ⚠️ If you clear browser data, certificates are lost
- ⚠️ No revocation support
- ⚠️ No cloud backup

### 2. Account Workspace (Future)

**What's preserved:**
- All authentication code is intact
- Organization management works
- Persistent database storage
- Cross-device verification
- Certificate revocation
- Audit logging

**Coming soon:**
- Save Open Studio projects to your account
- Cloud backup and sync
- Collaborative editing

## Getting Started

### Open Studio (Recommended for MVP)

1. Go to the homepage
2. Click **"Start Creating — No Account Required"**
3. Create a project
4. Upload a template
5. Import recipients
6. Generate certificates

### With Account (Future)

1. Sign up for an account
2. Create an organization
3. Create a project
4. All features available with persistent storage

## Migration Path

When Account Mode is ready:

1. Create project in Open Studio
2. Sign up / Sign in
3. Click "Save to Account"
4. Your workspace is migrated to cloud storage
5. Access from any device
6. Full verification and revocation available

## Privacy

**Open Studio is 100% private:**
- No data leaves your browser
- No analytics collected
- No tracking
- No servers involved

**Account Workspace will include:**
- Data stored on servers
- Potential analytics (opt-out available)
- Cloud backup

## Technical Details

### Open Studio Storage
- **Database**: IndexedDB (`certiforge-open-studio`)
- **Stores**: workspaces, projects, templates, recipients, certificates
- **Auto-save**: Yes
- **Export**: Coming soon

### Authenticated Storage
- **Database**: PostgreSQL
- **Tables**: projects, templates, recipients, certificates, etc.
- **Backup**: Yes (database backups)
- **Sync**: Coming soon
