import express from 'express';
import { searchYouTube, getYouTubePlaylist, matchYouTube } from '../controllers/youtubeController.js';

const router = express.Router();

router.get('/search', searchYouTube);
router.get('/playlist', getYouTubePlaylist);
router.get('/match', matchYouTube);

export default router;
