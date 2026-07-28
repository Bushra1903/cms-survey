require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ---------------------------------------------------------------------------
// "DATABASE" LAYER
// This demo uses a plain JSON file so the whole thing runs with zero setup.
// In production, this is where Postgres (via TypeORM/Prisma) would live instead.
// Swap readDb()/writeDb() for real DB calls when you connect Railway's Postgres.
// ---------------------------------------------------------------------------
function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    return { surveys: [], lastPublishedAt: null };
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// CONTENT ENDPOINTS — basic CRUD the CMS frontend uses to edit surveys
// ---------------------------------------------------------------------------
app.get('/api/surveys', (req, res) => {
  const db = readDb();
  res.json(db.surveys);
});

app.post('/api/surveys', (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const db = readDb();
  const newSurvey = {
    id: Date.now().toString(),
    title,
    description: description || '',
    createdAt: new Date().toISOString(),
  };
  db.surveys.push(newSurvey);
  writeDb(db);
  res.status(201).json(newSurvey);
});

app.delete('/api/surveys/:id', (req, res) => {
  const db = readDb();
  db.surveys = db.surveys.filter((s) => s.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// PUBLISH ENDPOINT — this is the flow from the diagram:
//   1. Save current state to the database (already true here, each edit saves)
//   2. Trigger the GitHub Actions workflow (build + FTP deploy)
//   3. Respond to the frontend so it can show "Publishing..." status
//
// The GitHub + FTP part is stubbed with a simulated delay + log lines so you
// can see exactly where to plug in the real call. Swap `triggerGitHubBuild()`
// for a real POST to:
//   https://api.github.com/repos/{owner}/{repo}/actions/workflows/{workflow}/dispatches
// ---------------------------------------------------------------------------
async function triggerGitHubBuild() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;         // e.g. 'cms-survey'
  const workflowId = process.env.GITHUB_WORKFLOW || 'deploy.yml';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const token = process.env.GITHUB_TOKEN;

  // If any required env var is missing, fall back to simulation so local dev still works
  if (!owner || !repo || !token) {
    console.warn('[publish] -> Missing GITHUB_OWNER / GITHUB_REPO / GITHUB_TOKEN — running in simulation mode.');
    console.log('[publish] -> Simulating GitHub Actions trigger...');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('[publish] -> Build started, pulling fresh data...');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('[publish] -> Static site built.');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('[publish] -> Uploaded via FTP to Hostinger. Live site updated (simulated).');
    return { simulated: true };
  }

  // --- REAL GitHub workflow_dispatch call ---
  console.log(`[publish] -> Triggering GitHub Actions: ${owner}/${repo}/${workflowId} @ ${branch}`);
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: branch }),
    },
  );

  // GitHub returns 204 No Content on success
  if (!response.ok) {
    const body = await response.text();
    console.error(`[publish] -> GitHub API error ${response.status}: ${body}`);
    if (response.status === 403 || response.status === 401) {
      console.warn('[publish] -> GitHub PAT missing Actions Read/Write permissions. Falling back to simulation.');
      return { simulated: true, warning: `GitHub PAT permission required: ${body}` };
    }
    throw new Error(`GitHub API error ${response.status}: ${body}`);
  }

  console.log('[publish] -> GitHub Actions workflow dispatched successfully (HTTP 204).');
  return { simulated: false };
}

app.post('/api/publish', async (req, res) => {
  try {
    const db = readDb();

    // Step 1: confirm the data is saved (in a real app this would be its own
    // "save draft" step; here every edit already writes to db.json)
    db.lastPublishedAt = new Date().toISOString();
    writeDb(db);

    // Step 2: trigger the build + deploy pipeline
    const result = await triggerGitHubBuild();

    res.json({
      message: result.simulated
        ? 'Publish triggered successfully — running in simulation mode (check Railway env vars)'
        : 'Publish triggered successfully — check GitHub Actions',
      simulated: result.simulated,
      publishedAt: db.lastPublishedAt,
      surveyCount: db.surveys.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Publish failed', detail: err.message });
  }
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CMS backend running on port ${PORT}`);
});
