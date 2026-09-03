@echo off
cd /d "C:\Users\USER\certiforge\apps\web"
set DATABASE_URL=postgresql://certiforge:certiforge123@localhost:5432/certiforge
set SESSION_SECRET=secret123
node node_modules/next/dist/bin/next dev --port 3000