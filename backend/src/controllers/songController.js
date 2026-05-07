import Song from '../models/Song.js';
import User from '../models/User.js';
import Artist from '../models/Artist.js';
import { uploadToGoogleDrive, deleteFromGoogleDrive } from '../utils/uploadHelper.js';
import { drive, loadCredentials } from '../config/googleDrive.js';
import { normalizeSong, normalizeSongs } from '../utils/coverUrlHelper.js';
import axios from 'axios';

// ── In-memory image cache to prevent Google Drive API flooding ──────────────
const _imageCache = new Map();
const _imagePending = new Map();
const IMAGE_CACHE_MAX = 300;
const IMAGE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCachedImage(fileId) {
    const entry = _imageCache.get(fileId);
    if (!entry) return null;
    if (Date.now() - entry.ts > IMAGE_CACHE_TTL) {
        _imageCache.delete(fileId);
        return null;
    }
    return entry;
}

function setCachedImage(fileId, buffer, mimeType) {
    if (_imageCache.size >= IMAGE_CACHE_MAX) {
        const oldest = _imageCache.keys().next().value;
        _imageCache.delete(oldest);
    }
    _imageCache.set(fileId, { data: buffer, mimeType, ts: Date.now() });
}

async function fetchImageBuffer(fileId) {
    if (!drive) loadCredentials();

    let mimeType = 'image/jpeg';
    const song = await Song.findOne({ cloudinaryCoverId: fileId }).select('coverMimeType').lean();
    if (song?.coverMimeType) {
        mimeType = song.coverMimeType;
    } else {
        const artist = await Artist.findOne({ cloudinaryPhotoId: fileId }).select('photoUrl').lean();
        if (!artist) {
            try {
                const meta = await drive.files.get({ fileId, fields: 'mimeType' });
                mimeType = meta.data.mimeType || mimeType;
            } catch {} // ignore metadata fetch failures
        }
    }

    const driveRes = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer', timeout: 15000 }
    );

    return { data: Buffer.from(driveRes.data), mimeType };
}

// @desc    Get all songs (paginated)
// @route   GET /api/songs
// @access  Public
export const getSongs = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const genre = req.query.genre;
    const search = req.query.search;
    const sort = req.query.sort || '-createdAt';

    let query = { isActive: true };

    if (genre) {
        query.genre = genre;
    }

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { artist: { $regex: search, $options: 'i' } },
            { album: { $regex: search, $options: 'i' } }
        ];
    }


    try {
        const total = await Song.countDocuments(query);
        const songs = await Song.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('uploadedBy', 'name');

        const baseUrl = req.protocol + '://' + req.get('host');
        res.json({
            success: true,
            data: {
                songs: normalizeSongs(songs, baseUrl),
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single song
// @route   GET /api/songs/:id
// @access  Public
export const getSongById = async (req, res) => {
    const song = await Song.findById(req.params.id).populate('uploadedBy', 'name');

    if (song && song.isActive) {
        const baseUrl = req.protocol + '://' + req.get('host');
        res.json({ success: true, data: { song: normalizeSong(song, baseUrl) } });
    } else {
        res.status(404).json({ message: 'Song not found' });
    }
};

// @desc    Upload a new song
// @route   POST /api/songs
// @access  Private/Admin
export const uploadSong = async (req, res) => {
    const { title, artist, album, genre, duration } = req.body;

    if (!req.files || !req.files.audio) {
        return res.status(400).json({ message: 'Audio file is required' });
    }

    try {
        // Upload audio to Google Drive
        const audioResult = await uploadToGoogleDrive(
            req.files.audio[0],
            process.env.GOOGLE_DRIVE_SONGS_FOLDER_ID
        );

        let coverUrl = undefined;
        let storageCoverId = undefined;
        let coverSize = undefined;
        let coverMimeType = undefined;

        // Upload cover image if provided
        if (req.files.cover) {
            const coverResult = await uploadToGoogleDrive(
                req.files.cover[0],
                process.env.GOOGLE_DRIVE_COVERS_FOLDER_ID
            );
            coverUrl = coverResult.url;
            storageCoverId = coverResult.id;
            coverSize = coverResult.size;
            coverMimeType = coverResult.mimeType;
        }

        // Handle Artist logic
        let artistDoc = await Artist.findOne({ name: new RegExp(`^${artist}$`, 'i') });
        if (!artistDoc) {
            let artistPhotoUrl = undefined;
            let artistPhotoId = undefined;

            // Check if an artist photo was uploaded
            if (req.files.artistPhoto) {
                const photoResult = await uploadToGoogleDrive(
                    req.files.artistPhoto[0],
                    process.env.GOOGLE_DRIVE_ARTISTS_FOLDER_ID
                );
                artistPhotoUrl = photoResult.url;
                artistPhotoId = photoResult.id;
            }

            artistDoc = await Artist.create({
                name: artist,
                photoUrl: artistPhotoUrl,
                cloudinaryPhotoId: artistPhotoId
            });
        }

        const song = await Song.create({
            title,
            artist: artistDoc.name,
            artistId: artistDoc._id,
            album: album || 'Single',
            genre,
            audioUrl: audioResult.url,
            audioSize: audioResult.size,
            audioMimeType: audioResult.mimeType,
            cloudinaryAudioId: audioResult.id, // Keeping field name for DB compatibility
            coverUrl: coverUrl || 'https://placehold.co/500/f5f5f5/000?text=Album+Cover',
            coverSize: coverSize,
            coverMimeType: coverMimeType,
            cloudinaryCoverId: storageCoverId || null,
            duration: Number(duration) && Number(duration) > 0 ? Number(duration) : 180,
            uploadedBy: req.user._id,
        });

        res.status(201).json({
            success: true,
            message: 'Song uploaded successfully',
            data: { song },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle like on song
// @route   POST /api/songs/:id/like
// @access  Private
export const toggleLikeSong = async (req, res) => {
    const song = await Song.findById(req.params.id);
    const user = await User.findById(req.user._id);

    if (!song) {
        return res.status(404).json({ message: 'Song not found' });
    }

    const isLiked = user.likedSongs.includes(song._id);

    if (isLiked) {
        user.likedSongs = user.likedSongs.filter(id => id.toString() !== song._id.toString());
        await song.decrementLikes();
    } else {
        user.likedSongs.push(song._id);
        await song.incrementLikes();
    }

    await user.save();

    res.json({
        success: true,
        message: isLiked ? 'Song unliked' : 'Song liked',
        data: {
            isLiked: !isLiked,
            likes: song.likes,
        },
    });
};

// @desc    Update song plays
// @route   POST /api/songs/:id/play
// @access  Public
export const incrementSongPlays = async (req, res) => {
    const song = await Song.findById(req.params.id);

    if (song) {
        await song.incrementPlays();
        res.json({ success: true, data: { plays: song.plays } });
    } else {
        res.status(404).json({ message: 'Song not found' });
    }
};

// @desc    Get trending songs
// @route   GET /api/songs/trending
// @access  Public
export const getTrendingSongs = async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const songs = await Song.findTrending(limit);
    const baseUrl = req.protocol + '://' + req.get('host');
    res.json({ success: true, data: { songs: normalizeSongs(songs, baseUrl) } });
};

// @desc    Get recent songs
// @route   GET /api/songs/recent
// @access  Public
export const getRecentSongs = async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const songs = await Song.findRecent(limit);
    const baseUrl = req.protocol + '://' + req.get('host');
    res.json({ success: true, data: { songs: normalizeSongs(songs, baseUrl) } });
};

// @desc    Get random songs
// @route   GET /api/songs/random
// @access  Public
export const getRandomSongs = async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const songs = await Song.findRandom(limit);
    const baseUrl = req.protocol + '://' + req.get('host');
    res.json({ success: true, data: { songs: normalizeSongs(songs, baseUrl) } });
};

// @desc    Proxy Google Drive stream to avoid CORS issues (supports Range requests for audio)
// @route   GET /api/songs/stream/:fileId
// @access  Public
export const getGoogleDriveStream = async (req, res) => {
    const fileId = req.params.fileId;

    // ── CORS + caching headers ──────────
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Accept-Ranges', 'bytes');
    res.removeHeader('X-Frame-Options');

    if (req.method === 'OPTIONS') return res.sendStatus(204);

    try {
        if (!drive) loadCredentials();

        // 1. Resolve metadata
        let size, mimeType;
        const song = await Song.findOne({
            $or: [{ cloudinaryAudioId: fileId }, { cloudinaryCoverId: fileId }]
        }).select('audioSize audioMimeType coverSize coverMimeType cloudinaryAudioId').lean();

        if (song) {
            if (song.cloudinaryAudioId === fileId) {
                size = song.audioSize;
                mimeType = song.audioMimeType;
            } else {
                size = song.coverSize;
                mimeType = song.coverMimeType;
            }
        }

        if (!size || !mimeType) {
            try {
                const meta = await drive.files.get({ fileId, fields: 'size,mimeType' });
                size = parseInt(meta.data.size) || undefined;
                mimeType = meta.data.mimeType || 'application/octet-stream';
            } catch (metaErr) {
                console.error('META_FETCH_FAILED:', metaErr.message);
            }
        }

        res.setHeader('Content-Type', mimeType || 'application/octet-stream');

        // 2. Handle Range requests
        const rangeHeader = req.headers['range'];
        if (rangeHeader && size) {
            const parts = rangeHeader.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            let end = parts[1] ? parseInt(parts[1], 10) : size - 1;

            if (start >= size) {
                res.writeHead(416, { 'Content-Range': `bytes */${size}` });
                return res.end();
            }

            if (end >= size) end = size - 1;
            const chunksize = (end - start) + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${size}`,
                'Content-Length': chunksize,
                'Content-Type': mimeType,
            });

            const driveRes = await drive.files.get(
                { fileId, alt: 'media' },
                { responseType: 'stream', headers: { Range: `bytes=${start}-${end}` } }
            );

            driveRes.data
                .on('error', (err) => {
                    if (err.message?.includes('Premature close')) return;
                    console.error('RANGE_STREAM_ERROR:', fileId, err.message);
                    if (!res.headersSent) {
                        res.status(500).end();
                    } else {
                        if (!res.writableEnded) res.end();
                    }
                })
                .on('ready', () => {
                    if (!res.headersSent) res.flushHeaders();
                })
                .pipe(res);

            req.on('close', () => {
                if (driveRes.data?.destroy) driveRes.data.destroy();
            });
            return;
        }

        // 3. Full stream
        if (size) res.setHeader('Content-Length', size);

        const driveRes = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        driveRes.data
            .on('error', (err) => {
                if (err.message?.includes('Premature close')) return;
                console.error('FULL_STREAM_ERROR:', fileId, err.message);
                if (!res.headersSent) {
                    res.status(500).end();
                } else {
                    if (!res.writableEnded) res.end();
                }
            })
            .on('ready', () => {
                if (!res.headersSent) res.flushHeaders();
            })
            .pipe(res);

        req.on('close', () => {
            if (driveRes.data?.destroy) driveRes.data.destroy();
        });

    } catch (error) {
        if (error.message?.includes('Premature close')) return;
        console.error('DRIVE_STREAM_FATAL:', fileId, error.message);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error streaming from Drive', fileId });
        }
    }
};

// @desc    Lightweight image proxy for cover art and artist photos (cached + deduplicated)
// @route   GET /api/songs/image/:fileId
// @access  Public
export const getImageProxy = async (req, res) => {
    const { fileId } = req.params;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h browser cache

    if (req.method === 'OPTIONS') return res.sendStatus(204);

    try {
        // 1. Serve from in-memory cache (instant, no Drive API call)
        const cached = getCachedImage(fileId);
        if (cached) {
            res.setHeader('Content-Type', cached.mimeType);
            res.setHeader('Content-Length', cached.data.length);
            res.setHeader('X-Cache', 'HIT');
            return res.send(cached.data);
        }

        // 2. Deduplicate: if this file is already being fetched, wait for it
        let fetchPromise;
        if (_imagePending.has(fileId)) {
            fetchPromise = _imagePending.get(fileId);
        } else {
            fetchPromise = fetchImageBuffer(fileId);
            _imagePending.set(fileId, fetchPromise);
        }

        const result = await fetchPromise;
        _imagePending.delete(fileId);

        // 3. Cache for future requests
        setCachedImage(fileId, result.data, result.mimeType);

        // 4. Send buffered response (avoids stream-related connection resets)
        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('Content-Length', result.data.length);
        res.setHeader('X-Cache', 'MISS');
        return res.send(result.data);

    } catch (error) {
        _imagePending.delete(fileId);

        // Return a 1x1 transparent PNG to keep the browser console clean
        const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

        if (!res.headersSent) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=60');
            res.status(200).send(transparentPixel);
        } else {
            if (!res.writableEnded) res.end();
        }

        if (error.response?.status !== 404 && error.response?.status !== 403) {
            console.error(`[Image Proxy] Error for ${fileId}:`, error.message);
        }
    }
};

// @desc    Delete a song
// @route   DELETE /api/songs/:id
// @access  Private/Admin
export const deleteSong = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);

        if (!song) {
            return res.status(404).json({ message: 'Song not found' });
        }

        if (song.cloudinaryAudioId) {
            try {
                await deleteFromGoogleDrive(song.cloudinaryAudioId);
            } catch (err) {
                console.error('Failed to delete audio from Drive:', err);
            }
        }

        if (song.cloudinaryCoverId) {
            try {
                await deleteFromGoogleDrive(song.cloudinaryCoverId);
            } catch (err) {
                console.error('Failed to delete cover from Drive:', err);
            }
        }

        await Song.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Song deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get liked songs for current user
// @route   GET /api/songs/liked
// @access  Private
export const getLikedSongs = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate({
            path: 'likedSongs',
            match: { isActive: true },
            populate: { path: 'uploadedBy', select: 'name' }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const baseUrl = req.protocol + '://' + req.get('host');
        res.json({
            success: true,
            data: {
                songs: normalizeSongs(user.likedSongs, baseUrl)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
