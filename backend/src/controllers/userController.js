import mongoose from 'mongoose';
import User from '../models/User.js';
import Song from '../models/Song.js';
import Playlist from '../models/Playlist.js';
import Artist from '../models/Artist.js';
import History from '../models/History.js';
import { uploadToGoogleDrive } from '../utils/uploadHelper.js';
import { normalizeCoverUrl, normalizeSongs } from '../utils/coverUrlHelper.js';

// @desc    Get all curators (users who have uploaded songs or have the admin role)
// @route   GET /api/users/curators
// @access  Public
export const getCurators = async (req, res) => {
    try {
        // Find users who are admins or have uploaded at least one song
        const curators = await User.find({
            $or: [
                { role: 'admin' },
                { _id: { $in: await Song.distinct('uploadedBy') } }
            ]
        }).select('name avatar role followers following');

        res.json({
            success: true,
            data: curators
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get a public profile
// @route   GET /api/users/profile/:id
// @access  Public
export const getPublicProfile = async (req, res) => {
    try {
        let profileUser = await User.findById(req.params.id)
            .select('name avatar role followers following createdAt');

        let songs = [];
        let playlists = [];
        let followersCount = 0;
        let followingCount = 0;

        if (profileUser) {
            // It's a User profile (curator)
            songs = await Song.find({ uploadedBy: profileUser._id, isActive: true })
                .sort({ createdAt: -1 });
            playlists = await Playlist.find({ user: profileUser._id })
                .sort({ createdAt: -1 });
            followersCount = profileUser.followers.length;
            followingCount = profileUser.following.length;
        } else {
            // Check if it's an Artist profile
            const artist = await Artist.findById(req.params.id);
            if (!artist) {
                return res.status(404).json({ message: 'User or Artist not found' });
            }

            // Map artist to a user-like structure for the frontend
            const baseUrl = req.protocol + '://' + req.get('host');
            profileUser = {
                _id: artist._id,
                name: artist.name,
                avatar: normalizeCoverUrl(artist.photoUrl, baseUrl),  // ← proxy the artist photo
                role: 'Artist',
                createdAt: artist.createdAt,
                followers: [],
                following: []
            };

            // Get songs by this artist
            songs = await Song.find({
                $or: [
                    { artistId: artist._id },
                    { artist: artist.name }
                ],
                isActive: true
            }).sort({ createdAt: -1 });

            playlists = [];
            followersCount = 0;
            followingCount = 0;
        }

        const baseUrl = req.protocol + '://' + req.get('host');
        res.json({
            success: true,
            data: {
                user: profileUser,
                songs: normalizeSongs(songs, baseUrl),  // ← proxy all song cover URLs
                playlists,
                followersCount,
                followingCount
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Follow/Unfollow a user
// @route   POST /api/users/follow/:id
// @access  Private
export const toggleFollow = async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user._id);

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (targetUser._id.toString() === currentUser._id.toString()) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        const isFollowing = currentUser.following.includes(targetUser._id);

        if (isFollowing) {
            // Unfollow
            currentUser.following = currentUser.following.filter(
                id => id.toString() !== targetUser._id.toString()
            );
            targetUser.followers = targetUser.followers.filter(
                id => id.toString() !== currentUser._id.toString()
            );
        } else {
            // Follow
            currentUser.following.push(targetUser._id);
            targetUser.followers.push(currentUser._id);
        }

        await currentUser.save();
        await targetUser.save();

        res.json({
            success: true,
            isFollowing: !isFollowing,
            message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.bio = req.body.bio || user.bio;

            const updatedUser = await user.save();

            res.json({
                success: true,
                data: {
                    user: {
                        _id: updatedUser._id,
                        name: updatedUser.name,
                        email: updatedUser.email,
                        role: updatedUser.role,
                        avatar: updatedUser.avatar,
                        bio: updatedUser.bio,
                    },
                },
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Get current user stats (likes, listening hours, playlists)
// @route   GET /api/users/stats
// @access  Private
export const getUserStats = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Get user for liked songs count
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const likedSongsCount = user.likedSongs?.length || 0;

        // 2. Count playlists created by user
        const playlistsCount = await Playlist.countDocuments({ user: userId });

        // 3. Calculate listening hours from History
        const historyData = await History.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, totalSeconds: { $sum: '$listenDuration' } } }
        ]);

        const totalSeconds = historyData.length > 0 ? historyData[0].totalSeconds : 0;
        const totalListeningHours = Math.round((totalSeconds / 3600) * 10) / 10; // Round to 1 decimal place

        res.json({
            success: true,
            data: {
                likedSongsCount,
                playlistsCount,
                totalListeningHours
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
