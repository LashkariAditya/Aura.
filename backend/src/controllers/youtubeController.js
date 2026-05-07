import ytSearch from 'yt-search';

// @desc    Search YouTube videos
// @route   GET /api/youtube/search?q=query
// @access  Public
export const searchYouTube = async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
    }

    try {
        // Appending 'song' or 'audio' to make the search results precise for music
        let searchQuery = query;
        if (!/(song|audio|music|cover|remix|lofi|instrumental|karaoke)/i.test(searchQuery)) {
            searchQuery += ' song';
        }

        const r = await ytSearch(searchQuery);
        // Filter out very long videos (over 15 minutes) and limit to up to 80 results to support pagination
        const videos = r.videos.filter(v => 
            v.seconds >= 55 && // Skip YouTube Shorts (typically < 60s)
            v.seconds < 1200 && // 20 min limit for standard songs/mixes
            !v.title.toLowerCase().includes('#shorts') &&
            !v.url.toLowerCase().includes('/shorts/')
        ).slice(0, 80);

        const formattedResults = videos.map(v => ({
            _id: `yt_${v.videoId}`,
            title: v.title,
            artist: v.author.name,
            coverUrl: v.image,
            // Format duration from seconds
            duration: v.seconds,
            formattedDuration: `${Math.floor(v.seconds / 60)}:${(v.seconds % 60).toString().padStart(2, '0')}`,
            // We NO LONGER need an audio proxy URL because playing will be handled securely by YouTube Iframe API on Frontend
            audioUrl: '',
            itemType: 'song',
            isYoutube: true
        }));

        res.json({ success: true, data: { songs: formattedResults } });
    } catch (error) {
        console.error('YOUTUBE_SEARCH_ERROR:', error);
        res.status(500).json({ message: 'Error searching YouTube' });
    }
};

// @desc    Get YouTube playlist videos
// @route   GET /api/youtube/playlist?listId=id
// @access  Public
export const getYouTubePlaylist = async (req, res) => {
    const listId = req.query.listId;

    if (!listId) {
        return res.status(400).json({ message: 'Playlist ID is required' });
    }

    try {
        const playlist = await ytSearch({ listId });

        if (!playlist || !playlist.videos) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        const formattedResults = playlist.videos.map(v => ({
            _id: `yt_${v.videoId}`,
            title: v.title,
            artist: v.author.name,
            coverUrl: v.thumbnail,
            duration: v.duration.seconds,
            formattedDuration: v.duration.timestamp,
            audioUrl: '',
            itemType: 'song',
            isYoutube: true
        }));

        res.json({
            success: true,
            data: {
                name: playlist.title,
                songs: formattedResults,
                coverUrl: playlist.image || playlist.thumbnail || formattedResults[0]?.coverUrl
            }
        });
    } catch (error) {
        console.error('YOUTUBE_PLAYLIST_ERROR:', error);
        res.status(500).json({ message: 'Error fetching YouTube playlist' });
    }
};

// @desc    Match a specific song on YouTube
// @route   GET /api/youtube/match?q=query
// @access  Public
export const matchYouTube = async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
    }

    try {
        const r = await ytSearch(query);
        const video = r.videos.find(v => v.seconds < 1200); // Find first video under 20 mins

        if (!video) {
            return res.status(404).json({ message: 'No match found' });
        }

        const formattedResult = {
            _id: `yt_${video.videoId}`,
            title: video.title,
            artist: video.author.name,
            coverUrl: video.image,
            duration: video.seconds,
            formattedDuration: `${Math.floor(video.seconds / 60)}:${(video.seconds % 60).toString().padStart(2, '0')}`,
            audioUrl: '',
            itemType: 'song',
            isYoutube: true
        };

        res.json({ success: true, data: formattedResult });
    } catch (error) {
        console.error('YOUTUBE_MATCH_ERROR:', error);
        res.status(500).json({ message: 'Error matching YouTube video' });
    }
};
