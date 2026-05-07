import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MoreHorizontal, Plus } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { useAuth } from '../../context/AuthContext';
import songService from '../../services/songService';
import toast from 'react-hot-toast';
import CoverImage from './CoverImage';
import { useMobileInView } from '../../hooks/useMobileInView';
import AddToPlaylistModal from './AddToPlaylistModal';

const SongCard = ({ song, queue = [], aspectRatio = 'aspect-[4/5]', className = "" }) => {
    const { playSong, currentSong, isPlaying, togglePlay, addToQueue } = useMusic();
    const { user } = useAuth();
    const { ref: cardRef, isInView, isMobile } = useMobileInView(0.5);
    const [isLiked, setIsLiked] = useState(
        user?.likedSongs?.includes(song._id) || false
    );
    const [isModalOpen, setIsModalOpen] = useState(false);

    const isCurrent = currentSong?._id === song._id;

    const handlePlayClick = (e) => {
        e.stopPropagation();
        if (isCurrent) {
            togglePlay();
        } else {
            playSong(song, queue);
            if (!song._id?.toString().startsWith('yt_')) {
                songService.incrementPlays(song._id).catch(() => { });
            }
        }
    };

    const handleLike = async (e) => {
        e.stopPropagation();
        if (!user) {
            if (song._id?.toString().startsWith('yt_')) {
                toast.error('YOUTUBE LINKS CANNOT BE LIKED');
                return;
            }
            toast.error('PLEASE LOGIN TO LIKE');
            return;
        }
        if (song._id?.toString().startsWith('yt_')) {
            toast.error('YOUTUBE LINKS CANNOT BE LIKED');
            return;
        }
        try {
            await songService.toggleLike(song._id);
            setIsLiked(!isLiked);
            toast.success(isLiked ? 'REMOVED FROM LIBRARY' : 'ADDED TO LIBRARY');
        } catch (error) {
            toast.error('FAILED TO UPDATE');
        }
    };

    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className={`group cursor-pointer ${className}`}
        >
            {/* Image Container */}
            <div
                onClick={handlePlayClick}
                className={`${aspectRatio} bg-muted mb-6 overflow-hidden relative group-hover:shadow-2xl transition-shadow duration-500 cursor-pointer`}
            >
                <CoverImage
                    src={song.coverUrl}
                    alt={song.title}
                    title={song.title}
                    artist={song.artist}
                    genre={song.genre}
                    imgRef={cardRef}
                    imgClassName={`w-full h-full object-cover group-hover:scale-105 transition-all duration-1000 ease-out ${isMobile && isInView ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'
                        }`}
                />

                {/* Playing Indicator */}
                {isCurrent && isPlaying && (
                    <div className="absolute top-4 right-4 flex space-x-0.5 h-3 items-end">
                        <div className="w-0.5 bg-white animate-[bounce_0.6s_infinite]" />
                        <div className="w-0.5 bg-white animate-[bounce_0.8s_infinite] delay-100" />
                        <div className="w-0.5 bg-white animate-[bounce_0.7s_infinite] delay-200" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="space-y-2">
                {/* Title */}
                <h3 className="font-serif text-[13px] md:text-2xl leading-tight group-hover:text-foreground transition-colors duration-300">
                    {song.title}
                </h3>

                {/* Metadata */}
                <div className="flex justify-between items-end">
                    <p className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-gray-400 font-medium truncate pr-2">
                        {song.artist}
                    </p>
                    <span className="text-[8px] md:text-[10px] text-gray-300 font-light tracking-widest shrink-0">
                        {new Date(song.releaseDate || Date.now()).getFullYear()}
                    </span>
                </div>

                {/* Actions Row - Always visible on mobile, hover on desktop */}
                <div className="flex items-center justify-between pt-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex space-x-4">
                        <button
                            onClick={handleLike}
                            className="hover:scale-110 transition-transform"
                        >
                            <Heart
                                size={16}
                                className={isLiked ? 'fill-foreground stroke-foreground' : 'text-gray-400 hover:text-foreground'}
                                strokeWidth={1.5}
                            />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                addToQueue(song);
                            }}
                            className="text-gray-400 hover:text-foreground transition-colors"
                            title="Add to queue"
                        >
                            <Plus size={16} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (song._id?.toString().startsWith('yt_')) {
                                    toast.error('YOUTUBE LINKS CANNOT BE ADDED TO PLAYLISTS');
                                    return;
                                }
                                if (!user) {
                                    toast.error('PLEASE LOGIN TO CREATE PLAYLISTS');
                                    return;
                                }
                                setIsModalOpen(true);
                            }}
                            className="text-gray-400 hover:text-foreground transition-colors"
                            title="Add to playlist"
                        >
                            <MoreHorizontal size={16} />
                        </button>
                    </div>

                    <span className="text-[8px] md:text-[9px] text-gray-400 uppercase tracking-widest font-medium">
                        {song.genre}
                    </span>
                </div>

                {/* Divider Line */}
                <div className="h-px bg-border mt-4
                        group-hover:bg-foreground
                        transition-all duration-700 origin-left" />
            </div>

            {isModalOpen && (
                <AddToPlaylistModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    songId={song._id}
                />
            )}
        </motion.article>
    );
};

export default SongCard;
