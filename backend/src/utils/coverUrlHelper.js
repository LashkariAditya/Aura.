/**
 * coverUrlHelper.js
 * 
 * Transforms raw Google Drive / lh3.googleusercontent.com cover URLs
 * into our backend proxy URL.  This is needed because:
 *
 *  1. lh3.googleusercontent.com/d/FILE_ID URLs are "private-cached" by
 *     Google (Cache-Control: private) and may fail in browsers that lack a
 *     Google session cookie.
 *
 *  2. Our backend proxy (/api/songs/image/FILE_ID) always works regardless of
 *     cookies, applies public immutable caching, and keeps all image logic in
 *     one place.
 *
 * The transformation is LOSSLESS — the Google Drive File ID is preserved, so
 * the proxy can still fetch the file from Drive.
 */

const getBackendUrl = () => process.env.BACKEND_URL || 'https://aura-production-ff01.up.railway.app';

/**
 * Extract Google Drive File ID from any of the known URL formats:
 *   - https://lh3.googleusercontent.com/d/FILE_ID
 *   - https://drive.google.com/file/d/FILE_ID/view
 *   - http://localhost:5000/api/songs/stream/FILE_ID   (already a proxy URL)
 *   - http://localhost:5000/api/songs/image/FILE_ID    (already a proxy URL)
 */
function extractDriveId(url) {
    if (!url) return null;

    // Already our proxy URL — extract the file ID at the end
    const proxyMatch = url.match(/\/api\/songs\/(?:stream|image)\/([^/?#]+)/);
    if (proxyMatch) return proxyMatch[1];

    // lh3.googleusercontent.com/d/FILE_ID
    const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([^/?#]+)/);
    if (lh3Match) return lh3Match[1];

    // drive.google.com/file/d/FILE_ID/...
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
    if (driveMatch) return driveMatch[1];

    return null;
}

/**
 * Transform a raw coverUrl / photoUrl into a stable backend proxy URL.
 * Falls back to the original URL if we can't extract a Drive ID.
 *
 * @param {string|null} url  - The raw URL from MongoDB
 * @returns {string|null}    - Transformed proxy URL (or original)
 */
export function normalizeCoverUrl(url) {
    if (!url) return url;
    if (url.includes('placehold.co') || url.includes('placeholder.com')) return url; // keep placeholders

    const driveId = extractDriveId(url);
    if (!driveId) return url; // unknown format, keep as-is

    return `${getBackendUrl()}/api/songs/image/${driveId}`;
}

/**
 * Transform a song document (plain object or Mongoose doc) so that its
 * coverUrl goes through the backend proxy.
 */
export function normalizeSong(song) {
    if (!song) return song;
    const s = song.toObject ? song.toObject() : { ...song };

    // Normalize Cover URL
    s.coverUrl = normalizeCoverUrl(s.coverUrl);

    // Normalize Audio URL dynamically 
    if (s.audioUrl) {
        const driveId = extractDriveId(s.audioUrl);
        if (driveId) {
            s.audioUrl = `${getBackendUrl()}/api/songs/stream/${driveId}`;
        }
    }

    return s;
}

/**
 * Transform an array of song documents.
 */
export function normalizeSongs(songs) {
    return (songs || []).map(normalizeSong);
}

/**
 * Transform an artist document so its photoUrl goes through the backend proxy.
 */
export function normalizeArtist(artist) {
    if (!artist) return artist;
    const a = artist.toObject ? artist.toObject() : { ...artist };
    a.photoUrl = normalizeCoverUrl(a.photoUrl);
    return a;
}

export function normalizeArtists(artists) {
    return (artists || []).map(normalizeArtist);
}
