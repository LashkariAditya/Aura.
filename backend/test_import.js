import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Playlist from './src/models/Playlist.js';
import Song from './src/models/Song.js';
import { fetchFullYouTubePlaylist } from './src/utils/youtubePlaylist.js';

dotenv.config({ override: true });

async function test() {
    try {
        const uri = process.env.MONGODB_URI_DIRECT || process.env.MONGODB_URI;
        await mongoose.connect(uri, { family: 4 });
        console.log('MongoDB Connected');

        const listId = 'PL4fGSI1pQAa65zOaC-mBtbJ4wZ0p8G3B1'; // A known playlist ID
        console.log('Fetching youtube playlist...');
        const ytPlaylist = await fetchFullYouTubePlaylist(listId);
        console.log(`Fetched ${ytPlaylist.videos.length} videos`);

        const userId = new mongoose.Types.ObjectId(); // Fake user ID

        const songIds = [];
        for (const video of ytPlaylist.videos) {
            const ytAudioUrl = `yt_${video.videoId}`;
            let song = await Song.findOne({ audioUrl: ytAudioUrl });

            if (!song) {
                try {
                    song = await Song.create({
                        title: (video.title || 'Unknown Title').substring(0, 100), // Avoid validation err
                        artist: (video.author || 'Unknown Artist').substring(0, 100),
                        audioUrl: ytAudioUrl,
                        coverUrl: video.thumbnail,
                        duration: video.lengthSeconds || 0,
                        genre: 'Other',
                        uploadedBy: userId,
                        isActive: true
                    });
                } catch (songErr) {
                    console.error('Song error:', songErr.message);
                    continue;
                }
            }
            songIds.push(song._id);
        }

        const shareCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        let baseName = (ytPlaylist.title || 'YouTube Import').substring(0, 40);
        let finalName = baseName;
        let counter = 1;
        while (await Playlist.findOne({ name: finalName })) {
            const suffix = ` (${counter})`;
            finalName = `${baseName.substring(0, 40 - suffix.length)}${suffix}`;
            counter++;
        }

        const playlist = await Playlist.create({
            name: finalName,
            description: `Imported from YouTube · ${ytPlaylist.videos.length} tracks`.substring(0, 200),
            isPublic: false,
            userId,
            coverUrl: ytPlaylist.image || ytPlaylist.videos[0]?.thumbnail,
            shareCode,
            songs: songIds
        });

        console.log('Playlist created successfully!', playlist._id);
        await mongoose.disconnect();
    } catch (e) {
        console.error('FATAL ERROR:', e);
        await mongoose.disconnect();
    }
}

test();
