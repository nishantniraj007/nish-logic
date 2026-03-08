const fs = require('fs');
const path = require('path');
const https = require('https');

const GITHUB_REPO_URL = "https://raw.githubusercontent.com/nishantniraj007/nish-logic-gk-database/master";
const LOCAL_POOL_FILE = path.join(__dirname, '../client/data/massive_pool.json');
const POOL_CAP = 10000;
const DAILY_INGEST = 100;

// Utility to fetch straight from GitHub raw content
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) return reject(new Error(`Failed ${res.statusCode}: ${url}`));
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function updatePool() {
    console.log(`[${new Date().toISOString()}] Starting 10k Pool Synchronization...`);

    // Ensure Client Data directory exists so the web app can read it
    const dataDir = path.join(__dirname, '../client/data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // 1. Load Existing Pool (or create new if empty)
    let currentPool = [];
    if (fs.existsSync(LOCAL_POOL_FILE)) {
        currentPool = JSON.parse(fs.readFileSync(LOCAL_POOL_FILE, 'utf8'));
    }

    // 2. Fetch Fresh Questions
    let freshQuestions = [];
    try {
        console.log("Fetching latest Current Affairs...");
        // Try both possible naming conventions for safety
        const caUrls = [
            `${GITHUB_REPO_URL}/current_affairs/latest.json`,
            `${GITHUB_REPO_URL}/current_affairs_en/latest.json`
        ];

        let caData = null;
        for (const url of caUrls) {
            try {
                caData = await fetchUrl(url);
                if (caData) {
                    console.log(`Successfully fetched CA from: ${url}`);
                    break;
                }
            } catch (e) { console.warn(`CA fetch failed for ${url}: ${e.message}`); }
        }

        if (caData) {
            freshQuestions.push(...caData.slice(0, 60));
        }

        console.log("Fetching new Static GK (Random level 13-17)...");
        const level = Math.floor(Math.random() * (17 - 13 + 1)) + 13;
        const subj = ['history', 'geography', 'polity'][Math.floor(Math.random() * 3)];
        const gkUrl = `${GITHUB_REPO_URL}/${subj}/level_${level}.json`;

        try {
            const gkData = await fetchUrl(gkUrl);
            const taggedGk = gkData.slice(0, 40).map(q => ({
                ...q,
                category: `Static GK (${subj})`
            }));
            freshQuestions.push(...taggedGk);
        } catch (e) {
            console.warn(`GK fetch failed for ${gkUrl}: ${e.message}`);
        }

    } catch (e) {
        console.error("General error in fresh data acquisition:", e);
    }

    if (freshQuestions.length === 0) {
        console.warn("No fresh questions acquired in this run. Pool remains unchanged.");
        return;
    }

    console.log(`Acquired ${freshQuestions.length} new questions. Injecting into Pool.`);

    // 3. Inject & Enforce FIFO constraint
    currentPool.push(...freshQuestions); // Add to back

    if (currentPool.length > POOL_CAP) {
        const excess = currentPool.length - POOL_CAP;
        currentPool.splice(0, excess); // Remove from front (oldest)
        console.log(`Pool exceeded cap. Removed oldest ${excess} entries.`);
    }

    // 4. Save
    fs.writeFileSync(LOCAL_POOL_FILE, JSON.stringify(currentPool, null, 2));
    console.log(`[Success] Massive Pool synchronized. Current internal counter: ${currentPool.length}/${POOL_CAP}`);
}

updatePool();
