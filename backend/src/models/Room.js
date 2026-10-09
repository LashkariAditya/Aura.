import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    roomCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    host: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    participants: [{
        type: mongoose.Schema.Types.Mixed
    }],
    kings: [{
        type: mongoose.Schema.Types.Mixed
    }],
    currentSong: {
        type: mongoose.Schema.Types.Mixed
    },
    isPlaying: {
        type: Boolean,
        default: false
    },
    currentTime: {
        type: Number,
        default: 0
    },
    queue: [{
        type: mongoose.Schema.Types.Mixed
    }],
    isCollaborative: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Room = mongoose.model('Room', roomSchema);

export default Room;
