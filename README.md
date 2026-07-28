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

## Going from this demo to your real production stack
This is deliberately simplified so it runs with zero setup. To turn it into
your real Next.js + NestJS + Railway + Hostinger setup:

| This demo | Your production version |
|---|---|
| `db.json` file | PostgreSQL on Railway, via TypeORM/Prisma |
| Plain Express | NestJS |
| Plain React + Vite | Next.js (with `output: 'export'`) |
| `triggerGitHubBuild()` stub | Real call to GitHub's `workflow_dispatch` API |
| (nothing) | GitHub Actions workflow that builds + FTPs to Hostinger |

The `server.js` file has the real GitHub API call written out and commented,
right where the stub currently is — uncomment and fill in your repo details
and token to make it live.
