import { motion } from 'framer-motion';
import { ChevronDown, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, Heart, Share2, MoreHorizontal, MonitorPlay } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { useNavigate } from 'react-router-dom';
import Visualizer from '../components/music/Visualizer';
import { useState, useEffect, useRef } from 'react';
import AddToPlaylistModal from '../components/music/AddToPlaylistModal';
import QueuePanel from '../components/music/QueuePanel';
import { ListMusic } from 'lucide-react';
const VinylPlayerPage = () => {
    const {
        currentSong,
        isPlaying,
        togglePlay,
        progress,
        seek,
        nextSong,
        previousSong,
        volume,
        changeVolume,
        isShuffle,
        toggleShuffle,
        repeatMode,
        toggleRepeat,
        isLiked,
        toggleLike,

        analyser,
        isVideoMode,
        toggleVideoMode
    } = useMusic();

    const navigate = useNavigate();
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
    const [isQueueOpen, setIsQueueOpen] = useState(false);

    const [showControls, setShowControls] = useState(true);
    const hideTimer = useRef(null);

    const resetHideTimer = () => {
        setShowControls(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
            setShowControls(false);
        }, 1000);
    };

    useEffect(() => {
        if (isVideoMode) {
            resetHideTimer();
            window.addEventListener('mousemove', resetHideTimer);
            window.addEventListener('click', resetHideTimer);
            window.addEventListener('touchstart', resetHideTimer);
            return () => {
                window.removeEventListener('mousemove', resetHideTimer);
                window.removeEventListener('click', resetHideTimer);
                window.removeEventListener('touchstart', resetHideTimer);
                if (hideTimer.current) clearTimeout(hideTimer.current);
            };
        }
    }, [isVideoMode]);

    if (!currentSong) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <p className="font-serif text-2xl text-gray-400">NO SONIC SELECTION</p>
            </div>
        );
    }

    if (isVideoMode) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showControls ? 1 : 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[70] bg-transparent text-white overflow-hidden flex flex-col justify-end pointer-events-none"
            >
                {/* Back button positioned above the video overlay */}
                <div className={`absolute top-6 left-6 z-[80] ${showControls ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                    <button
                        onClick={toggleVideoMode}
                        className="px-4 py-2 flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all border border-white/10 hover:border-white/30 group"
                    >
                        <ChevronDown className="w-4 h-4 rotate-90 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold text-[9px] tracking-[0.2em] uppercase">Audio</span>
                    </button>
                </div>

                {/* 
                  The YouTube player is injected by MusicContext directly behind this 
                  transparent container via global fixed CSS (`z-[65]`), spanning `h-full`. 
                */}

                {/* The bottom controls spanning ~80px overlaying the video's bottom subtly */}
                <div className={`w-full max-w-4xl mx-auto px-6 lg:px-10 relative z-[80] pt-12 pb-6 bg-gradient-to-t from-black via-black/80 to-transparent ${showControls ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                    {/* Progress */}
                    <div className="space-y-3 mb-5">
                        <div
                            className="h-1 bg-white/20 relative cursor-pointer group rounded-full"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                seek((x / rect.width) * 100);
                            }}
                        >
                            <motion.div
                                className="absolute top-0 left-0 h-full bg-white rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg scale-0 group-hover:scale-100 transition-transform"
                                style={{ left: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono tracking-widest text-gray-300">
                            <span>{formatTime((progress / 100) * (currentSong.duration || 0))}</span>
                            <span>{formatTime(currentSong.duration || 0)}</span>
                        </div>
                    </div>

                    {/* Controls Row aligned to Screenshot 2 */}
                    <div className="flex items-center justify-between pb-2">
                        <button
                            onClick={toggleShuffle}
                            className={`transition-colors ${isShuffle ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Shuffle size={16} strokeWidth={1.5} />
                        </button>

                        <div className="flex items-center space-x-10 md:space-x-14">
                            <button onClick={previousSong} className="hover:scale-110 transition-transform flex items-center justify-center text-white">
                                <SkipBack className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" strokeWidth={1} />
                            </button>

                            <button
                                onClick={togglePlay}
                                className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-xl"
                            >
                                {isPlaying ? (
                                    <Pause className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" strokeWidth={1} />
                                ) : (
                                    <Play className="w-6 h-6 md:w-7 md:h-7 ml-1" fill="currentColor" strokeWidth={1} />
                                )}
                            </button>

                            <button onClick={nextSong} className="hover:scale-110 transition-transform flex items-center justify-center text-white">
                                <SkipForward className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" strokeWidth={1} />
                            </button>
                        </div>

                        <button
                            onClick={toggleRepeat}
                            className={`transition-colors relative ${repeatMode !== 'off' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Repeat size={16} strokeWidth={1.5} />
                            {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>}
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    const nameLength = currentSong.title?.length || 0;
    const titleSize = nameLength > 80 ? 'text-2xl sm:text-3xl lg:text-5xl' :
        nameLength > 50 ? 'text-3xl sm:text-4xl lg:text-6xl' :
            nameLength > 25 ? 'text-4xl sm:text-5xl lg:text-7xl' :
                'text-5xl sm:text-7xl lg:text-8xl';

    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-0 z-[60] bg-background text-foreground overflow-hidden flex flex-col"
        >
            {/* Header */}
            <div className="flex justify-between items-center p-4 md:p-8">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
                >
                    <ChevronDown className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <div className="text-center">
                    <p className="label-text">NOW RESONATING</p>
                    <p className="text-[10px] tracking-[0.2em] font-medium text-gray-400 mt-1 uppercase">{currentSong.genre}</p>
                </div>
                <button className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-muted rounded-full transition-colors">
                    <Share2 className="w-[18px] h-[18px] md:w-5 md:h-5" strokeWidth={1.5} />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 items-center px-6 md:px-12 lg:px-24 pb-12 overflow-y-auto no-scrollbar">

                {/* Vinyl Record Section */}
                <div className="flex justify-center items-center relative perspective-1000">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 1 }}
                        className="relative w-[80vw] max-w-[500px] aspect-square"
                    >
                        {/* Vinyl Base */}
                        <motion.div
                            animate={{ rotate: isPlaying ? 360 : 0 }}
                            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                            className="absolute inset-0 bg-[#0a0a0a] rounded-full shadow-2xl flex items-center justify-center"
                            style={{
                                backgroundImage: `repeating-radial-gradient(circle at center, #111 0px, #111 1px, #1a1a1a 2px, #0a0a0a 3px)`,
                                boxShadow: 'inset 0 0 100px rgba(255,255,255,0.1), 0 30px 60px rgba(0,0,0,0.5)'
                            }}
                        >
                            {/* Inner Album Art */}
                            <div className="w-1/3 h-1/3 rounded-full overflow-hidden border-4 border-[#0a0a0a] relative z-10 shadow-lg">
                                <img src={currentSong.coverUrl} className="w-full h-full object-cover grayscale" alt="" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-4 h-4 rounded-full bg-white/20 backdrop-blur-sm border border-white/30" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Tone Arm (Static but artistic) */}
                        <div className="absolute -top-10 right-0 w-32 h-64 pointer-events-none opacity-20">
                            <div className="w-2 h-full bg-black/5 rounded-full absolute right-8 transform rotate-12" />
                        </div>
                    </motion.div>
                </div>

                {/* Info & Controls Section */}
                <div className="space-y-16 lg:pl-12 relative">
                    {/* Background Visualizer */}
                    <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
                        <Visualizer analyser={analyser} isPlaying={isPlaying} />
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-4">
                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className={`hero-title ${titleSize} leading-tight transition-all duration-300 line-clamp-4 break-words`}
                                title={currentSong.title}
                            >
                                {currentSong.title}
                            </motion.h1>
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="text-2xl font-serif text-gray-500 italic"
                            >
                                {currentSong.artist}
                            </motion.p>
                        </div>

                        <div className="flex items-center space-x-8">
                            <button
                                onClick={() => toggleLike(currentSong._id)}
                                className={`flex items-center space-x-3 text-[10px] tracking-widest uppercase font-medium transition-colors ${isLiked(currentSong._id) ? 'text-foreground' : 'text-gray-400 hover:text-foreground'}`}
                            >
                                <Heart
                                    size={16}
                                    strokeWidth={1.5}
                                    className={isLiked(currentSong._id) ? 'fill-foreground' : ''}
                                />
                                <span>{isLiked(currentSong._id) ? 'IN YOUR LIBRARY' : 'ADD TO LIBRARY'}</span>
                            </button>
                            <div className="w-px h-6 bg-border" />
                            <p className="text-[10px] tracking-widest uppercase font-medium text-gray-400">RELEASED {new Date(currentSong.releaseDate).getFullYear()}</p>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-6">
                        <div
                            className="h-1 bg-border relative cursor-pointer group"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                seek((x / rect.width) * 100);
                            }}
                        >
                            <motion.div
                                className="absolute top-0 left-0 h-full bg-foreground"
                                style={{ width: `${progress}%` }}
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground shadow-lg scale-0 group-hover:scale-100 transition-transform"
                                style={{ left: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[11px] font-mono tracking-widest text-gray-400">
                            <span>{formatTime((progress / 100) * (currentSong.duration || 0))}</span>
                            <span>{formatTime(currentSong.duration || 0)}</span>
                        </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={toggleShuffle}
                            className={`transition-colors ${isShuffle ? 'text-foreground' : 'text-gray-300 hover:text-foreground'}`}
                        >
                            <Shuffle size={20} strokeWidth={1.5} />
                        </button>

                        <div className="flex items-center space-x-6 md:space-x-12">
                            <button onClick={previousSong} className="hover:scale-110 transition-transform flex items-center justify-center">
                                <SkipBack className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" strokeWidth={1} />
                            </button>

                            <button
                                onClick={togglePlay}
                                className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-all shadow-xl shadow-foreground/10"
                            >
                                {isPlaying ? (
                                    <Pause className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" strokeWidth={1} />
                                ) : (
                                    <Play className="w-6 h-6 md:w-8 md:h-8 ml-2" fill="currentColor" strokeWidth={1} />
                                )}
                            </button>

                            <button onClick={nextSong} className="hover:scale-110 transition-transform flex items-center justify-center">
                                <SkipForward className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" strokeWidth={1} />
                            </button>
                        </div>

                        <button
                            onClick={toggleRepeat}
                            className={`transition-colors relative ${repeatMode !== 'off' ? 'text-foreground' : 'text-gray-300 hover:text-foreground'}`}
                        >
                            <Repeat size={20} strokeWidth={1.5} />
                            {repeatMode === 'one' && <span className="absolute -top-2 -right-2 text-[10px] font-bold">1</span>}
                        </button>
                    </div>

                    {/* Volume Bar */}
                    <div className="flex items-center space-x-8 pt-8">
                        <Volume2 size={20} className="text-gray-400" strokeWidth={1.5} />
                        <div className="flex-1 h-0.5 bg-border relative cursor-pointer"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                changeVolume((x / rect.width) * 100);
                            }}>
                            <div className="absolute top-0 left-0 h-full bg-gray-400" style={{ width: `${volume}%` }} />
                        </div>
                        <button
                            onClick={() => toggleVideoMode()}
                            className="text-gray-300 hover:text-foreground transition-colors"
                        >
                            <MonitorPlay size={20} strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsQueueOpen(true);
                            }}
                            className="text-gray-300 hover:text-foreground transition-colors pl-2"
                        >
                            <ListMusic size={20} strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPlaylistModalOpen(true);
                            }}
                            className="text-gray-300 hover:text-foreground transition-colors pl-2"
                        >
                            <MoreHorizontal size={20} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
            </div>

            <AddToPlaylistModal
                isOpen={isPlaylistModalOpen}
                onClose={() => setIsPlaylistModalOpen(false)}
                songId={currentSong._id}
            />

            <QueuePanel
                isOpen={isQueueOpen}
                onClose={() => setIsQueueOpen(false)}
            />
        </motion.div>
    );
};

const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default VinylPlayerPage;
