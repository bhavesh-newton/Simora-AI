import React, { useState, useRef, useEffect } from 'react';

const VideoPlayerWithCaptions = ({ videoFile, captions }) => {
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCaption, setCurrentCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);

  // Create video URL when component mounts
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      
      // Cleanup URL when component unmounts or video changes
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [videoFile]);

  // Update current time when video plays
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded');
    };
    const handleError = (e) => {
      console.error('Video error:', e);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
    };
  }, [videoUrl]);

  // Find current caption based on video time
  useEffect(() => {
    if (!captions || captions.length === 0) {
      setCurrentCaption('');
      return;
    }

    const current = captions.find(caption => 
      currentTime >= caption.start && currentTime <= caption.end
    );

    setCurrentCaption(current ? current.text : '');
  }, [currentTime, captions]);

  if (!videoFile) {
    return null;
  }

  return (
    <div className="video-player-container">
      <h3>Video with Generated Captions 🎬</h3>
      <div className="video-wrapper">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="video-player"
            preload="metadata"
            onLoadStart={() => console.log('Video loading started')}
            onCanPlay={() => console.log('Video can play')}
            onError={(e) => console.error('Video error:', e)}
          />
        ) : (
          <div className="video-loading">Loading video...</div>
        )}
        {currentCaption && (
          <div className="caption-overlay">
            {currentCaption}
          </div>
        )}
      </div>
      <div className="video-info">
        <p>Current time: {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(1).padStart(4, '0')}</p>
        <p>Status: {isPlaying ? 'Playing' : 'Paused'}</p>
        {captions && (
          <p>Captions: {captions.length} segments loaded</p>
        )}
      </div>
    </div>
  );
};

export default VideoPlayerWithCaptions;