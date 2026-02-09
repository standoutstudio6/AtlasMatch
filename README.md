# AtlasMatch GitHub Actions Scraper (Option B + Robust npm)

Includes `scraper/package-lock.json` (Option B) and a robust install step to work around
occasional runner npm crashes like:

> npm error Exit handler never called!

## Install
Unzip into your repo root so these paths exist:
- `scraper/`
- `.github/workflows/scrape.yml`

## GitHub secret required
- `FIREBASE_SERVICE_ACCOUNT` (paste the full Firebase service-account JSON)

## Firestore writes
- `jobs` collection
- `metadata/sync` doc
