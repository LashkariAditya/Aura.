import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Music, ArrowUpRight } from 'lucide-react';

const PlaylistHoverRow = ({ playlist, index }) => {
    const [imageError, setImageError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const coverUrl = playlist.coverUrl || (playlist.songs && playlist.songs.length > 0 ? playlist.songs[0].coverUrl : null);
    const hasPhoto = coverUrl && !coverUrl.includes('placeholder') && !imageError;

    return (
        <motion.div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            animate={{ height: isHovered ? 'auto' : (window.innerWidth < 768 ? 120 : 180) }}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
            className="artist-row relative border-b border-foreground/5 cursor-pointer overflow-hidden block"
        >
            <Link to={`/playlist/${playlist._id}`} className="absolute inset-0 z-20"></Link>

            {/* Initial View: Number, Centered Name, Arrow */}
            <div
                className={`artist-name-container absolute inset-0 flex items-center justify-between px-4 md:px-12 z-10 transition-all duration-700 ${isHovered ? 'opacity-0 -translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}
            >
                <span className="text-[10px] md:text-xs font-mono text-foreground/30 uppercase tracking-[0.3em] w-12 shrink-0">
                    {(index + 1).toString().padStart(2, '0')}
                </span>

                <div className="flex-1 flex justify-center overflow-hidden">
                    <h2 className="serif-display text-4xl md:text-7xl lg:text-[10rem] leading-[0.8] tracking-tighter uppercase text-outline text-center px-4 truncate w-full">
                        {playlist.name}
                    </h2>
                </div>

                <div className="w-12 shrink-0 flex justify-end">
                    <ArrowUpRight size={32} className="text-foreground/30 transition-colors duration-500" strokeWidth={1} />
                </div>
            </div>

            {/* Hover View: Expanded Image */}
            <div
                className={`artist-image-container relative w-full overflow-hidden transition-all duration-1000 ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                style={{ height: isHovered ? 'auto' : '100%', minHeight: isHovered ? '600px' : '0' }}
            >
                {hasPhoto ? (
                    <div className="w-full h-full flex justify-center bg-black/10">
                        <img
                            src={coverUrl}
                            alt={playlist.name}
                            className="w-full h-[600px] object-cover grayscale hover:grayscale-0 transition-all duration-1000 ease-out"
                            onError={() => setImageError(true)}
                        />
                    </div>
                ) : (
                    <div className="w-full h-[600px] flex flex-col items-center justify-center bg-muted grayscale">
                        <Music size={120} className="text-foreground/10" strokeWidth={0.5} />
                        <span className="serif-display text-4xl md:text-8xl lg:text-[12rem] text-foreground/5 absolute uppercase tracking-tighter select-none px-4 text-center">
                            {playlist.name}
                        </span>
                    </div>
                )}

                {/* Floating Info on Hover */}
                <div className="absolute bottom-12 left-12 z-20">
                    <p className="text-[10px] tracking-[0.5em] text-white/60 mb-2 font-bold uppercase drop-shadow-md">
                        {playlist.isPublic ? 'SONIC CURATION' : 'PRIVATE CURATION'}
                    </p>
                    <h3 className="serif-display text-4xl text-white italic drop-shadow-md">{playlist.name}</h3>
                </div>
            </div>
        </motion.div>
    );
};

export default PlaylistHoverRow;
