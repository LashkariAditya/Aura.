import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedAudioTypes = [
        'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/aac',
        'video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime', 'video/x-matroska'
    ];
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    if (file.fieldname === 'audio') {
        if (allowedAudioTypes.includes(file.mimetype) || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid audio/video file type'), false);
        }
    } else if (file.fieldname === 'cover' || file.fieldname === 'avatar') {
        if (allowedImageTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid ${file.fieldname} file type`), false);
        }
    } else {
        cb(null, true);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit
    },
});

export default upload;
