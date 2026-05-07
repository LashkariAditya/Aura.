import { useState, useEffect } from 'react';
import { useMobileInView } from '../hooks/useMobileInView';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Play, Music } from 'lucide-react';

import historyService from '../services/historyService';
import { useMusic } from '../context/MusicContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SongListItemImage = ({ song }) => {
    const [imageError, setImageError] = useState(false);
    const { ref, isInView, isMobile } = useMobileInView(0.5);

    return !imageError && song.coverUrl ? (
        <img
            ref={ref}
            src={song.coverUrl}
            alt={song.title}
            className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 
                ${isMobile && isInView ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'}`}
            onError={() => setImageError(true)}
        />
    ) : (
        <div className="w-full h-full flex items-center justify-center bg-black/5 text-[10px] font-serif opacity-40">
            {song.title?.charAt(0)}
        </div>
    );
};

const History = () => {
    const [historyItems, setHistoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { playSong } = useMusic();
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await historyService.getRecent(50);
                // response.data.recent contains { _id, lastPlayed, playCount, song: {...} }
                setHistoryItems(response.data.recent);
            } catch (error) {
                console.error('Failed to fetch history:', error);
                toast.error('FAILED TO LOAD HISTORY');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchHistory();
        } else {
            setLoading(false);
            navigate('/');
        }
    }, [user, navigate]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-[10px] tracking-[0.5em] text-gray-400"
            >
                SYNCING_HISTORY
            </motion.div>
        </div>
    );

    const justSongs = historyItems.map(item => item.song);

    return (
        <div className="min-h-screen pt-32 pb-32 bg-background text-foreground">
            {/* Header Section */}
            <div className="px-6 md:px-12 lg:px-24 mb-24">
                <div className="max-w-[1920px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-end">
                        <div className="lg:col-span-8 space-y-12">
                            <div className="flex flex-col md:flex-row items-start md:items-end space-y-8 md:space-y-0 md:space-x-12">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
                                    className="w-64 h-64 md:w-80 md:h-80 bg-gradient-to-br from-gray-900 to-black relative overflow-hidden group shadow-2xl flex items-center justify-center p-12 border border-white/5"
                                >
                                    <HistoryIcon size={120} className="text-white opacity-20 group-hover:opacity-40 transition-opacity duration-1000 fill-current" />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => justSongs.length > 0 && playSong(justSongs[0], justSongs)}
                                            className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform shadow-2xl"
                                        >
                                            <Play fill="black" size={32} className="ml-2" />
                                        </button>
                                    </div>
                                </motion.div>

                                <div className="space-y-4 flex-1">
                                    <div className="space-y-2">
                                        <span className="label-text text-gray-400 font-bold">PRIVATE LOG</span>
                                        <h1 className="hero-title text-5xl md:text-8xl leading-[0.85]">PLAY<br />HISTORY</h1>
                                        <p className="body-text text-gray-400 max-w-xl text-lg font-light mt-4">
                                            A temporal map of your musical journey.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6 md:gap-8">
                                        <div className="flex items-center space-x-3 bg-muted/50 px-4 py-2 rounded-full border border-border">
                                            <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center text-background text-[8px] font-bold">
                                                {user?.name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-[11px] tracking-widest font-bold uppercase">{user?.name}</span>
                                        </div>
                                        <div className="hidden md:block w-1 h-1 rounded-full bg-border" />
                                        <span className="text-[11px] tracking-widest text-gray-400 uppercase font-bold">{historyItems.length} RECENT TRACKS</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4 flex justify-start lg:justify-end pb-4">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => justSongs.length > 0 && playSong(justSongs[0], justSongs)}
                                className="w-full md:w-auto px-12 py-5 bg-foreground text-background text-[11px] tracking-[0.3em] uppercase font-bold border border-transparent hover:bg-background hover:text-foreground hover:border-foreground transition-all duration-500 flex items-center justify-center space-x-3 shadow-xl shadow-foreground/5"
                            >
                                <Play size={14} fill="currentColor" />
                                <span>PLAY HISTORY</span>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Song Grid Section */}
            <div className="px-6 md:px-12 lg:px-24">
                <div className="max-w-[1920px] mx-auto">
                    <div className="mb-16 border-b border-border pb-8 flex justify-between items-end">
                        <div className="space-y-4">
                            <span className="text-[10px] tracking-[0.4em] text-gray-400 font-bold uppercase">TEMPORAL LOG</span>
                            <h2 className="section-heading text-4xl">RECENT<br />VIBRATIONS</h2>
                        </div>
                        <div className="p-4 border border-border rounded-full">
                            <HistoryIcon size={16} className="text-gray-400" />
                        </div>
                    </div>

                    {historyItems.length > 0 ? (
                        <div className="space-y-12">
                            {historyItems.map((item, idx) => {
                                const song = item.song;
                                const datePlayed = new Date(item.lastPlayed);
                                return (
                                    <motion.div
                                        key={item._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group flex items-center justify-between border-b border-border pb-8 hover:border-foreground transition-colors duration-500 cursor-pointer"
                                        onClick={() => playSong(song, justSongs)}
                                    >
                                        <div className="flex items-center space-x-4 md:space-x-12 overflow-hidden">
                                            <span className="font-serif text-2xl md:text-4xl text-muted group-hover:text-foreground transition-colors duration-500 flex-shrink-0">
                                                {(idx + 1).toString().padStart(2, '0')}
                                            </span>
                                            <div className="flex items-center space-x-4 md:space-x-6 overflow-hidden">
                                                <div className="w-12 h-12 md:w-16 md:h-16 bg-muted overflow-hidden relative group shadow-sm flex-shrink-0">
                                                    <SongListItemImage song={song} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-lg md:text-xl font-serif truncate">{song.title}</h4>
                                                    <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 mt-1 font-medium truncate">{song.artist}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end uppercase">
                                            <p className="hidden md:block text-[11px] tracking-widest text-gray-300 font-medium">{song.genre}</p>
                                            <p className="text-[10px] tracking-widest text-gray-400 font-mono font-bold mt-1">
                                                {datePlayed.toLocaleDateString()}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-32 text-center border-2 border-dashed border-border rounded-2xl group transition-all duration-700 hover:border-foreground/20">
                            <HistoryIcon className="mx-auto text-gray-200 group-hover:text-foreground transition-all duration-1000 mb-8" size={84} strokeWidth={0.5} />
                            <p className="font-serif text-3xl text-gray-300 uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                                No history found. Start exploring.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default History;
