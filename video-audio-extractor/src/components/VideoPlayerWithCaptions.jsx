import React, { useState, useRef, useEffect } from 'react';

const VideoPlayerWithCaptions = ({ videoFile, captions }) => {
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCaption, setCurrentCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [processedCaptions, setProcessedCaptions] = useState([]);
  const [currentWords, setCurrentWords] = useState([]);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(0);
  
  // Font options for captions
  const fontOptions = [
    { value: 'Inter', label: 'Inter (Modern)' },
    { value: 'Arial', label: 'Arial (Classic)' },
    { value: 'Georgia', label: 'Georgia (Serif)' }
  ];

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
      setDuration(video.duration);
    };
    const handleError = (e) => {
      console.error('Video error:', e);
    };
    const handleVolumeChange = () => {
      setVolume(video.volume);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [videoUrl]);

  // Process captions into smaller chunks when captions change
  useEffect(() => {
    if (!captions || captions.length === 0) {
      setProcessedCaptions([]);
      return;
    }

    const processed = [];
    captions.forEach(caption => {
      const words = caption.text.split(' ');
      const maxWordsPerSegment = 6; // Limit words per caption
      const segmentDuration = (caption.end - caption.start) / Math.ceil(words.length / maxWordsPerSegment);
      
      for (let i = 0; i < words.length; i += maxWordsPerSegment) {
        const segmentWords = words.slice(i, i + maxWordsPerSegment);
        const segmentStart = caption.start + (i / maxWordsPerSegment) * segmentDuration;
        const segmentEnd = Math.min(caption.start + ((i + maxWordsPerSegment) / maxWordsPerSegment) * segmentDuration, caption.end);
        
        processed.push({
          start: segmentStart,
          end: segmentEnd,
          text: segmentWords.join(' '),
          words: segmentWords
        });
      }
    });
    
    setProcessedCaptions(processed);
  }, [captions]);

  // Find current caption and setup word highlighting
  useEffect(() => {
    if (!processedCaptions || processedCaptions.length === 0) {
      setCurrentCaption('');
      setCurrentWords([]);
      return;
    }

    const current = processedCaptions.find(caption => 
      currentTime >= caption.start && currentTime <= caption.end
    );

    if (current) {
      setCurrentCaption(current.text);
      setCurrentWords(current.words);
      
      // Calculate which word should be highlighted based on time within segment
      const segmentProgress = (currentTime - current.start) / (current.end - current.start);
      const wordIndex = Math.floor(segmentProgress * current.words.length);
      setHighlightedWordIndex(Math.min(wordIndex, current.words.length - 1));
    } else {
      setCurrentCaption('');
      setCurrentWords([]);
      setHighlightedWordIndex(0);
    }
  }, [currentTime, processedCaptions]);

  // Helper functions for time formatting
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * duration;
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  if (!videoFile) {
    return null;
  }

  return (
    <div className="remotion-video-player">
      <div className="player-header">
        <h3>🎬 Remotion Video Player</h3>
        <div className="font-selector">
          <label htmlFor="font-select">Caption Font:</label>
          <select 
            id="font-select"
            value={selectedFont} 
            onChange={(e) => setSelectedFont(e.target.value)}
            className="font-dropdown"
          >
            {fontOptions.map(font => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="player-wrapper">
        <div className="video-container">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="remotion-video"
              preload="metadata"
              onLoadStart={() => console.log('Video loading started')}
              onCanPlay={() => console.log('Video can play')}
              onError={(e) => console.error('Video error:', e)}
            />
          ) : (
            <div className="video-loading">Loading video...</div>
          )}
          
          {/* Remotion-style Caption Overlay with Word Highlighting */}
          {currentCaption && (
            <div 
              className="remotion-caption-overlay"
              style={{ fontFamily: selectedFont }}
            >
              <div className="caption-text">
                {currentWords.map((word, index) => (
                  <span 
                    key={index}
                    className={`caption-word ${
                      index <= highlightedWordIndex ? 'highlighted' : 'unhighlighted'
                    }`}
                  >
                    {word}
                    {index < currentWords.length - 1 && ' '}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Custom Remotion-style Controls */}
        <div className="remotion-controls">
          <div className="control-row">
            <button 
              className="play-pause-btn"
              onClick={togglePlayPause}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            
            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            
            <div className="progress-container" onClick={handleSeek}>
              <div className="progress-track">
                <div 
                  className="progress-fill"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="volume-control">
              <span>🔊</span>
              <span className="volume-value">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="player-info">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Status:</span>
            <span className="info-value">{isPlaying ? '🟢 Playing' : '⏸️ Paused'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Captions:</span>
            <span className="info-value">{processedCaptions?.length || 0} segments</span>
          </div>
          <div className="info-item">
            <span className="info-label">Font:</span>
            <span className="info-value">{selectedFont}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerWithCaptions;