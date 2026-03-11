# Frontend (Lesson 5) — Quick Start

This small Vite + React app is a lesson scaffold for Project CRUD and boards.

Run locally:

```powershell
cd frontend\web
npm install
# set env vars (PowerShell example):
$env:VITE_ORG_ID = "your-org-id"
$env:VITE_API_BASE = "http://localhost:3000"
npm run dev
```

Notes:
- `VITE_ORG_ID` is used by the sample page to fetch projects for a single org.
- `VITE_API_BASE` points to the backend (default: `http://localhost:3000`).
- The client uses `credentials: 'include'` so authenticate against the backend
  in your browser (or adapt the API client to include tokens).
