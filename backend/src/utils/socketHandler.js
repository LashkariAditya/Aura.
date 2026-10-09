import mongoose from 'mongoose';
import Room from '../models/Room.js';
import User from '../models/User.js';
import Song from '../models/Song.js';

// Active sockets per room for real-time listener tracking
// activeRoomSockets: Map<roomCode, Map<socketId, listenerObj>>
const activeRoomSockets = new Map();
const socketToRoom = new Map();

const resolveUserId = async (userId) => {
    if (!userId) return null;
    if (typeof userId === 'string' && userId.startsWith('kp_')) {
        const user = await User.findOne({ kindeId: userId });
        if (user) return user._id.toString();
    }
    if (mongoose.Types.ObjectId.isValid(userId)) {
        return userId.toString();
    }
    return userId;
};

const formatRoomData = async (room, roomCode) => {
    if (!room) return null;
    const roomObj = room.toObject ? room.toObject() : room;

    // Host
    if (roomObj.host) {
        const hIdStr = roomObj.host._id ? roomObj.host._id.toString() : roomObj.host.toString();
        if (mongoose.Types.ObjectId.isValid(hIdStr)) {
            const hostUser = await User.findById(hIdStr).select('name email avatar role');
            if (hostUser) roomObj.host = hostUser;
        } else {
            roomObj.host = { _id: hIdStr, name: 'Room Host', avatar: '' };
        }
    }

    // Participants come ONLY from currently connected active sockets — never from stale DB state.
    // This ensures refreshed/disconnected users disappear immediately.
    const activeMap = activeRoomSockets.get(roomCode) || new Map();
    const activeListeners = Array.from(activeMap.values());

    // Deduplicate by userId (_id); keep the most recently seen socket entry for each user
    const participantsByUserId = new Map();
    for (const listener of activeListeners) {
        const key = listener._id?.toString() || listener.socketId;
        if (!participantsByUserId.has(key)) {
            participantsByUserId.set(key, listener);
        }
    }

    roomObj.participants = Array.from(participantsByUserId.values());

    // Kings
    if (Array.isArray(roomObj.kings)) {
        const populatedKings = [];
        for (const kId of roomObj.kings) {
            const kIdStr = kId?._id ? kId._id.toString() : kId?.toString();
            if (kIdStr && mongoose.Types.ObjectId.isValid(kIdStr)) {
                const kUser = await User.findById(kIdStr).select('name email avatar role');
                if (kUser) {
                    populatedKings.push(kUser);
                } else {
                    populatedKings.push({ _id: kIdStr, name: 'Room King', avatar: '' });
                }
            } else if (kIdStr) {
                populatedKings.push({ _id: kIdStr, name: 'Room King', avatar: '' });
            }
        }
        roomObj.kings = populatedKings;
    }

    // CurrentSong
    if (roomObj.currentSong) {
        const songId = typeof roomObj.currentSong === 'object' ? (roomObj.currentSong._id || roomObj.currentSong.id) : roomObj.currentSong;
        if (typeof songId === 'string' && mongoose.Types.ObjectId.isValid(songId)) {
            const dbSong = await Song.findById(songId);
            if (dbSong) roomObj.currentSong = dbSong;
        }
    }

    return roomObj;
};

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        socket.on('join_room', async ({ roomCode, userId: rawUserId, userProfile }) => {
            try {
                let userId = await resolveUserId(rawUserId);
                if (!userId) userId = `guest_${socket.id.substring(0, 8)}`;
                console.log(`SYNC_DEBUG: join_room attempt - User: ${userId}, Room: ${roomCode}, Socket: ${socket.id}`);

                // Store userId on socket for disconnect cleanup
                socket._userId = userId;
                socket._roomCode = roomCode;
                
                socket.join(roomCode);
                socketToRoom.set(socket.id, roomCode);

                // Build listener metadata for active room tracking
                let listenerObj = {
                    socketId: socket.id,
                    _id: userId,
                    name: userProfile?.name || 'Guest Listener',
                    avatar: userProfile?.avatar || ''
                };

                if (mongoose.Types.ObjectId.isValid(userId)) {
                    const dbUser = await User.findById(userId).select('name avatar role');
                    if (dbUser) {
                        listenerObj.name = dbUser.name;
                        listenerObj.avatar = dbUser.avatar;
                        listenerObj.role = dbUser.role;
                    }
                }

                if (!activeRoomSockets.has(roomCode)) {
                    activeRoomSockets.set(roomCode, new Map());
                }
                activeRoomSockets.get(roomCode).set(socket.id, listenerObj);

                let room = await Room.findOne({ roomCode });

                if (!room) {
                    console.log(`SYNC_DEBUG: Creating new room ${roomCode} for host ${userId}`);
                    room = await Room.create({
                        roomCode,
                        host: userId,
                        participants: [userId]
                    });
                } else {
                    const isParticipant = room.participants.some(p =>
                        (p?._id?.toString() || p?.toString()) === userId
                    );
                    if (!isParticipant) {
                        console.log(`SYNC_DEBUG: Adding participant ${userId} to room ${roomCode}`);
                        room.participants.push(userId);
                        await room.save();
                    }
                }

                const roomData = await formatRoomData(room, roomCode);
                console.log(`SYNC_DEBUG: Emitting room_data for ${roomCode}. Participants: ${roomData?.participants?.length}`);
                io.to(roomCode).emit('room_data', roomData);
            } catch (error) {
                console.error('JOIN_ROOM_ERROR:', error);
            }
        });

        socket.on('playback_update', async ({ roomCode, isPlaying, currentTime, songId, songData, userId: rawUserId }) => {
            try {
                const userId = await resolveUserId(rawUserId);
                const room = await Room.findOne({ roomCode });
                if (room) {
                    const hostId = room.host?._id ? room.host._id.toString() : room.host?.toString();
                    const isHost = hostId === userId || socket.id === hostId;
                    const isKing = room.kings?.some(k => (k?._id?.toString() || k?.toString()) === userId);

                    if (isHost || isKing || room.isCollaborative) {
                        // Broadcast immediately to room members with high-precision server timestamp
                        socket.to(roomCode).emit('playback_sync', {
                            isPlaying,
                            currentTime,
                            songId,
                            songData,
                            userId,
                            timestamp: Date.now()
                        });

                        // Update room state in DB asynchronously
                        room.isPlaying = isPlaying;
                        room.currentTime = currentTime;
                        if (songData) {
                            room.currentSong = songData;
                        } else if (songId) {
                            room.currentSong = songId;
                        }
                        room.save().catch(err => console.error('PLAYBACK_SAVE_ERROR:', err));
                    }
                }
            } catch (error) {
                console.error('PLAYBACK_UPDATE_ERROR:', error);
            }
        });

        socket.on('toggle_collaborative', async ({ roomCode, userId: rawUserId }) => {
            try {
                const userId = await resolveUserId(rawUserId);
                const room = await Room.findOne({ roomCode });
                if (room) {
                    const hostId = room.host?._id ? room.host._id.toString() : room.host?.toString();
                    if (hostId === userId) {
                        room.isCollaborative = !room.isCollaborative;
                        await room.save();
                        io.to(roomCode).emit('room_update', { isCollaborative: room.isCollaborative });
                    }
                }
            } catch (error) {
                console.error('TOGGLE_COLLAB_ERROR:', error);
            }
        });

        socket.on('toggle_king', async ({ roomCode, targetUserId: rawTargetId, requesterId: rawRequesterId }) => {
            try {
                const targetUserId = await resolveUserId(rawTargetId);
                const requesterId = await resolveUserId(rawRequesterId);
                const room = await Room.findOne({ roomCode });
                if (room) {
                    const hostId = room.host?._id ? room.host._id.toString() : room.host?.toString();
                    if (hostId === requesterId) {
                        const index = room.kings.findIndex(k => (k?._id?.toString() || k?.toString()) === targetUserId);
                        if (index > -1) {
                            room.kings.splice(index, 1);
                        } else {
                            room.kings.push(targetUserId);
                        }
                        await room.save();
                        const roomData = await formatRoomData(room, roomCode);
                        io.to(roomCode).emit('room_data', roomData);
                    }
                }
            } catch (error) {
                console.error('TOGGLE_KING_ERROR:', error);
            }
        });

        socket.on('leave_room', async ({ roomCode, userId: rawUserId }) => {
            socket.leave(roomCode);
            if (activeRoomSockets.has(roomCode)) {
                activeRoomSockets.get(roomCode).delete(socket.id);
            }
            socketToRoom.delete(socket.id);
            socket._userId = null;
            socket._roomCode = null;

            try {
                const userId = await resolveUserId(rawUserId);
                const room = await Room.findOne({ roomCode });
                if (room) {
                    if (userId) {
                        room.participants = room.participants.filter(p => (p?._id?.toString() || p?.toString()) !== userId);
                        room.kings = room.kings.filter(k => (k?._id?.toString() || k?.toString()) !== userId);
                        await room.save();
                    }
                    const roomData = await formatRoomData(room, roomCode);
                    io.to(roomCode).emit('room_data', roomData);
                }
            } catch (error) {
                console.error('LEAVE_ROOM_ERROR:', error);
            }
        });

        socket.on('send_message', ({ roomCode, message, user }) => {
            io.to(roomCode).emit('new_message', {
                text: message,
                user: user || 'Guest',
                timestamp: new Date()
            });
        });

        socket.on('update_queue', async ({ roomCode, queue }) => {
            try {
                await Room.findOneAndUpdate({ roomCode }, { queue });
                socket.to(roomCode).emit('queue_updated', queue);
            } catch (error) {
                console.error('UPDATE_QUEUE_ERROR:', error);
            }
        });

        socket.on('disconnect', async () => {
            console.log('Client disconnected:', socket.id);
            const roomCode = socketToRoom.get(socket.id);
            if (roomCode) {
                socketToRoom.delete(socket.id);
                if (activeRoomSockets.has(roomCode)) {
                    activeRoomSockets.get(roomCode).delete(socket.id);
                }

                // Remove from DB participants so stale data never resurfaces
                const userId = socket._userId;
                try {
                    const room = await Room.findOne({ roomCode });
                    if (room) {
                        if (userId) {
                            // Only remove from DB if no OTHER socket for same user is still in the room
                            const activeMap = activeRoomSockets.get(roomCode) || new Map();
                            const stillConnected = Array.from(activeMap.values()).some(
                                l => l._id?.toString() === userId
                            );
                            if (!stillConnected) {
                                room.participants = room.participants.filter(
                                    p => (p?._id?.toString() || p?.toString()) !== userId
                                );
                                room.kings = room.kings.filter(
                                    k => (k?._id?.toString() || k?.toString()) !== userId
                                );
                                await room.save();
                            }
                        }
                        const roomData = await formatRoomData(room, roomCode);
                        io.to(roomCode).emit('room_data', roomData);
                    }
                } catch (err) {
                    console.error('DISCONNECT_ROOM_UPDATE_ERROR:', err);
                }
            }
        });
    });
};

export default socketHandler;
