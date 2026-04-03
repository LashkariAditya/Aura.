import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import YouTube from 'react-youtube';
import { useAuth } from './AuthContext';
import songService from '../services/songService';

const MusicContext = createContext();

export const MusicProvider = ({ children }) => {
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(70);
    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isShuffle, setIsShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState('off');
    const [likedSongsIds, setLikedSongsIds] = useState([]);
    const [isVideoMode, setIsVideoMode] = useState(false);

    // Refs for state accessed inside callbacks
    const queueRef = useRef([]);
    const currentIndexRef = useRef(0);
    const isShuffleRef = useRef(false);
    const repeatModeRef = useRef('off');
    const ytPlayerRef = useRef(null);
    const isYtRef = useRef(false);

    // Playback control lock for restricted sync room users
    const canChangeRef = useRef(true);
    const setPlaybackLock = useCallback((canControl) => {
        canChangeRef.current = canControl;
    }, []);

    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            setLikedSongsIds(user.likedSongs?.map(id => id.toString()) || []);
        } else {
            setLikedSongsIds([]);
        }
    }, [user]);

    const isLiked = (songId) => likedSongsIds.includes(songId?.toString());

    const toggleLike = async (songId) => {
        if (!user) return;
        try {
            await songService.toggleLike(songId);
            setLikedSongsIds(prev =>
                prev.includes(songId.toString())
                    ? prev.filter(id => id !== songId.toString())
                    : [...prev, songId.toString()]
            );
        } catch (error) {
            console.error('LIKE_TOGGLE_ERROR:', error);
        }
    };

    const soundRef = useRef(null);
    const intervalRef = useRef(null);
    const analyserRef = useRef(null);

    const getAnalyser = () => {
        if (!analyserRef.current && Howler.ctx) {
            try {
                const analyser = Howler.ctx.createAnalyser();
                analyser.fftSize = 256;
                analyserRef.current = analyser;

                if (Howler.masterGain) {
                    Howler.masterGain.connect(analyser);
                }
            } catch (e) {
                console.warn('VISUALIZER_ATTACH_FAILED:', e);
            }
        }
        return analyserRef.current;
    };

    const playSong = useCallback((song, songQueue = [], force = false) => {
        if (!force && !canChangeRef.current) return;

        const isYoutube = song._id?.toString().startsWith('yt_') || song.audioUrl?.toString().startsWith('yt_') || song.isYoutube;
        isYtRef.current = isYoutube;

        // Clean up previous howler sound
        if (soundRef.current && !isYoutube) {
            const oldSound = soundRef.current;
            oldSound.fade(oldSound.volume(), 0, 800);
            setTimeout(() => {
                oldSound.stop();
                oldSound.unload();
            }, 800);
        } else if (soundRef.current && isYoutube) {
            soundRef.current.stop();
            soundRef.current.unload();
            soundRef.current = null;
        }

        // Clean up or prepare Youtube player
        if (!isYoutube && ytPlayerRef.current) {
            ytPlayerRef.current.stopVideo();
        }

        if (songQueue.length > 0) {
            setQueue(songQueue);
            queueRef.current = songQueue;
            const index = songQueue.findIndex(s => s._id === song._id);
            const newIndex = index !== -1 ? index : 0;
            setCurrentIndex(newIndex);
            currentIndexRef.current = newIndex;
        }

        setCurrentSong(song);
        setIsLoading(true);
        setIsPlaying(true); // Optimistic UI update

        if (isYoutube) {
            if (Howler.ctx && Howler.ctx.state === 'running') {
                Howler.ctx.suspend(); // Save CPU if possible
            }
            if (ytPlayerRef.current) {
                let ytId = song._id?.toString().startsWith('yt_') ? song._id.replace('yt_', '') : song.audioUrl?.replace('yt_', '');
                if (!ytId && song.isYoutube) ytId = song.audioUrl;

                ytPlayerRef.current.loadVideoById(ytId);
                ytPlayerRef.current.playVideo();
                ytPlayerRef.current.setVolume(volume);
                startTimer();
            }
        } else {
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                Howler.ctx.resume();
            }

            const sound = new Howl({
                src: [song.audioUrl],
                html5: true, // Crucial for streaming large files
                preload: true,
                format: ['mp3', 'wav', 'mpeg', 'webm', 'ogg'],
                crossOrigin: 'anonymous',
                volume: 0,
                onplay: () => {
                    setIsPlaying(true);
                    setIsLoading(false);
                    startTimer();
                },
                onload: () => {
                    setIsLoading(false);
                },
                onloaderror: (id, err) => {
                    console.error('AUDIO_LOAD_ERROR:', err);
                    setIsLoading(false);
                },
                onplayerror: (id, err) => {
                    console.error('AUDIO_PLAY_ERROR:', err);
                    setIsLoading(false);
                    sound.once('unlock', () => sound.play());
                },
                onpause: () => {
                    setIsPlaying(false);
                    stopTimer();
                },
                onend: () => {
                    handleSongEnd();
                }
            });

            soundRef.current = sound;
            sound.play();
            sound.fade(0, volume / 100, 400);

            // Preload next cover image
            if (songQueue.length > 0) {
                const nextIdx = (currentIndex + 1) % songQueue.length;
                const nextSong = songQueue[nextIdx];
                if (nextSong) {
                    const preloader = new Image();
                    preloader.src = nextSong.coverUrl;
                }
            }
        }
    }, [volume, currentIndex]);

    const togglePlay = useCallback((force = false) => {
        if (!force && !canChangeRef.current) return;

        if (isYtRef.current && ytPlayerRef.current) {
            const state = ytPlayerRef.current.getPlayerState();
            if (state === 1) { // PLAYING
                ytPlayerRef.current.pauseVideo();
            } else {
                ytPlayerRef.current.playVideo();
            }
            return;
        }

        if (!soundRef.current) return;
        if (isPlaying) {
            soundRef.current.pause();
        } else {
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                Howler.ctx.resume();
            }
            soundRef.current.play();
        }
    }, [isPlaying]);

    const setPlaying = useCallback((shouldPlay, force = false) => {
        if (!force && !canChangeRef.current) return;

        if (isYtRef.current && ytPlayerRef.current) {
            if (shouldPlay) ytPlayerRef.current.playVideo();
            else ytPlayerRef.current.pauseVideo();
            return;
        }

        if (!soundRef.current) return;
        if (shouldPlay && !isPlaying) {
            if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume();
            soundRef.current.play();
        } else if (!shouldPlay && isPlaying) {
            soundRef.current.pause();
        }
    }, [isPlaying]);

    const stopTimer = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    const startTimer = () => {
        stopTimer();
        intervalRef.current = setInterval(() => {
            if (isYtRef.current && ytPlayerRef.current) {
                const state = ytPlayerRef.current.getPlayerState();
                if (state === 1) { // 1 = playing
                    const time = ytPlayerRef.current.getCurrentTime();
                    const duration = ytPlayerRef.current.getDuration();
                    if (duration > 0) {
                        setProgress((time / duration) * 100);
                    }
                }
            } else if (soundRef.current && soundRef.current.playing()) {
                const current = soundRef.current.seek();
                const duration = soundRef.current.duration();
                if (duration > 0) {
                    setProgress((current / duration) * 100);
                }
            }
        }, 1000);
    };

    const seek = useCallback((value, isPercent = true, force = false) => {
        if (!force && !canChangeRef.current) return;

        if (isYtRef.current && ytPlayerRef.current) {
            const duration = ytPlayerRef.current.getDuration();
            if (duration > 0) {
                const targetTime = isPercent ? (value / 100) * duration : value;
                ytPlayerRef.current.seekTo(targetTime, true);
                setProgress(isPercent ? value : (targetTime / duration) * 100);
            }
            return;
        }

        if (soundRef.current) {
            const duration = soundRef.current.duration();
            const targetTime = isPercent ? (value / 100) * duration : value;
            soundRef.current.seek(targetTime);
            if (isPercent) {
                setProgress(value);
            } else {
                setProgress((targetTime / duration) * 100);
            }
        }
    }, []);

    const changeVolume = (value) => {
        setVolume(value);
        if (isYtRef.current && ytPlayerRef.current) {
            ytPlayerRef.current.setVolume(value);
        } else if (soundRef.current) {
            soundRef.current.volume(value / 100);
        }
    };

    const nextSong = (force = false) => {
        if (!force && !canChangeRef.current) return;
        const currentQueue = queueRef.current;
        const currentIdx = currentIndexRef.current;
        const shuffle = isShuffleRef.current;

        if (currentQueue.length === 0) return;
        let nextIdx;
        if (shuffle) {
            nextIdx = Math.floor(Math.random() * currentQueue.length);
        } else {
            nextIdx = (currentIdx + 1) % currentQueue.length;
        }
        playSong(currentQueue[nextIdx]);
        setCurrentIndex(nextIdx);
        currentIndexRef.current = nextIdx;
    };

    const previousSong = (force = false) => {
        if (!force && !canChangeRef.current) return;
        const currentQueue = queueRef.current;
        const currentIdx = currentIndexRef.current;

        if (currentQueue.length === 0) return;
        const prevIdx = (currentIdx - 1 + currentQueue.length) % currentQueue.length;
        playSong(currentQueue[prevIdx]);
        setCurrentIndex(prevIdx);
        currentIndexRef.current = prevIdx;
    };

    const handleSongEnd = () => {
        const mode = repeatModeRef.current;
        const currentQueue = queueRef.current;
        const currentIdx = currentIndexRef.current;
        const shuffle = isShuffleRef.current;

        if (mode === 'one') {
            if (isYtRef.current && ytPlayerRef.current) {
                ytPlayerRef.current.seekTo(0);
                ytPlayerRef.current.playVideo();
            } else if (soundRef.current) {
                soundRef.current.play();
            }
        } else if (mode === 'all' || currentIdx < currentQueue.length - 1 || shuffle) {
            nextSong(true);
        } else {
            setIsPlaying(false);
            setProgress(0);
        }
    };

    const toggleShuffle = () => {
        setIsShuffle(!isShuffle);
        isShuffleRef.current = !isShuffleRef.current;
    };

    const toggleRepeat = () => {
        const modes = ['off', 'one', 'all'];
        const nextMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
        setRepeatMode(nextMode);
        repeatModeRef.current = nextMode;
    };

    const getCurrentTime = () => {
        if (isYtRef.current && ytPlayerRef.current) {
            return ytPlayerRef.current.getCurrentTime() || 0;
        }
        return soundRef.current?.seek() || 0;
    };

    const getDuration = () => {
        if (isYtRef.current && ytPlayerRef.current) {
            return ytPlayerRef.current.getDuration() || 0;
        }
        return soundRef.current?.duration() || 0;
    };

    return (
        <MusicContext.Provider
            value={{
                currentSong,
                isPlaying,
                isLoading,
                progress,
                volume,
                queue,
                currentIndex,
                isShuffle,
                repeatMode,
                playSong,
                togglePlay,
                setPlaying,
                seek,
                changeVolume,
                nextSong,
                previousSong,
                toggleShuffle,
                toggleRepeat,
                isLiked,
                toggleLike,
                currentTime: getCurrentTime(),
                duration: getDuration(),
                analyser: analyserRef.current,
                setPlaybackLock,
                isVideoMode,
                toggleVideoMode: () => setIsVideoMode(!isVideoMode)
            }}
        >
            {children}
            {/* Hidden YouTube Player embedded securely in DOM to stream audio securely using verified Youtube Iframe API natively without breaking API endpoints! 
                Important note: To bypass backend timeouts, the best method always integrates playback directly into the frontend context block! */}
            <div
                className={
                    isVideoMode && isYtRef.current
                        ? "fixed inset-0 z-[65] bg-black overflow-hidden flex items-center justify-center pointer-events-none"
                        : "fixed overflow-hidden opacity-0 pointer-events-none w-0 h-0"
                }
                style={!isVideoMode ? { zIndex: -9999 } : {}}
            >
                <YouTube
                    videoId="" // will be loaded via ref
                    opts={{
                        height: '100%',
                        width: '100%',
                        host: 'https://www.youtube-nocookie.com',
                        playerVars: {
                            autoplay: 0,
                            controls: 0,
                            disablekb: 1,
                            fs: 0,
                            rel: 0,
                            modestbranding: 1,
                            enablejsapi: 1,
                            origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
                            widget_referrer: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
                            vq: 'hd1080'
                        },
                    }}
                    onReady={(event) => {
                        ytPlayerRef.current = event.target;
                        window.ytPlayer = event.target; // Expose for quality control
                        ytPlayerRef.current.setVolume(volume);
                    }}
                    onStateChange={(event) => {
                        const YTState = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 };
                        if (event.data === YTState.PLAYING) {
                            setIsPlaying(true);
                            setIsLoading(false);
                            startTimer();
                        } else if (event.data === YTState.PAUSED) {
                            setIsPlaying(false);
                            stopTimer();
                        } else if (event.data === YTState.ENDED) {
                            handleSongEnd();
                        } else if (event.data === YTState.BUFFERING) {
                            setIsLoading(true);
                        }
                    }}
                    onError={(e) => {
                        console.error('YOUTUBE_PLAYER_ERROR', e);
                        setIsLoading(false);
                        nextSong(true);
                    }}
                    className="w-full h-full pointer-events-none select-none"
                />

                {/* Physical overlay to brutally cover any remaining watermark at the bottom right */}
                <div className="absolute right-0 bottom-0 w-32 h-16 bg-black z-[70] pointer-events-none"></div>
            </div>
        </MusicContext.Provider>
    );
};

export const useMusic = () => useContext(MusicContext);
