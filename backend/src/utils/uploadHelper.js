import { drive, loadCredentials } from '../config/googleDrive.js';
import { Readable } from 'stream';

/**
 * Converts a Buffer to a Readable Stream
 */
const bufferToStream = (buffer) => {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
};

/**
 * Uploads a file to Google Drive and makes it publicly accessible
 * @param {Object} file - The file object from Multer (req.file)
 * @param {String} folderId - Optional Google Drive folder ID
 */
export const uploadToGoogleDrive = async (file, folderId = null) => {
    loadCredentials();

    const fileMetadata = {
        name: `${Date.now()}-${file.originalname}`,
        parents: folderId ? [folderId] : []
    };

    const media = {
        mimeType: file.mimetype,
        body: file.stream || bufferToStream(file.buffer)
    };

    try {
        // 1. Upload the file
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, size, mimeType, webViewLink, webContentLink'
        });

        const fileId = response.data.id;

        // 2. Make the file public (Reader permission)
        // Note: For direct streaming, we'll use the export link or webContentLink
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        // Determine the correct proxy URL based on file type
        const mimeType = response.data.mimeType || file.mimetype || '';
        const isImage = mimeType.startsWith('image/');
        const endpoint = isImage ? 'image' : 'stream';

        return {
            id: fileId,
            size: parseInt(response.data.size) || file.size,
            mimeType: mimeType,
            // Images use the image proxy (cached, optimized); audio/video uses stream proxy
            url: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/songs/${endpoint}/${fileId}`,
            webViewLink: response.data.webViewLink
        };
    } catch (error) {
        console.error('Google Drive Upload Error:', error);
        throw error;
    }
};

/**
 * Deletes a file from Google Drive
 */
export const deleteFromGoogleDrive = async (fileId) => {
    loadCredentials();
    try {
        await drive.files.delete({ fileId });
        return true;
    } catch (error) {
        console.error('Google Drive Delete Error:', error);
        throw error;
    }
};

/**
 * Legacy compatibility with Cloudinary if needed, but redirects to GDrive
 */
export const uploadToCloudinary = async (file, folder, resourceType = 'auto') => {
    console.log('Redirecting Cloudinary upload to Google Drive...');
    const result = await uploadToGoogleDrive(file);
    return {
        secure_url: result.url,
        public_id: result.id
    };
};
