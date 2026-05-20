import React, { useState, useEffect, useRef } from 'react';
import VideoCard from './VideoCard';
import './Feed.css';
import { VIDEOS } from '../data/mockVideos';

const Feed = () => {
    const [activeVideoId, setActiveVideoId] = useState(VIDEOS[0].id);
    const videoRefs = useRef([]);

    useEffect(() => {
        const observerOptions = {
            root: null, // viewport
            rootMargin: '0px',
            threshold: 0.6, // Video must be 60% visible to be "active"
        };

        const handleIntersection = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // entry.target.id should correspond to the video ID
                    const id = Number(entry.target.getAttribute('data-id'));
                    setActiveVideoId(id);
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersection, observerOptions);

        videoRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => {
            if (videoRefs.current) {
                videoRefs.current.forEach((ref) => {
                    if (ref) observer.unobserve(ref);
                });
            }
        };
    }, []);

    return (
        <div className="feed">
            {VIDEOS.map((video, index) => (
                <div
                    key={video.id}
                    data-id={video.id}
                    ref={el => videoRefs.current[index] = el}
                    className="video-container"
                >
                    <VideoCard video={video} isActive={activeVideoId === video.id} />
                </div>
            ))}
        </div>
    );
};

export default Feed;
