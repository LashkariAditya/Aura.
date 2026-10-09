import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useMusic } from './MusicContext';
import songService from '../services/songService';

const SyncContext = createContext();

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

export const SyncProvider = ({ children }) => {
    const { user } = useAuth();
    const { playSong, togglePlay, setPlaying, seek, currentSong, isPlaying, currentTime, getCurrentTime, setPlaybackLock } = useMusic();

    const [socket, setSocket] = useState(null);
    const [roomCode, setRoomCode] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [kings, setKings] = useState([]);
    const [messages, setMessages] = useState([]);
    const [isHost, setIsHost] = useState(false);
    const [isKing, setIsKing] = useState(false);
    const [hostId, setHostId] = useState(null);
    const [isCollaborative, setIsCollaborative] = useState(false);
    const lastSyncedSongId = useRef(null);
    const lastBroadcastData = useRef({ isPlaying: null, songId: null, time: 0 });

    const playingRef = useRef(isPlaying);
    const songRef = useRef(currentSong);
    const timeRef = useRef(currentTime);
    const roomCodeRef = useRef(roomCode);
    const userRef = useRef(user);

    useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { songRef.current = currentSong; }, [currentSong]);
    useEffect(() => { timeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
    useEffect(() => { userRef.current = user; }, [user]);

    useEffect(() => {
        const newSocket = io(BACKEND_URL, {
            withCredentials: true,
        });
        setSocket(newSocket);

        // When the user refreshes or closes the tab, emit leave_room immediately
        // so the server removes them from the room's participant list without waiting for TCP disconnect.
        const handleBeforeUnload = () => {
            const currentRoom = roomCodeRef.current;
            const uid = userRef.current ? (userRef.current._id || userRef.current.id) : null;
            if (newSocket && currentRoom) {
                newSocket.emit('leave_room', { roomCode: currentRoom, userId: uid });
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (newSocket) newSocket.disconnect();
        };
    }, []);

    const joinRoom = useCallback((code) => {
        if (socket) {
            const uid = user ? (user._id || user.id) : null;
            const userProfile = user ? { name: user.name, avatar: user.avatar } : { name: 'Guest Listener', avatar: '' };
            socket.emit('join_room', { roomCode: code, userId: uid, userProfile });
        }
    }, [socket, user]);

    const leaveRoom = useCallback(() => {
        if (socket && roomCode) {
            const uid = user ? (user._id || user.id) : null;
            socket.emit('leave_room', { roomCode, userId: uid });
            setRoomCode(null);
            setParticipants([]);
            setKings([]);
            setMessages([]);
            setIsHost(false);
            setIsKing(false);
            setHostId(null);
            setIsCollaborative(false);
        }
    }, [socket, roomCode, user]);

    const toggleCollaborative = useCallback(() => {
        if (socket && roomCode && isHost) {
            const uid = user ? (user._id || user.id) : null;
            socket.emit('toggle_collaborative', { roomCode, userId: uid });
        }
    }, [socket, roomCode, isHost, user]);

    const toggleKing = useCallback((targetUserId) => {
        if (socket && roomCode && isHost) {
            const uid = user ? (user._id || user.id) : null;
            socket.emit('toggle_king', { roomCode, targetUserId, requesterId: uid });
        }
    }, [socket, roomCode, isHost, user]);

    const updatePlayback = useCallback((state, forceBroadcast = false) => {
        if (socket && roomCode && (isHost || isKing || isCollaborative)) {
            const uid = user ? (user._id || user.id) : null;
            const targetSongId = state.songId || currentSong?._id || currentSong?.id || currentSong?.audioUrl;
            const liveTime = getCurrentTime ? getCurrentTime() : (state.currentTime !== undefined ? state.currentTime : 0);
            const targetPlaying = state.isPlaying !== undefined ? state.isPlaying : isPlaying;

            // Check if this update is actually a change to avoid redundant traffic
            const isChange = forceBroadcast ||
                targetPlaying !== lastBroadcastData.current.isPlaying ||
                targetSongId !== lastBroadcastData.current.songId ||
                Math.abs(liveTime - lastBroadcastData.current.time) > 0.5;

            if (isChange) {
                socket.emit('playback_update', {
                    roomCode,
                    isPlaying: targetPlaying,
                    currentTime: liveTime,
                    songId: targetSongId,
                    songData: currentSong,
                    userId: uid
                });
                lastBroadcastData.current = {
                    isPlaying: targetPlaying,
                    songId: targetSongId,
                    time: liveTime
                };
            }
        }
    }, [socket, roomCode, isHost, isKing, isCollaborative, user, currentSong, getCurrentTime, isPlaying]);

    // Update playback lock state
    const canControlPlayback = !roomCode || isHost || isKing || isCollaborative;
    useEffect(() => {
        setPlaybackLock(canControlPlayback);
    }, [canControlPlayback, setPlaybackLock]);

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('room_data', async (data) => {
            if (!data) return;
            setRoomCode(data.roomCode);
            setParticipants(data.participants || []);
            setKings(data.kings || []);

            const currentUserId = (user?._id || user?.id)?.toString();
            const hId = (data.host?._id || data.host)?.toString();

            setHostId(hId);
            const isNowHost = Boolean(currentUserId && hId && currentUserId === hId);
            setIsHost(isNowHost);

            const isNowKing = data.kings?.some(k => (k._id || k).toString() === currentUserId);
            setIsKing(isNowKing);

            setIsCollaborative(!!data.isCollaborative);

            if (!isNowHost && !isNowKing && data.currentSong) {
                const song = data.currentSong;
                const songId = typeof song === 'object' ? (song._id || song.id) : song;
                const currentId = songRef.current?._id || songRef.current?.id;

                if (songId && songId !== currentId && songId !== lastSyncedSongId.current) {
                    try {
                        lastSyncedSongId.current = songId;
                        const initialTime = data.currentTime || 0;
                        if (typeof song === 'object' && (song.audioUrl || song.title)) {
                            playSong(song, [], true, initialTime);
                        } else if (typeof songId === 'string' && songId.startsWith('yt_')) {
                            playSong({ _id: songId, audioUrl: songId, isYoutube: true }, [], true, initialTime);
                        } else if (typeof songId === 'string' && /^[0-9a-fA-F]{24}$/.test(songId)) {
                            const response = await songService.getSongById(songId);
                            if (response?.success && response?.data?.song) {
                                playSong(response.data.song, [], true, initialTime);
                            }
                        }
                    } catch (error) {
                        console.error('INITIAL_SYNC_ERROR:', error);
                        lastSyncedSongId.current = null;
                    }
                }

                if (data.isPlaying !== undefined) setPlaying(data.isPlaying, true);
                if (data.currentTime !== undefined) {
                    const myTime = getCurrentTime ? getCurrentTime() : timeRef.current;
                    if (Math.abs(data.currentTime - myTime) > 0.3) {
                        seek(data.currentTime, false, true);
                    }
                }
            }
        });

        socket.on('room_update', (data) => {
            if (data.isCollaborative !== undefined) setIsCollaborative(data.isCollaborative);
        });

        socket.on('playback_sync', async ({ isPlaying: syncPlaying, currentTime: syncTime, songId, songData, userId: senderId, timestamp: serverTimestamp }) => {
            const currentUserId = (user?._id || user?.id)?.toString();
            if (senderId && senderId === currentUserId) return; // Prevent echo feedback loops

            // Compute exact network latency adjustment
            const latencySec = serverTimestamp ? Math.max(0, (Date.now() - serverTimestamp) / 1000) : 0;
            const adjustedTime = (syncTime !== undefined) ? syncTime + latencySec : undefined;

            const currentId = songRef.current?._id || songRef.current?.id || songRef.current?.audioUrl;

            if ((songData || songId) && (songId !== currentId || (songData && songData._id !== currentId)) && songId !== lastSyncedSongId.current) {
                lastSyncedSongId.current = songId || songData?._id;
                try {
                    if (songData && typeof songData === 'object') {
                        playSong(songData, [], true, adjustedTime);
                    } else if (typeof songId === 'string' && (songId.startsWith('yt_') || songId.startsWith('http'))) {
                        playSong({ _id: songId, audioUrl: songId, isYoutube: songId.startsWith('yt_') }, [], true, adjustedTime);
                    } else if (typeof songId === 'string' && /^[0-9a-fA-F]{24}$/.test(songId)) {
                        const response = await songService.getSongById(songId);
                        if (response?.success && response?.data?.song) {
                            playSong(response.data.song, [], true, adjustedTime);
                        }
                    }
                } catch (e) {
                    console.error('SYNC_PLAYBACK_SONG_ERROR:', e);
                }
            }

            if (syncPlaying !== undefined && syncPlaying !== playingRef.current) {
                setPlaying(syncPlaying, true);
            }

            if (adjustedTime !== undefined) {
                const myLiveTime = getCurrentTime ? getCurrentTime() : timeRef.current;
                const drift = Math.abs(adjustedTime - myLiveTime);
                if (drift > 0.2) { // 200ms precision threshold
                    seek(adjustedTime, false, true);
                }
            }
        });

        socket.on('new_message', (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        return () => {
            socket.off('room_data');
            socket.off('room_update');
            socket.off('playback_sync');
            socket.off('new_message');
        };
    }, [socket, user, isHost, isKing, isCollaborative, playSong, setPlaying, seek, getCurrentTime]);

    const sendMessage = (text) => {
        if (socket && roomCode) {
            socket.emit('send_message', { roomCode, message: text, user: user?.name || 'Guest' });
        }
    };

    // Host/King: Periodic sync (Heartbeat) - Sends live time every 1s to keep all members tightly synced
    useEffect(() => {
        if (!roomCode || (!isHost && !isKing && !isCollaborative)) return;

        const interval = setInterval(() => {
            if (isPlaying) {
                const liveTime = getCurrentTime ? getCurrentTime() : 0;
                updatePlayback({
                    isPlaying: true,
                    currentTime: liveTime,
                    songId: currentSong?._id || currentSong?.id || currentSong?.audioUrl
                }, true);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlaying, currentSong, roomCode, isHost, isKing, isCollaborative, updatePlayback, getCurrentTime]);

    // Host/King: Immediate sync on state change (Play/Pause/Track)
    useEffect(() => {
        if (!roomCode || (!isHost && !isKing && !isCollaborative)) return;

        const songId = currentSong?._id || currentSong?.id || currentSong?.audioUrl;
        console.log('SYNC_DEBUG: Broadcasting state change', { isPlaying, songId });
        updatePlayback({
            isPlaying,
            currentTime,
            songId
        });
    }, [isPlaying, currentSong, roomCode, isHost, isKing, isCollaborative, updatePlayback]);

    return (
        <SyncContext.Provider value={{
            roomCode,
            participants,
            kings,
            messages,
            isHost,
            isKing,
            hostId,
            isCollaborative,
            joinRoom,
            leaveRoom,
            toggleCollaborative,
            toggleKing,
            sendMessage,
            updatePlayback,
            canControlPlayback: !roomCode || isHost || isKing || isCollaborative
        }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => useContext(SyncContext);
