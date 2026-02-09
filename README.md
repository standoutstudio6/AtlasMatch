# GitHub Actions Scraper Placeholder (Firestore Sync)

This folder contains the **minimal file structure** needed to run your scraper on a schedule via GitHub Actions.

## What’s included
- `scraper/` — Node.js scraper code + dependencies
- `.github/workflows/scrape.yml` — GitHub Actions schedule (every 20 minutes)
- Firestore write targets:
  - `jobs` collection
  - `metadata/sync` document

## Quick start
1) Copy these files into the **root** of your repo (same level as your app’s `src/`, `package.json`, etc.).  
2) Create a Firebase project + Firestore database (see steps in chat).  
3) Add a GitHub Actions secret named `FIREBASE_SERVICE_ACCOUNT` containing your Firebase service account JSON.  
4) In GitHub → Actions, run **Scheduled Job Scraper** manually once (workflow_dispatch) to test.  
5) Point your frontend to the same Firebase project configuration (firebaseConfig).

## Notes
- If the scraper finds `0` jobs, the website HTML selectors likely changed — update selectors in `scraper/scrape.js`.
- Firestore batches are limited to **500 operations**. This starter already chunks operations to avoid that limit.
