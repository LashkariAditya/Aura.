import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMobileInView } from '../../hooks/useMobileInView';
import { Trash2 } from 'lucide-react';

const SongListItemImage = ({ song }) => {
    const [imageError, setImageError] = useState(false);
    const { ref, isInView, isMobile } = useMobileInView(0.5);

    return !imageError && song.coverUrl && !song.coverUrl.includes('placeholder') ? (
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

const SongListRow = ({ song, queue, index, playSong, onRemove }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group flex items-center justify-between border-b border-border pb-8 hover:border-foreground transition-colors duration-500 cursor-pointer"
            onClick={() => playSong(song, queue)}
        >
            <div className="flex items-center space-x-4 md:space-x-12 overflow-hidden">
                <span className="font-serif text-2xl md:text-4xl text-muted group-hover:text-foreground transition-colors duration-500 flex-shrink-0">
                    {(index + 1).toString().padStart(2, '0')}
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
            <div className="flex items-center space-x-6 md:space-x-12 uppercase">
                <p className="hidden md:block text-[11px] tracking-widest text-gray-300 font-medium">{song.genre || 'OTHER'}</p>
                <div className="w-px h-6 bg-border hidden md:block" />
                <p className="text-[11px] tracking-widest text-gray-400 font-mono font-bold">
                    {new Date(song.releaseDate || song.createdAt || Date.now()).getFullYear()}
                </p>
                {onRemove && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(song._id);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                        title="Remove from playlist"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default SongListRow;
