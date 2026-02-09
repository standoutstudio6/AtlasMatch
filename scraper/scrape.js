// scraper/scrape.js (Runs in GitHub Actions)
// - Scrapes the AtlasJobs OnTempWorks board
// - Writes job docs to Firestore collection: `jobs`
// - Updates Firestore doc: `metadata/sync` (used by your frontend UI)

const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

/**
 * REQUIRED ENV VARS (set in GitHub repo secrets / workflow env):
 * - FIREBASE_SERVICE_ACCOUNT: JSON string of your Firebase service-account key file
 *
 * OPTIONAL ENV VARS:
 * - SCRAPE_URL: override the default AtlasJobs search URL
 * - JOBS_COLLECTION: default "jobs"
 * - METADATA_DOC_PATH: default "metadata/sync"
 */

const SCRAPE_URL = process.env.SCRAPE_URL
  || 'https://jobboard.ontempworks.com/AtlasJobs/Jobs/Search?Keywords=&Location=&Distance=Twentyfive&SortBy=Date';

const JOBS_COLLECTION = process.env.JOBS_COLLECTION || 'jobs';
const METADATA_DOC_PATH = process.env.METADATA_DOC_PATH || 'metadata/sync';

// 1) Initialize Firebase Admin with Service Account from env var
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT env var. Add it as a GitHub Actions secret.');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
  console.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON. Paste the full service account JSON into the GitHub secret.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Firestore batch limit is 500 operations. Use a conservative chunk size.
const BATCH_CHUNK = 450;

async function deleteCollectionInBatches(collectionPath) {
  const colRef = db.collection(collectionPath);
  while (true) {
    const snap = await colRef.limit(BATCH_CHUNK).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    await new Promise(r => setTimeout(r, 200));
  }
}

async function writeJobsInBatches(collectionPath, jobs) {
  let written = 0;
  for (let i = 0; i < jobs.length; i += BATCH_CHUNK) {
    const batch = db.batch();
    const chunk = jobs.slice(i, i + BATCH_CHUNK);
    chunk.forEach(job => {
      const docRef = db.collection(collectionPath).doc();
      batch.set(docRef, job);
    });
    await batch.commit();
    written += chunk.length;
  }
  return written;
}

async function runScraper() {
  console.log(`Starting scrape of ${SCRAPE_URL}...`);

  const metaRef = db.doc(METADATA_DOC_PATH);
  const runInfo = {
    source: 'github-actions',
    runId: process.env.GITHUB_RUN_ID || null,
    sha: process.env.GITHUB_SHA || null,
  };

  try {
    const { data } = await axios.get(SCRAPE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 30000
    });

    const $ = cheerio.load(data);
    const jobs = [];

    // Update these selectors if the job board HTML changes:
    $('.job-listing-item, .job-listing, .job-item, tr.job-row').each((i, el) => {
      const title = $(el).find('.job-title, a.title, a.job-title').text().trim();
      const location = $(el).find('.location, .job-location').text().trim();
      const pay = $(el).find('.pay, .salary').text().trim() || '$18.00 / hr';
      const desc = $(el).find('.description, .summary').text().trim();

      if (title) {
        jobs.push({
          title,
          company: 'Atlas Staffing',
          location: location || 'MN',
          payRate: pay,
          postedDate: new Date().toISOString(), // "scanned at" time
          type: 'Full-Time',
          description: desc || 'View full details on the Atlas Job Board.',
          skills: ['Industrial', 'Labor'],
          yearsExperience: 1,
          sourceUrl: SCRAPE_URL,
          scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    console.log(`Found ${jobs.length} jobs. Syncing Firestore...`);

    await deleteCollectionInBatches(JOBS_COLLECTION);
    const written = await writeJobsInBatches(JOBS_COLLECTION, jobs);

    await metaRef.set({
      ...runInfo,
      timestamp: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }),
      timestampISO: new Date().toISOString(),
      status: 'success',
      count: written,
    }, { merge: true });

    console.log(`✅ Synced ${written} jobs.`);
  } catch (error) {
    const msg = error?.message || String(error);
    console.error('❌ Scrape failed:', msg);

    try {
      await metaRef.set({
        ...runInfo,
        timestamp: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }),
        timestampISO: new Date().toISOString(),
        status: 'failure',
        error: msg.slice(0, 900),
      }, { merge: true });
    } catch (e) {
      console.error('Also failed to update metadata/sync:', e?.message || String(e));
    }

    process.exit(1);
  }
}

runScraper();
