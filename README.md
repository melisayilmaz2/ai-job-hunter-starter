# AI Job Hunter — Foundation 0.7

**Local development release.** The user-supplied V0.6 application is preserved, with a separated job-feed engine and new search/import functionality.

## What works
- FastAPI / SQLite profiles, experience, projects and saved job records (existing database format unchanged).
- Local opt-in scheduled job discovery (6/12/24 hours, only while backend process is running).
- Read-only public job feeds: Remotive, Arbeitnow (up to 3 pages), Jobicy (up to 2 cursor pages).
- Optional company boards: Greenhouse / Lever configured locally in `backend/company_boards.json`.
- Role synonyms and *informational* country classifications with filters.
- Manual job link + full description import (e.g. LinkedIn URL without scraping or site login).
- Existing local CV drafts, OpenAI API-based CV, CV templates, editing and print-to-PDF design preserved.
- Per-source diagnostics and automated offline Python tests.

## What does NOT work yet
- No full LinkedIn/Kariyer.net scraping; users can manually import links or use platform job-alert workflows later.
- No automatic application submission, no real ATS authorization check, no guaranteed Turkey work eligibility.
- No user authentication / secure multi-tenant SaaS; **DO NOT deploy this backend to the public Internet**.
- No cloud scheduler; background scan stops when Python backend stops.
- No AI job-fit ranking or automatic paid AI batch generation in this release.

## Install into your EXISTING project (do not delete your project)

1. Save working files in VS Code. Stop the backend with Ctrl+C.
2. Back up the existing local personal-data database **before** upgrading, if present:
   ```bash
   cd ~/Desktop/ai-job-hunter-starter
   mkdir -p ~/Desktop/ai-job-hunter-backup
   cp -n backend/ai_job_hunter.sqlite3 ~/Desktop/ai-job-hunter-backup/ 2>/dev/null || true
   ```
   Never post database files, or `.env`, in chat or GitHub.
3. Back up your code files (you can also use Git):
   ```bash
   cp backend/main.py ~/Desktop/ai-job-hunter-backup/main.py
   cp frontend/src/main.jsx ~/Desktop/ai-job-hunter-backup/main.jsx
   ```
4. Unzip the Foundation update at the root of `ai-job-hunter-starter`:
   ```bash
   unzip -o ~/Downloads/ai-job-hunter-foundation-v0.7-update.zip -d .
   ```
   This ZIP does **not** contain `.env` or `.sqlite3` files, and will not overwrite them.
5. Backend (one terminal):
   ```bash
   cd backend
   source .venv/bin/activate
   python -m pip install -r requirements.txt
   python -m uvicorn main:app --reload
   ```
6. Frontend (another terminal, from the root of the project):
   ```bash
   cd ~/Desktop/ai-job-hunter-starter/frontend
   npm install
   npm run dev
   ```
7. Visit `http://127.0.0.1:8000/api/health` (version `0.7.0`) and `http://localhost:5173`.

## First smoke test
- In **İlan Ara**, put `Graphic Designer`, clear `Konum`, choose `Tüm bölgeler` and check Remote.
- Verify that the per-source counters show data and that location badges are visible. Result counts may be 0 depending on the live feeds, and `warnings` will explain source failures.
- In **Kaydedilenler**, paste a LinkedIn job link, title, company and copied job description; save it. In **CV Studio**, select that saved job and confirm its description appears.
- Under **Otomatik Bulunanlar**, make a manual scan; a second scan should save no duplicate jobs.

## Optional company career sources
Copy `backend/company_boards.example.json` to `backend/company_boards.json`, replace tokens with **actual known** public boards / Lever site slugs. Don't keep the placeholders. Changes are detected by refreshing the backend / restarting the server. The user-supplied board list is never used as an arbitrary URL: only the two documented API hostnames are accessed.

## Quality checks
```bash
python -m unittest discover -s tests -v
```
Run these from the repository root, using a Python environment with `backend/requirements.txt` installed.

## Secrets and backups
- `.env` stays local and must not be committed.
- The SQLite database remains at `backend/ai_job_hunter.sqlite3` and is also local.
- `.gitignore` protects both; check `git status` before pushing.
- In the future, a multiuser cloud app needs authentication, authorization, encrypted secrets, background worker separation, data export/deletion policy and rate limiting.
