import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, '../../tokens.json');

let oauth2Client;
let cachedCredentials = null;
let drive;

const loadCredentials = () => {
    if (!oauth2Client || !process.env.GOOGLE_CLIENT_ID) {
        oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/oauth2callback'
        );
        drive = google.drive({ version: 'v3', auth: oauth2Client });
        // Set up the listener here
        oauth2Client.on('tokens', (tokens) => {
            const existingTokens = fs.existsSync(TOKEN_PATH)
                ? JSON.parse(fs.readFileSync(TOKEN_PATH))
                : {};
            const updatedTokens = { ...existingTokens, ...tokens };
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(updatedTokens, null, 2));
            console.log('Google Drive tokens updated and saved to tokens.json');
        });
    }

    if (cachedCredentials) {
        oauth2Client.setCredentials(cachedCredentials);
        return true;
    }

    // Try reading from Environment Variable FIRST (for Railway)
    if (process.env.GOOGLE_DRIVE_TOKENS) {
        try {
            const tokens = JSON.parse(process.env.GOOGLE_DRIVE_TOKENS);
            cachedCredentials = tokens;
            oauth2Client.setCredentials(tokens);
            // Optional: Save it locally just in case
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
            return true;
        } catch (err) {
            console.error('Error parsing GOOGLE_DRIVE_TOKENS from env:', err);
        }
    }

    // Fallback to reading from tokens.json file (for Local dev)
    if (fs.existsSync(TOKEN_PATH)) {
        try {
            const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
            cachedCredentials = tokens;
            oauth2Client.setCredentials(tokens);
            return true;
        } catch (err) {
            console.error('Error reading tokens.json:', err);
            return false;
        }
    }
    return false;
};

// Give drive and client out as proxies so they work even if used before loadCredentials
const driveProxy = new Proxy({}, {
    get: function (target, prop) {
        if (!drive) loadCredentials();
        return drive[prop];
    }
});

const oauth2ClientProxy = new Proxy({}, {
    get: function (target, prop) {
        if (!oauth2Client) loadCredentials();
        return oauth2Client[prop];
    }
});

export { driveProxy as drive, oauth2ClientProxy as oauth2Client, loadCredentials };
