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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            // Allow images from our stream proxy, placehold.co fallbacks, and any https source
            "img-src": [
                "'self'",
                "data:",
                "blob:",
                "http://localhost:5000",
                "http://localhost:5001",
                "https://placehold.co",
                "https://images.unsplash.com",
                "https://drive.google.com",
                "https://www.transparenttextures.com",
                "https:",
            ],
            "connect-src": [
                "'self'",
                "http://localhost:5000",
                "ws://localhost:5000",
                "http://127.0.0.1:5000",
                "ws://127.0.0.1:5000",
                "http://localhost:5001",
                "http://localhost:5173",
                "https://aura-music-67.vercel.app",
                "https://aura-music.up.railway.app",
                "wss://aura-music.up.railway.app",
            ],
            "media-src": [
                "'self'",
                "blob:",
                "http://localhost:5000",
            ],
        }
    }
}));
// ─── CORS: set headers on EVERY response (including errors) ───────────────────
const ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL,          // e.g. https://aura-music-67.vercel.app
    'https://aura-music-67.vercel.app', // explicit production fallback
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
].filter(Boolean);

// Manual early middleware — runs before Helmet/routes so error paths also get headers
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isAllowed =
        !origin ||
        ALLOWED_ORIGINS.includes(origin) ||
        /\.vercel\.app$/.test(origin) ||
        /\.railway\.app$/.test(origin);

    if (isAllowed && origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');

    // Handle preflight immediately
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        const isAllowed =
            !origin ||
            ALLOWED_ORIGINS.includes(origin) ||
            /\.vercel\.app$/.test(origin) ||
            /\.railway\.app$/.test(origin);
        callback(null, isAllowed);
    },
    credentials: true,
    optionsSuccessStatus: 204,
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

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            const isAllowed =
                !origin ||
                ALLOWED_ORIGINS.includes(origin) ||
                /\.vercel\.app$/.test(origin) ||
                /\.railway\.app$/.test(origin);
            callback(null, isAllowed);
        },
        credentials: true,
    }
});

socketHandler(io);

httpServer.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
