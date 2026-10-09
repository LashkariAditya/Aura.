import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, LogOut, Radio, Send, X, ShieldAlert, ShieldCheck, MessageCircle, Crown } from 'lucide-react';
import { useSync } from '../../context/SyncContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SyncOverlay = ({ isOpen, onClose, onToggleChat }) => {
    const {
        roomCode,
        participants,
        kings,
        isHost,
        isKing,
        hostId,
        joinRoom,
        leaveRoom,
        isCollaborative,
        toggleCollaborative,
        toggleKing
    } = useSync();

    const [joinInput, setJoinInput] = useState('');
    const { user } = useAuth();

    const requireAuth = () => {
        if (user) return true;
        toast.error('PLEASE LOGIN TO USE SYNC');
        return false;
    };

    const handleJoin = (e) => {
        e.preventDefault();
        let code = joinInput.trim().toUpperCase();
        if (code.startsWith('#')) code = code.substring(1);
        if (code) {
            joinRoom(code);
            setJoinInput('');
        }
    };

    const handleCreate = () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        joinRoom(code);
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-0 mt-4 w-80 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden z-[60] [backdrop-filter:blur(20px)]"
        >
            {/* Dark gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            <div className="p-6 space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] tracking-[0.3em] font-bold text-white/70 uppercase">Sync Status</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white">
                        <X size={14} />
                    </button>
                </div>

                {!roomCode ? (
                    <div className="space-y-4">
                        <button
                            onClick={handleCreate}
                            className="w-full py-3 bg-white text-black text-[10px] tracking-[0.2em] font-bold rounded-xl flex items-center justify-center space-x-2 hover:bg-white/90 transition-colors"
                        >
                            <Radio size={14} />
                            <span>CREATE ROOM</span>
                        </button>

                        <div className="relative flex items-center">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="px-3 text-[9px] text-white/50 font-bold uppercase tracking-widest">OR</span>
                            <div className="flex-grow border-t border-white/10"></div>
                        </div>

                        <form onSubmit={handleJoin} className="space-y-2">
                            <input
                                type="text"
                                placeholder="ENTER CODE"
                                value={joinInput}
                                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-[10px] tracking-[0.2em] font-bold text-white focus:outline-none focus:border-white/40 transition-colors"
                            />
                            <button
                                type="submit"
                                className="w-full py-3 border border-white/20 text-[10px] tracking-[0.2em] font-bold text-white rounded-xl hover:bg-white/10 transition-colors"
                            >
                                JOIN ROOM
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] text-white/60 font-bold mb-1 uppercase tracking-widest">Active Room</p>
                                <p className="text-xl font-bold tracking-tight text-white">#{roomCode}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="text-right mr-2">
                                    <p className="text-[8px] text-white/60 uppercase font-bold">Participants</p>
                                    <p className="text-[12px] font-bold text-white">{participants.length}</p>
                                </div>
                                <button
                                    onClick={leaveRoom}
                                    className="p-2 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500/30 border border-red-500/20 transition-colors"
                                    title="Leave Room"
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <p className="text-[9px] text-white/70 font-bold uppercase tracking-widest">Connected Listeners</p>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-hide pr-1">
                                {participants.length === 0 ? (
                                    <p className="text-[10px] text-white/30 text-center py-4 italic">No participants detected...</p>
                                ) : (
                                    participants.map((p, idx) => {
                                        const pId = p._id?.toString() || p.socketId || `listener_${idx}`;
                                        const currentUserId = (user?._id || user?.id)?.toString();
                                        const isCurrentUser = Boolean(currentUserId && p._id?.toString() === currentUserId);
                                        const isRoomHost = p._id?.toString() === hostId?.toString() || p.socketId === hostId?.toString();
                                        const isRoomKing = kings.some(k => (k._id || k).toString() === pId);

                                        return (
                                            <div key={pId || idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/[0.08] transition-colors">
                                                <div className="flex items-center space-x-3 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-full bg-white/10 ring-1 ring-white/20 flex items-center justify-center text-[11px] font-bold text-white overflow-hidden shrink-0">
                                                        {p.avatar ? (
                                                            <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            (p.name || 'G')[0].toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[11px] font-bold text-white truncate">
                                                            {p.name || 'Guest Listener'}
                                                            {isCurrentUser && (
                                                                <span className="ml-1 text-[8px] text-white/50">(YOU)</span>
                                                            )}
                                                        </span>
                                                        {isRoomHost && (
                                                            <span className="text-[7px] text-green-400 uppercase font-extrabold tracking-widest mt-0.5">Room Architect</span>
                                                        )}
                                                        {!isRoomHost && isRoomKing && (
                                                            <span className="text-[7px] text-yellow-500 uppercase font-extrabold tracking-widest mt-0.5 flex items-center">
                                                                <Crown size={8} className="mr-1" /> Room King
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-2 shrink-0">
                                                    {isHost && !isCurrentUser && (
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => toggleKing(p._id)}
                                                                className={`p-1.5 rounded-lg border transition-all ${isRoomKing
                                                                    ? 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30'
                                                                    : 'text-white/40 bg-white/5 border-white/10 hover:text-white/70 hover:bg-white/10'}`}
                                                                title={isRoomKing ? "Remove King Privilege" : "Make King (Playback Control)"}
                                                            >
                                                                <Crown size={14} />
                                                            </button>
                                                            <button
                                                                onClick={toggleCollaborative}
                                                                className={`p-1.5 rounded-lg border transition-all ${isCollaborative
                                                                    ? 'text-green-500 bg-green-500/20 border-green-500/30'
                                                                    : 'text-white/40 bg-white/5 border-white/10 hover:text-white/70 hover:bg-white/10'}`}
                                                                title={isCollaborative ? "Disable Participant Controls" : "Enable Participant Controls"}
                                                            >
                                                                {isCollaborative ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {!isHost && isRoomKing && (
                                                        <div className="p-1.5 text-yellow-500 bg-yellow-500/10 rounded-lg border border-yellow-500/20" title="Room King">
                                                            <Crown size={14} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={onToggleChat}
                                className="flex-grow py-3 bg-white/5 border border-white/10 text-[10px] tracking-[0.2em] font-bold text-white rounded-xl flex items-center justify-center space-x-2 hover:bg-white/10 transition-colors"
                            >
                                <MessageCircle size={14} />
                                <span>CHAT</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default SyncOverlay;
