import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Music, Upload } from 'lucide-react';
import playlistService from '../../services/playlistService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AddToPlaylistModal = ({ isOpen, onClose, songId }) => {
    const { user } = useAuth();
    const [playlists, setPlaylists] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);

    useEffect(() => {
        if (isOpen && user) {
            fetchPlaylists();
            setIsCreating(false);
            setNewPlaylistName('');
            setIsPublic(true);
            setCoverFile(null);
            setCoverPreview(null);
        }
    }, [isOpen, user]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const fetchPlaylists = async () => {
        setIsLoading(true);
        try {
            const res = await playlistService.getUserPlaylists(user._id);
            setPlaylists(res.data?.playlists || []);
        } catch (error) {
            console.error('Error fetching playlists:', error);
            toast.error('FAILED TO LOAD PLAYLISTS');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePlaylist = async (e) => {
        e.preventDefault();
        if (!newPlaylistName.trim()) return;

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', newPlaylistName);
            formData.append('description', '');
            formData.append('isPublic', isPublic.toString());
            if (coverFile) {
                formData.append('cover', coverFile);
            }

            const res = await playlistService.createPlaylist(formData);
            if (res.success === false) {
                toast.error(res.message.toUpperCase());
                setIsLoading(false);
                return;
            }
            const newPlaylist = res.data?.playlist;
            if (newPlaylist) {
                setPlaylists(prev => [...prev, newPlaylist]);
                toast.success(`PLAYLIST CREATED${!isPublic ? ` (CODE: ${newPlaylist.shareCode})` : ''}`, { duration: 5000 });
                await handleAddToPlaylist(newPlaylist._id, newPlaylist.name);
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
            if (error.response?.data?.message) {
                toast.error(error.response.data.message.toUpperCase());
            } else {
                toast.error('FAILED TO CREATE PLAYLIST');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToPlaylist = async (playlistId, playlistName) => {
        try {
            await playlistService.addSong(playlistId, songId);
            toast.success(`ADDED TO ${playlistName.toUpperCase()}`);
            onClose();
        } catch (error) {
            console.error('Error adding to playlist:', error);
            toast.error('FAILED TO ADD TO PLAYLIST');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-md bg-background border border-border shadow-2xl relative flex flex-col max-h-[80vh]"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-gray-400 hover:text-foreground transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <div className="p-8 border-b border-border text-center">
                        <span className="text-[10px] tracking-[0.4em] font-bold uppercase text-gray-400">CURATION</span>
                        <h2 className="font-serif text-3xl mt-2 tracking-tight">ADD TO PLAYLIST</h2>
                    </div>

                    <div className="p-8 overflow-y-auto flex-1 no-scrollbar space-y-6">
                        {isCreating ? (
                            <form onSubmit={handleCreatePlaylist} className="space-y-6">
                                <div>
                                    <label className="text-[10px] tracking-widest uppercase text-gray-400 block mb-2">PLAYLIST NAME</label>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={newPlaylistName}
                                        onChange={(e) => setNewPlaylistName(e.target.value)}
                                        className="w-full bg-transparent border-b border-border py-4 text-xl font-serif focus:outline-none focus:border-foreground transition-colors mb-6"
                                        placeholder="Enter name..."
                                    />

                                    <label className="text-[10px] tracking-widest uppercase text-gray-400 block mb-2">COVER ART (OPTIONAL)</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="w-full h-32 border border-dashed border-border flex items-center justify-center relative overflow-hidden group hover:border-foreground transition-colors">
                                            {coverPreview ? (
                                                <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                                            ) : (
                                                <div className="flex flex-col items-center space-y-2 text-gray-400 group-hover:text-foreground transition-colors">
                                                    <Upload size={20} />
                                                    <span className="text-[10px] tracking-widest uppercase">SELECT PHOTO</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="flex-1 py-4 text-[11px] tracking-widest uppercase border border-border hover:bg-muted font-bold transition-colors"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newPlaylistName.trim()}
                                        className="flex-1 py-4 text-[11px] tracking-widest uppercase bg-foreground text-background font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        CREATE & ADD
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full py-6 border border-dashed border-border flex flex-col items-center justify-center space-y-2 hover:border-foreground hover:bg-muted/10 transition-all group"
                                >
                                    <Plus size={24} className="text-gray-400 group-hover:text-foreground transition-colors" />
                                    <span className="text-[11px] tracking-[0.2em] font-bold uppercase text-gray-400 group-hover:text-foreground transition-colors">NEW PLAYLIST</span>
                                </button>

                                {isLoading ? (
                                    <div className="py-12 flex justify-center">
                                        <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
                                    </div>
                                ) : playlists.length > 0 ? (
                                    <div className="space-y-2">
                                        <h3 className="text-[10px] tracking-[0.3em] font-bold uppercase text-gray-400 mb-6">YOUR ARCHIVE</h3>
                                        {playlists.map(playlist => (
                                            <button
                                                key={playlist._id}
                                                onClick={() => handleAddToPlaylist(playlist._id, playlist.name)}
                                                className="w-full flex items-center space-x-4 p-4 hover:bg-muted/30 transition-colors border border-transparent hover:border-border text-left group"
                                            >
                                                <div className="w-12 h-12 bg-muted flex items-center justify-center flex-shrink-0">
                                                    {playlist.coverUrl ? (
                                                        <img src={playlist.coverUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                                                    ) : (
                                                        <Music size={16} className="text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-serif text-lg truncate group-hover:text-foreground">{playlist.name}</h4>
                                                    <p className="text-[10px] tracking-widest text-gray-400 font-medium">{playlist.songs?.length || 0} TRACKS</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-gray-400 text-sm italic font-serif">
                                        No existing playlists identified.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AddToPlaylistModal;
