import React, { useRef, useState, useEffect } from 'react';
import './VideoCard.css';

const VideoCard = ({ video, isActive }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [liked, setLiked] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [progress, setProgress] = useState(0);
    const [showHeartAnimation, setShowHeartAnimation] = useState(false);

    useEffect(() => {
        if (isActive) {
            // Small timeout to ensure stability when scrolling fast
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Auto-play was prevented:", error);
                    setIsPlaying(false);
                });
            }
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
            videoRef.current.currentTime = 0; // Reset video when scrolled away
        }
    }, [isActive]);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            if (duration) {
                setProgress((current / duration) * 100);
            }
        }
    };

    const togglePlay = () => {
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    const toggleLike = (e) => {
        e.stopPropagation();
        setLiked(!liked);
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        setIsMuted(!isMuted);
    };

    const handleDoubleTap = (e) => {
        e.stopPropagation();
        if (!liked) {
            setLiked(true);
        }
        setShowHeartAnimation(true);
        setTimeout(() => setShowHeartAnimation(false), 800);
    };

    return (
        <div className="video-card">
            <div className="video-header">
                <h3>Reels</h3>
                <div className="camera-icon">📷</div>
            </div>

            <video
                ref={videoRef}
                className="video-player"
                src={video.url}
                loop
                muted={isMuted}
                onClick={togglePlay}
                onDoubleClick={handleDoubleTap}
                onTimeUpdate={handleTimeUpdate}
                playsInline
            />

            <div className="video-overlay">
                {/* Sidebar Actions */}
                <div className="actions-sidebar">
                    <div className="action-item" onClick={toggleLike}>
                        <span className="icon" style={{ color: liked ? 'var(--color-accent)' : 'white' }}>
                            {liked ? '❤️' : '🤍'}
                        </span>
                        <span className="count">{liked ? parseInt(video.likes) + 1 : video.likes}</span>
                    </div>
                    <div className="action-item">
                        <span className="icon">💬</span>
                        <span className="count">{video.comments}</span>
                    </div>
                    <div className="action-item">
                        <span className="icon">↗️</span>
                        <span className="count">Share</span>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="video-footer">
                    <div className="user-info">
                        <div className="avatar"></div>
                        <strong>@{video.username}</strong>
                        <button className="follow-btn">Follow</button>
                    </div>
                    <p className="description">{video.description}</p>
                    <div className="song-ticker">
                        <span className="music-icon">🎵</span>
                        <marquee>{video.song}</marquee>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Big Heart Animation */}
            {showHeartAnimation && (
                <div className="big-heart-animation">❤️</div>
            )}

            {!isPlaying && (
                <div className="play-icon-overlay" onClick={togglePlay}>
                    ▶️
                </div>
            )}

            {/* Mute Toggle */}
            <div className="mute-toggle" onClick={toggleMute}>
                {isMuted ? '🔇' : '🔊'}
            </div>
        </div>
    );
};

export default VideoCard;
