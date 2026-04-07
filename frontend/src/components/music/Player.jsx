import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Volume2, Maximize2, Repeat, Shuffle, MonitorPlay } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Player = () => {
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
        isVideoMode,
        toggleVideoMode
    } = useMusic();

    const location = useLocation();
    const navigate = useNavigate();

    if (!currentSong) return null;

    // Hide if we are on the full vinyl player page
    if (location.pathname === '/player') return null;

    const nameLength = currentSong.title?.length || 0;
    const titleSize = nameLength > 40 ? 'text-xs md:text-sm' :
        nameLength > 20 ? 'text-sm md:text-base' :
            'text-base md:text-lg';

    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-4 md:px-6 h-28 flex items-center"
        >
            <div className="max-w-[1920px] mx-auto w-full grid grid-cols-2 lg:grid-cols-3 items-center">
                {/* Song Info */}
                <Link to="/player" className="flex items-center space-x-4 md:space-x-6 group overflow-hidden min-w-0">
                    <div className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0 bg-muted overflow-hidden relative">
                        <img
                            src={currentSong.coverUrl}
                            alt={currentSong.title}
                            className={`w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110 ${isPlaying ? 'grayscale-0' : ''}`}
                        />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden relative">
                        <div className="animate-marquee">
                            <h4
                                className={`font-serif ${titleSize} leading-tight group-hover:text-black transition-colors`}
                                title={currentSong.title}
                            >
                                {currentSong.title}
                            </h4>
                            <p
                                className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] text-gray-400 mt-1 font-medium"
                                title={currentSong.artist}
                            >
                                {currentSong.artist}
                            </p>
                        </div>
                    </div>
                </Link>

                {/* Controls - Shared between mobile/desktop but rearranged */}
                <div className="flex flex-col items-center space-y-3 md:space-y-4">
                    <div className="flex items-center space-x-6 md:space-x-10">
                        <button
                            onClick={toggleShuffle}
                            className={`hidden md:block transition-colors ${isShuffle ? 'text-black' : 'text-gray-300 hover:text-black'}`}
                        >
                            <Shuffle size={14} />
                        </button>

                        <button onClick={previousSong} className="hidden sm:block text-gray-400 hover:text-black transition-colors">
                            <SkipBack size={20} fill="currentColor" strokeWidth={1} />
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 transition-transform"
                        >
                            {isPlaying ? (
                                <Pause size={18} md:size={20} fill="white" strokeWidth={1} />
                            ) : (
                                <Play size={18} md:size={20} className="ml-1" fill="white" strokeWidth={1} />
                            )}
                        </button>

                        <button onClick={nextSong} className="text-gray-400 hover:text-black transition-colors">
                            <SkipForward size={20} fill="currentColor" strokeWidth={1} />
                        </button>

                        <button
                            onClick={toggleRepeat}
                            className={`hidden md:block transition-colors relative ${repeatMode !== 'off' ? 'text-black' : 'text-gray-300 hover:text-black'}`}
                        >
                            <Repeat size={14} />
                            {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>}
                        </button>
                    </div>

                    {/* Progress Bar - Only visible on desktops/tablets or bigger screens */}
                    <div className="hidden md:flex w-full max-w-md items-center space-x-4">
                        <span className="text-[9px] text-gray-400 font-medium font-mono tabular-nums">
                            {formatTime((progress / 100) * (currentSong.duration || 0))}
                        </span>
                        <div className="flex-1 h-0.5 bg-gray-100 relative cursor-pointer group"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                seek((x / rect.width) * 100);
                            }}>
                            <div
                                className="absolute top-0 left-0 h-full bg-black transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-black opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ left: `${progress}%` }}
                            />
                        </div>
                        <span className="text-[9px] text-gray-400 font-medium font-mono tabular-nums">
                            {formatTime(currentSong.duration || 0)}
                        </span>
                    </div>
                </div>

                {/* Additional Actions */}
                <div className="hidden lg:flex items-center justify-end space-x-8">
                    <div className="flex items-center space-x-4 group w-32">
                        <Volume2 size={16} className="text-gray-400 group-hover:text-black transition-colors" />
                        <div className="flex-1 h-0.5 bg-gray-100 relative cursor-pointer"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                changeVolume((x / rect.width) * 100);
                            }}>
                            <div
                                className="absolute top-0 left-0 h-full bg-black"
                                style={{ width: `${volume}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => {
                                toggleVideoMode();
                                navigate('/player');
                            }}
                            className={`transition-colors flex items-center justify-center hover:scale-110 ${isVideoMode ? 'text-black font-bold' : 'text-gray-400 hover:text-black'}`}
                            title="Toggle Video Mode"
                        >
                            <MonitorPlay size={18} strokeWidth={1.5} />
                        </button>

                        <Link to="/player" className="text-gray-400 hover:text-black transition-colors hover:scale-110 flex items-center justify-center">
                            <Maximize2 size={18} strokeWidth={1.5} />
                        </Link>
                    </div>
                </div>
            </div>
            {/* Mobile Progress Bar - Minimalist slim line at top of player */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gray-50 md:hidden">
                <div
                    className="h-full bg-black transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </motion.div>
    );
};

const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default Player;
