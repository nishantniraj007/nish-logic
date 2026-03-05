const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const CREDENTIALS_JSON = process.env.GOOGLE_DRIVE_CREDENTIALS;

if (!FOLDER_ID || !CREDENTIALS_JSON) {
    console.warn("Skipping Drive Archive: Missing GOOGLE_DRIVE_FOLDER_ID or GOOGLE_DRIVE_CREDENTIALS in env variables.");
    process.exit(0);
}

// Ensure the Google Drive service accounts format is parsed easily
let credentials;
try {
    credentials = JSON.parse(CREDENTIALS_JSON);
} catch (e) {
    console.warn("Skipping Drive Archive: Cannot parse GOOGLE_DRIVE_CREDENTIALS safely as JSON.");
    process.exit(0);
}

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });
// Local temp archive directory holding generated snapshots prior to uploads
const archiveDir = path.join(__dirname, '../../games/3-over-match/data/archive');

async function archiveOldFiles() {
    if (!fs.existsSync(archiveDir)) {
        console.log("No archive directory found. Exiting gracefully.");
        return;
    }

    const files = fs.readdirSync(archiveDir);
    const now = Date.now();
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

    for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(archiveDir, file);
        const stats = fs.statSync(filePath);
        const ageMs = now - stats.mtimeMs;

        if (ageMs > fiveDaysMs) {
            console.log(`Archiving ${file} (+${Math.floor(ageMs / (24 * 60 * 60 * 1000))} days old) ...`);
            try {
                const fileMetadata = {
                    name: file,
                    parents: [FOLDER_ID]
                };
                const media = {
                    mimeType: 'application/json',
                    body: fs.createReadStream(filePath)
                };

                // The request body includes standard Google Drive REST v3 specification payload 
                await drive.files.create({
                    requestBody: fileMetadata,
                    media: media,
                    fields: 'id',
                    supportsAllDrives: true
                });

                console.log(`Successfully uploaded ${file} to Google Drive. Purging local copy.`);
                fs.unlinkSync(filePath);
            } catch (err) {
                console.error(`Failed to upload ${file}:`, err.message);
            }
        }
    }
}

// Call Main Routine
archiveOldFiles().then(() => {
    console.log("Archive sequence completed.");
}).catch(console.error);
