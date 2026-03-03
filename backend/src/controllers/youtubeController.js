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
        // Filter out very long videos (over 15 minutes) and limit to 15 results
        const videos = r.videos.filter(v => v.seconds < 900).slice(0, 15);

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
