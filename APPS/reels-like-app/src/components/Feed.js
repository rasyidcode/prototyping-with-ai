import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import Reel from './Reel';
import { mockVideos } from '../mockData';

const FeedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  gap: 0;
  @media (min-width: 768px) {
    max-width: 600px;
  }
`;

const LoadingText = styled.div`
  color: white;
  font-size: 18px;
  text-align: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(5px);
`;

function Feed() {
    const [videos, setVideos] = useState(mockVideos.slice(0, 5)); // Start with 5
    const [loading, setLoading] = useState(false);
    const observerRef = useRef();

    const loadMore = useCallback(() => {
        if (loading) return;
        setLoading(true);
        setTimeout(() => {
            const nextBatch = mockVideos.slice(videos.length, videos.length + 5);
            setVideos(prev => [...prev, ...nextBatch]);
            setLoading(false);
        }, 1000); // Simulate API delay
    }, [loading, videos.length]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && videos.length < mockVideos.length) {
                    loadMore();
                }
            },
            { threshold: 1.0 }
        );
        if (observerRef.current) observer.observe(observerRef.current);
        return () => observer.disconnect();
    }, [videos.length, loadMore]);

    return (
        <FeedContainer>
            {videos.map(video => (
                <Reel key={video.id} video={video} />
            ))}
            {loading && <LoadingText>Loading more reels...</LoadingText>}
            <div ref={observerRef} style={{ height: '10px' }} />
        </FeedContainer>
    );
}

export default Feed;
