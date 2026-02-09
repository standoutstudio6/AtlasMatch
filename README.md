# AtlasMatch GitHub Actions Scraper (Option B)

This package includes **all files needed** for Option B (including `scraper/package-lock.json`)
so GitHub Actions can cache dependencies successfully.

## Where to put these files
Unzip into the **root** of your repo so you have:

- `scraper/` (Node scraper)
- `.github/workflows/scrape.yml` (scheduled workflow)

## Required GitHub Secret
Create a repo secret named:

- `FIREBASE_SERVICE_ACCOUNT` = paste the full Firebase service-account JSON

## Firestore targets
- Collection: `jobs`
- Document: `metadata/sync`

## Run test
GitHub → Actions → "Scheduled Job Scraper" → Run workflow
