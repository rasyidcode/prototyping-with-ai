import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const ReelContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  will-change: transform;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 15px;
`;

const Overlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: linear-gradient(transparent, rgba(0,0,0,0.8), rgba(0,0,0,0.9));
  color: white;
  border-radius: 0 0 15px 15px;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const Avatar = styled.img`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-right: 15px;
  border: 3px solid #ff6b6b;
  transition: border-color 0.3s;
  &:hover {
    border-color: #4ecdc4;
  }
`;

const Username = styled.strong`
  font-size: 18px;
  color: #fff;
`;

const Description = styled.p`
  margin: 5px 0;
  font-size: 16px;
  line-height: 1.4;
`;

const Music = styled.p`
  margin: 5px 0;
  font-size: 14px;
  color: #4ecdc4;
  font-weight: bold;
`;

const Controls = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  right: 15px;
  bottom: 120px;
  gap: 20px;
`;

const ControlButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 24px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
  &:hover {
    background: rgba(255, 255, 255, 0.4);
    transform: scale(1.1);
  }
  &.liked {
    background: #ff6b6b;
    color: white;
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  border-radius: 15px;
`;

const LikeCount = styled.div`
  font-size: 12px;
  text-align: center;
  margin-top: 5px;
  color: white;
`;

function Reel({ video }) {
    const [liked, setLiked] = useState(false);
    const [comments, setComments] = useState(video.comments);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef();
    const observerRef = useRef();

    useEffect(() => {
        const videoElement = videoRef.current;
        const handleLoadedData = () => setIsVideoLoaded(true);
        const handleError = () => console.error('Video failed to load');

        if (videoElement) {
            videoElement.addEventListener('loadeddata', handleLoadedData);
            videoElement.addEventListener('error', handleError);
        }

        return () => {
            if (videoElement) {
                videoElement.removeEventListener('loadeddata', handleLoadedData);
                videoElement.removeEventListener('error', handleError);
            }
        };
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && isVideoLoaded) {
                    videoRef.current.play().catch(() => {
                        // Ignore play promise rejection
                    });
                } else {
                    videoRef.current.pause();
                }
            },
            { threshold: 0.8, rootMargin: '0px 0px -20% 0px' }
        );
        if (observerRef.current) observer.observe(observerRef.current);
        return () => observer.disconnect();
    }, [isVideoLoaded]);

    const handleLike = () => setLiked(!liked);
    const handleComment = () => setComments([...comments, 'New comment!']);

    return (
        <ReelContainer ref={observerRef}>
            <Video ref={videoRef} controls={false} loop muted preload="auto">
                <source src={video.videoUrl} type="video/mp4" />
            </Video>
            <Overlay>
                <UserInfo>
                    <Avatar src={video.user.avatar} alt={video.user.username} />
                    <Username>{video.user.username}</Username>
                </UserInfo>
                <Description>{video.description}</Description>
                <Music>🎵 {video.music}</Music>
            </Overlay>
            <Controls>
                <div>
                    <ControlButton onClick={handleLike} className={liked ? 'liked' : ''}>
                        {liked ? '❤️' : '🤍'}
                    </ControlButton>
                    <LikeCount>{liked ? video.likes + 1 : video.likes}</LikeCount>
                </div>
                <div>
                    <ControlButton onClick={handleComment}>💬</ControlButton>
                    <LikeCount>{comments.length}</LikeCount>
                </div>
                <ControlButton>📤</ControlButton>
            </Controls>
        </ReelContainer>
    );
}

export default Reel;
