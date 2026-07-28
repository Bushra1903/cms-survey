# Survey CMS — Publish Flow Demo

A small working app that demonstrates the flow we discussed:

```
React frontend (edit + Publish button)
        │
        ▼
Node.js/Express backend
        │
        ├── Saves data (db.json here — swap for Postgres in production)
        └── Triggers the build + deploy pipeline (stubbed here — swap for
            the real GitHub Actions dispatch + FTP-to-Hostinger call)
```

## Folder structure
```
cms-demo/
  backend/     Node.js + Express API (port 4000)
  frontend/    React + Vite app (port 5173)
```

## How to run it

**1. Start the backend**
```bash
cd backend
npm install
npm start
```
This runs on http://localhost:4000. Watch this terminal — it prints each
step of the publish pipeline as it "runs" (saving, triggering, building,
deploying).

**2. Start the frontend** (in a second terminal)
```bash
cd frontend
npm install
npm run dev
```
This runs on http://localhost:5173 — open that in your browser.

## What you can do
- Add a survey (title + description) — it's saved immediately via the API
- Delete a survey
- Click **Publish** — this calls `/api/publish` on the backend, which:
  1. Marks the data as saved
  2. Simulates triggering GitHub Actions (with a short delay, just like a
     real build would take)
  3. Simulates the FTP deploy to Hostinger
  4. Reports back success, shown as a live step-by-step tracker in the UI

## Configuration & Deployment Setup

### 1. Configure Railway (or Backend Server) Environment Variables
Set these variables in Railway (or in `backend/.env`):
```env
GITHUB_OWNER=your-github-username
GITHUB_REPO=cms-survey
GITHUB_WORKFLOW=deploy.yml
GITHUB_BRANCH=main
GITHUB_TOKEN=ghp_your_github_personal_access_token
```

### 2. Configure GitHub Secrets for Hostinger FTP
In your GitHub Repository → **Settings** → **Secrets and variables** → **Actions**, add:
- `FTP_SERVER`: `ftp.yourdomain.com` (or your Hostinger IP address)
- `FTP_USERNAME`: `your-ftp-username`
- `FTP_PASSWORD`: `your-ftp-password`
- `FTP_SERVER_DIR`: `/public_html/`
- `VITE_API_URL`: `https://honest-strength-production-e0ed.up.railway.app`

### 3. Complete Architecture Flow
```
Frontend (CMS UI)
   │  (User clicks 'Publish')
   ▼
POST /api/publish (Express Backend / Railway)
   │
   ├── 1. Update Database (Postgres / db.json)
   └── 2. Trigger GitHub Actions (POST https://api.github.com/repos/.../dispatches)
          │
          ▼
   GitHub Actions Workflow (.github/workflows/deploy.yml)
          │
          ├── 1. Checkout repository & setup Node.js
          ├── 2. Run `npm run build` (generates static html/js/css in dist/)
          └── 3. Deploy via FTP (SamKirsch/ftp-deploy-action) ──► Hostinger (public_html)
                                                                     │
                                                                     ▼
                                                          Live Site Updated
```

