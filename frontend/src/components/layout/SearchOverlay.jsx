import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import artistService from '../../services/artistService';
import youtubeService from '../../services/youtubeService';
import { useDebounce } from '../../hooks/useDebounce';
import { useMusic } from '../../context/MusicContext';

const SearchOverlay = ({ isOpen, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState({ songs: [], artists: [] });
    const [loading, setLoading] = useState(false);
    const debouncedSearch = useDebounce(searchTerm, 400);
    const inputRef = useRef(null);
    const { playSong } = useMusic();

    // Mouse position for cursor trail
    useEffect(() => {
        const handleMouseMove = (e) => {
            const x = (e.clientX / window.innerWidth) * 100;
            const y = (e.clientY / window.innerHeight) * 100;
            document.documentElement.style.setProperty('--x', `${x}%`);
            document.documentElement.style.setProperty('--y', `${y}%`);
        };

        if (isOpen) {
            window.addEventListener('mousemove', handleMouseMove);
            if (inputRef.current) {
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        }
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isOpen]);

    useEffect(() => {
        const fetchResults = async () => {
            if (!debouncedSearch || debouncedSearch.trim().length < 2) {
                setResults({ songs: [], artists: [] });
                return;
            }

            setLoading(true);
            try {
                // Fetch artists and youtube results in parallel
                // User requested search output to be exclusively from YouTube to ensure full catalog access
                const [artistsRes, youtubeRes] = await Promise.all([
                    artistService.getArtists(),
                    youtubeService.search(debouncedSearch).catch((err) => {
                        console.error('YOUTUBE_FETCH_ERROR:', err);
                        return { data: { songs: [] } }; // Graceful fallback
                    })
                ]);

                // Filter artists locally since there isn't a dedicated search endpoint for them yet
                const filteredArtists = (artistsRes.data || []).filter(a =>
                    a.name.toLowerCase().includes(debouncedSearch.toLowerCase())
                );

                // Use only YouTube songs for search results as requested
                const allSongs = [
                    ...(youtubeRes.data?.songs || [])
                ];

                setResults({
                    songs: allSongs,
                    artists: filteredArtists.slice(0, 6)
                });
            } catch (error) {
                console.error('SEARCH_ERROR:', error);
                setResults({ songs: [], artists: [] });
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [debouncedSearch]);

    const handleClose = () => {
        setSearchTerm('');
        onClose();
    };

    const handlePlaySong = (song) => {
        playSong(song, results.songs);
        handleClose();
    };

    // Combine for the grid
    const allResults = useMemo(() => {
        const items = [];
        // Put songs first as they are usually the primary search target
        results.songs.forEach((s) => items.push({ ...s, itemType: 'song' }));
        results.artists.forEach((a) => items.push({ ...a, itemType: 'artist', title: a.name, subtitle: a.role || 'Sonic Architect', image: a.photoUrl || a.avatar }));
        return items;
    }, [results]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    className="fixed inset-0 z-[1000] bg-background dark:bg-black text-foreground selection:bg-white/10 overflow-x-hidden overflow-y-auto font-sans"
                >
                    <div className="custom-cursor-trail"></div>

                    <div className="relative flex min-h-screen flex-col">
                        {/* Header */}
                        <header className="flex items-center justify-between px-6 py-10 md:px-12 z-20">
                            <div className="text-xl font-bold tracking-tighter uppercase font-sans">
                                AURA.
                            </div>
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={handleClose}
                                    className="material-symbols-outlined text-3xl hover:rotate-90 transition-transform duration-500 opacity-60 hover:opacity-100"
                                >
                                    close
                                </button>
                            </div>
                        </header>

                        {/* Search Input Section */}
                        <main className="flex-1 flex flex-col px-6 md:px-12 pt-8 md:pt-12 z-10">
                            <div className="max-w-4xl w-full mx-auto flex flex-col items-center">
                                <div className="mb-12 w-full max-w-2xl text-center">
                                    <span className="text-[10px] uppercase tracking-[0.3em] opacity-50 mb-4 block font-bold">Experimental Discovery v.03</span>
                                    <div className="relative group">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-transparent border-0 border-b-2 border-slate-200 dark:border-white/10 focus:border-slate-900 dark:focus:border-white focus:ring-0 text-xl md:text-3xl font-serif italic py-3 transition-all duration-700 placeholder:opacity-20 placeholder:text-slate-500 text-center"
                                            placeholder="Type to search artists, albums..."
                                        />
                                        <div className="absolute right-0 bottom-4">

                                            {loading ? (
                                                <Loader2 className="animate-spin opacity-30" size={20} />
                                            ) : (
                                                <span className="material-symbols-outlined text-2xl opacity-30 group-focus-within:opacity-100 transition-opacity">north_east</span>
                                            )}
                                        </div>
                                    </div>
                                </div>



                                {/* Results Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12 pb-32">
                                    {allResults.map((item, index) => (
                                        <motion.div
                                            key={item._id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="artist-item group relative cursor-pointer"
                                            onClick={() => item.itemType === 'song' ? handlePlaySong(item) : null}
                                        >
                                            {/* Centered Pop-up Image relative to item */}
                                            <div className="artist-image opacity-0 absolute -top-32 left-1/2 -translate-x-1/2 w-48 h-64 overflow-hidden pointer-events-none transition-all duration-500 ease-out z-10 shadow-2xl">
                                                <img
                                                    alt={item.title || item.name}
                                                    className="w-full h-full object-cover grayscale brightness-90"
                                                    src={item.itemType === 'song' ? item.coverUrl : (item.photoUrl || item.avatar || 'https://placehold.co/400x500')}
                                                />
                                            </div>

                                            <div className="border-t border-slate-200 dark:border-white/10 pt-4 group-hover:border-white transition-colors duration-500">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="text-xl md:text-2xl font-serif italic truncate w-full pr-8">
                                                        {item.title || item.name}
                                                    </h3>
                                                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 shrink-0">
                                                        {(index + 1).toString().padStart(2, '0')}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] uppercase tracking-widest opacity-50 font-bold">
                                                    {item.itemType === 'song' ? `${item.artist} • Track` : (item.role || 'Sonic Architect')}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}


                                    {searchTerm && allResults.length === 0 && !loading && (
                                        <div className="col-span-full py-20 text-center opacity-30">
                                            <p className="font-serif text-3xl italic">No resonations found in this sector...</p>
                                        </div>
                                    )}
                                </div>

                                {!searchTerm && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-[0.03] select-none">
                                        <h2 className="text-[12vw] font-serif italic leading-none">
                                            ESSENTIAL <br /> SENSATIONS
                                        </h2>
                                    </div>
                                )}
                            </div>
                        </main>

                        {/* Footer */}
                        <footer className="mt-auto border-t border-slate-200 dark:border-white/10 px-6 md:px-12 py-10 flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 text-[10px] font-bold uppercase tracking-[0.4em]">
                            <div>© 2026 AURA Music Lab</div>
                            <div className="flex gap-8 items-center cursor-default">
                                <span>Filter by:</span>
                                <span className="underline decoration-2 underline-offset-4">Recent</span>
                                <span className="opacity-40">Popular</span>
                                <span className="opacity-40">Curated</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className="material-symbols-outlined">language</span>
                                <span className="material-symbols-outlined">info</span>
                            </div>
                        </footer>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SearchOverlay;
