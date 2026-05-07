import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music, Play, Heart, Share2, Trash2 } from 'lucide-react';
import playlistService from '../services/playlistService';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import SongListRow from '../components/music/SongListRow';
import toast from 'react-hot-toast';

const PlaylistPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { playSong } = useMusic();
    const [playlist, setPlaylist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPlaylist = async () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const res = await playlistService.getPlaylistById(id, code);
            setPlaylist(res.data?.playlist || res);
        } catch (error) {
            toast.error('FAILED TO LOAD PLAYLIST');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlaylist();
    }, [id]);

    const handleSearchChange = async (e) => {
        const val = e.target.value;
        setSearchTerm(val);

        if (currentUser?._id !== playlist?.userId?._id) return;

        const ytRegex = /[?&]list=([a-zA-Z0-9_-]+)/;
        const match = val.match(ytRegex);

        if (match && match[1]) {
            const listId = match[1];
            setSearchTerm('');
            setIsImporting(true);
            const loadingToast = toast.loading('IMPORTING YOUTUBE PLAYLIST...');

            try {
                await playlistService.appendYoutube(id, listId);
                toast.success('YOUTUBE PLAYLIST ADDED', { id: loadingToast });
                await fetchPlaylist(); // Refresh data
            } catch (error) {
                console.error(error);
                toast.error('FAILED TO IMPORT YOUTUBE PLAYLIST', { id: loadingToast });
            } finally {
                setIsImporting(false);
            }
        }
    };

    const handleDeletePlaylist = async () => {
        if (window.confirm('Are you sure you want to delete this playlist?')) {
            try {
                await playlistService.deletePlaylist(playlist._id);
                toast.success('PLAYLIST DELETED');
                navigate('/playlists');
            } catch (error) {
                toast.error('FAILED TO DELETE PLAYLIST');
            }
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-[10px] tracking-[0.5em] text-gray-400 uppercase"
            >
                LOADING_COLLECTION
            </motion.div>
        </div>
    );

    if (!playlist) return (
        <div className="pt-32 text-center hero-title uppercase tracking-widest text-foreground min-h-screen bg-background">
            404_COLLECTION_NOT_FOUND
        </div>
    );

    const totalDuration = playlist.songs?.reduce((acc, song) => acc + (song.duration || 0), 0) || 0;
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const hours = Math.floor(mins / 60);
        if (hours > 0) return `${hours}H ${mins % 60}M`;
        return `${mins}M ${seconds % 60}S`;
    };

    const displayCoverUrl = playlist.coverUrl || (playlist.songs && playlist.songs.length > 0 ? playlist.songs[0].coverUrl : null);

    const nameLength = playlist.name?.length || 0;
    const titleSize = nameLength > 25 ? 'text-3xl md:text-5xl lg:text-6xl' :
        nameLength > 15 ? 'text-4xl md:text-6xl lg:text-8xl' :
            nameLength > 8 ? 'text-5xl md:text-8xl lg:text-[10rem]' :
                'text-6xl md:text-9xl lg:text-[14rem]';

    const handleRemoveSong = async (songId) => {
        if (window.confirm('Remove this track from playlist?')) {
            try {
                await playlistService.removeSong(id, songId);
                toast.success('TRACK REMOVED');
                await fetchPlaylist(); // Refresh
            } catch (error) {
                toast.error('FAILED TO REMOVE TRACK');
            }
        }
    };

    return (
        <div className="min-h-screen pt-32 pb-32 bg-background text-foreground">
            {/* Minimalist Header */}
            <div className="px-6 md:px-12 lg:px-24 mb-24">
                <div className="max-w-[1920px] mx-auto flex flex-col items-center text-center space-y-16">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-3xl w-full bg-muted/30 relative overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000 shadow-2xl flex items-center justify-center"
                    >
                        {displayCoverUrl ? (
                            <img
                                src={displayCoverUrl}
                                className="w-full h-auto max-h-[75vh] object-cover"
                                alt={playlist.name}
                            />
                        ) : (
                            <div className="w-full aspect-video flex items-center justify-center text-gray-300 min-h-[400px]">
                                <Music size={64} strokeWidth={1} />
                            </div>
                        )}
                    </motion.div>

                    <div className="space-y-6 w-full max-w-6xl mx-auto px-4">
                        <span className="label-text text-foreground tracking-[0.6em] block">PLAYLIST COLLECTION</span>
                        <h1 className={`serif-display text-outline ${titleSize} leading-[0.8] tracking-tighter uppercase break-words px-4`}>
                            {playlist.name}
                        </h1>
                        {!playlist.isPublic && playlist.shareCode && (
                            <p className="text-[14px] tracking-[0.2em] font-mono text-gray-400 mt-2 uppercase">PRIVATE · CODE: {playlist.shareCode}</p>
                        )}
                        {playlist.description && (
                            <p className="text-gray-400 font-light max-w-2xl mx-auto text-lg pt-8">
                                {playlist.description}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24 pt-8 w-full justify-center">
                        <div className="flex flex-wrap justify-center gap-12 lg:gap-24">
                            <div className="space-y-1 text-center">
                                <p className="text-[10px] tracking-widest text-gray-400 uppercase">Tracks</p>
                                <p className="font-serif text-3xl">{playlist.songs?.length || 0}</p>
                            </div>
                            <div className="space-y-1 text-center">
                                <p className="text-[10px] tracking-widest text-gray-400 uppercase">Duration</p>
                                <p className="font-serif text-3xl">{formatDuration(totalDuration)}</p>
                            </div>
                            <div className="space-y-1 text-center">
                                <p className="text-[10px] tracking-widest text-gray-400 uppercase">Curator</p>
                                <Link to={`/curator/${playlist.userId?._id}`} className="font-serif text-3xl hover:underline truncate max-w-[200px] block">
                                    {playlist.userId?.name || 'Unknown'}
                                </Link>
                            </div>
                        </div>

                        <div className="flex items-center justify-center space-x-4 mt-8 md:mt-0">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => playlist.songs?.length > 0 && playSong(playlist.songs[0], playlist.songs)}
                                className="px-12 py-4 text-[11px] tracking-[0.3em] font-bold uppercase transition-all duration-500 flex items-center space-x-3 bg-foreground text-background border border-transparent hover:bg-background hover:text-foreground hover:border-foreground"
                            >
                                <Play size={14} fill="currentColor" />
                                <span>Play All</span>
                            </motion.button>
                            <button className="w-12 h-12 flex items-center justify-center border border-border hover:border-foreground transition-colors">
                                <Heart size={16} />
                            </button>
                            <button className="w-12 h-12 flex items-center justify-center border border-border hover:border-foreground transition-colors"
                                onClick={() => {
                                    let url = window.location.href;
                                    if (!playlist.isPublic && playlist.shareCode && !url.includes('code=')) {
                                        url += `?code=${playlist.shareCode}`;
                                    }
                                    navigator.clipboard.writeText(url);
                                    toast.success('LINK COPIED');
                                }}>
                                <Share2 size={16} />
                            </button>
                            {currentUser?._id === playlist.userId?._id && (
                                <button className="w-12 h-12 flex items-center justify-center border border-border text-red-500 hover:border-red-500 transition-colors"
                                    onClick={handleDeletePlaylist}
                                    title="Delete Playlist">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs (Single Tab for Tracklist) */}
            <div className="px-6 md:px-12 lg:px-24 mb-16 sticky top-20 bg-background/90 backdrop-blur-xl z-30 py-6 border-b border-border">
                <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex space-x-12">
                        <button className="text-[11px] tracking-[0.4em] uppercase transition-all text-foreground font-bold border-b-2 border-foreground pb-2">
                            TRACKLIST ({playlist.songs?.length || 0})
                        </button>
                    </div>

                    {/* YouTube Playlist Add Search Bar */}
                    {currentUser?._id === playlist.userId?._id && (
                        <div className="relative w-full sm:w-80">
                            <input
                                type="text"
                                placeholder="PASTE YOUTUBE PLAYLIST URL..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                disabled={isImporting}
                                className="w-full bg-transparent border-b border-border py-2 text-[10px] tracking-widest uppercase focus:outline-none focus:border-foreground transition-colors disabled:opacity-50 text-foreground"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Content Section */}
            <div className="px-6 md:px-12 lg:px-24">
                <div className="max-w-[1920px] mx-auto">
                    {playlist.songs && playlist.songs.length > 0 ? (
                        <div className="space-y-12">
                            {playlist.songs.map((song, idx) => (
                                <SongListRow
                                    key={song._id}
                                    song={song}
                                    queue={playlist.songs}
                                    index={idx}
                                    playSong={playSong}
                                    onRemove={currentUser?._id === playlist.userId?._id ? handleRemoveSong : null}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 text-center border-2 border-dashed border-border rounded-2xl group transition-all duration-700 hover:border-foreground/20">
                            <Music className="mx-auto text-gray-200 group-hover:text-foreground transition-all duration-1000 mb-8" size={84} strokeWidth={0.5} />
                            <p className="font-serif text-3xl text-gray-300 uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                                This collection is empty.
                            </p>
                            <Link to="/artists" className="inline-block mt-12 text-[10px] tracking-[0.4em] uppercase font-bold border-b-2 border-border pb-2 hover:border-foreground transition-colors">
                                EXPLORE ARCHIVES
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlaylistPage;
