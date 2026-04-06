import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import connectDB from './config/database.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import songRoutes from './routes/songRoutes.js';
import playlistRoutes from './routes/playlistRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import userRoutes from './routes/userRoutes.js';
import artistRoutes from './routes/artistRoutes.js';
import youtubeRoutes from './routes/youtubeRoutes.js';
import socketHandler from './utils/socketHandler.js';

dotenv.config();

// Connect to database
connectDB();

const app = express();

// Trust Railway's proxy so Express sees the real client IP / protocol
app.set('trust proxy', 1);

// ─── ALLOWED ORIGINS ─────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL,
    'https://aura-music-67.vercel.app',
    'https://aura-production-ff01.up.railway.app',
    'https://aura-music.up.railway.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
].filter(Boolean);

function isAllowedOrigin(origin) {
    if (!origin) return true;
    return ALLOWED_ORIGINS.includes(origin)
        || /\.vercel\.app$/.test(origin)
        || /\.railway\.app$/.test(origin);
}

// ─── 1. CORS — always runs first, before everything else ─────────────────────
// This manually sets headers so they survive helmet and error handlers. 
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin)) {
        // For credentialed requests we MUST echo the exact origin, not '*'
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else {
        // Still set the header so the browser gets a proper CORS error message
        // instead of a generic network error
        console.warn(`[CORS] Blocked origin: ${origin} for ${req.method} ${req.path}`);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // cache preflight for 24h
    res.setHeader('Vary', 'Origin');

    // Fast-track preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
});

// 2. Standard CORS middleware (backup, also handles the vary header etc.)
app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 204
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Helmet — must come AFTER the CORS middleware above so it cannot strip our headers.
// Disable CSP in production API (the frontend sets its own CSP via Vercel headers).
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false, // don't interfere with OAuth popups
    contentSecurityPolicy: false,   // API doesn't serve HTML; CSP is the frontend's job
}));
app.use(compression());

// Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/youtube', youtubeRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV });
});

// Google Drive Auth Routes
app.get('/auth/google', async (req, res) => {
    const { google } = await import('googleapis');
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/oauth2callback'
    );
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/drive.file']
    });
    res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
    try {
        const { google } = await import('googleapis');
        const fs = await import('fs');
        const path = await import('path');
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/oauth2callback'
        );
        const { tokens } = await oauth2Client.getToken(req.query.code);
        fs.writeFileSync(path.join(process.cwd(), 'tokens.json'), JSON.stringify(tokens, null, 2));

        // Let's also update the in-memory drive instance
        const { loadCredentials } = await import('./config/googleDrive.js');
        loadCredentials();

        res.send('✅ Google Drive tokens updated! You can close this window and refresh the site. Songs should play now.');
    } catch (err) {
        res.status(500).send('Error saving tokens: ' + err.message);
    }
});

// Debug route for environment variables
app.get('/api/test-env', (req, res) => {
    const id = process.env.GOOGLE_CLIENT_ID || '';
    const secret = process.env.GOOGLE_CLIENT_SECRET || '';

    let parsedTokens = null;
    try {
        if (process.env.GOOGLE_DRIVE_TOKENS) {
            parsedTokens = JSON.parse(process.env.GOOGLE_DRIVE_TOKENS);
        }
    } catch (e) {
        parsedTokens = 'PARSE_ERROR';
    }

    const safeEnv = {
        idMatch: id.startsWith('432111') && id.endsWith('.com'),
        secretMatch: secret.startsWith('GOC') && secret.endsWith('LGL') && secret.length === 35,
        tokensParsed: parsedTokens !== null && parsedTokens !== 'PARSE_ERROR',
        hasRefreshToken: parsedTokens && !!parsedTokens.refresh_token,
        refreshPrefix: parsedTokens && parsedTokens.refresh_token ? parsedTokens.refresh_token.substring(0, 10) : null
    };
    res.json(safeEnv);
});

app.get('/api/test-google-api', async (req, res) => {
    try {
        const { google } = await import('googleapis');
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/oauth2callback'
        );
        const tokens = JSON.parse(process.env.GOOGLE_DRIVE_TOKENS);
        oauth2Client.setCredentials(tokens);
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const response = await drive.files.list({ pageSize: 1, fields: 'files(id, name)' });
        res.json({ success: true, files: response.data.files });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
            response: error.response ? error.response.data : null,
            stack: error.stack
        });
    }
});

// Test route
app.get('/', (req, res) => {
    res.send('Aura Music API is running...');
});

// Error handling — skip socket.io paths so the WS transport works
app.use((req, res, next) => {
    if (req.path.startsWith('/socket.io')) return next(); // let socket.io handle these
    notFound(req, res, next);
});
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) {
                callback(null, true);
            } else {
                callback(null, true); // still allow for socket.io – auth is handled at app level
            }
        },
        methods: ['GET', 'POST'],
        credentials: true,
    },
    // Allow both polling and websocket transports
    transports: ['polling', 'websocket'],
    allowUpgrades: true,
});

socketHandler(io);

httpServer.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
