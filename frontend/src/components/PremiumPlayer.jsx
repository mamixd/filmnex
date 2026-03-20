import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Settings, 
  Languages, Mic, Music, Type, Globe, Zap, List 
} from 'lucide-react';

const PremiumPlayer = ({ movieTitle, movieId, sources = {}, subtitles = [], initialAudioSource, onSourceChange }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedTime, setSavedTime] = useState(0);
  const [activeSubtitle, setActiveSubtitle] = useState(initialAudioSource === 'sub' ? 0 : 'off');
  const [qualityLevels, setQualityLevels] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 for Auto
  const [internalAudioTracks, setInternalAudioTracks] = useState([]);
  const [currentInternalAudioTrack, setCurrentInternalAudioTrack] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [activeAudioSource, setActiveAudioSource] = useState(
    initialAudioSource || (sources?.dub ? 'dub' : (sources?.sub ? 'sub' : 'original'))
  );

  // Sync with external initialAudioSource prop
  useEffect(() => {
    if (initialAudioSource && initialAudioSource !== activeAudioSource) {
      console.log(`[Player] External source change detected: ${initialAudioSource}`);
      setActiveAudioSource(initialAudioSource);
    }
  }, [initialAudioSource]);

  useEffect(() => {
    console.log('%c[Player] PREMIUM PLAYER VERSION: 4.0 (Z-INDEX FIXED)', 'background: #222; color: #bada55; padding: 5px; border-radius: 3px;');
  }, []);

  const controlsTimeoutRef = useRef(null);
  const hlsRef = useRef(null);
  const videoUrl = activeAudioSource === 'sub' ? sources?.sub : (activeAudioSource === 'original' ? sources?.original : sources?.dub);

  const isIframeSourceFallback = videoUrl && (
    videoUrl.includes('vidmoly.') || 
    videoUrl.includes('vidmoxy.') ||
    videoUrl.includes('vidyard') ||
    (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) ||
    (!videoUrl.match(/\.(m3u8|mp4|webm|ogg)($|\?)/i) && 
     !videoUrl.includes('vidrame.pro') && 
     !videoUrl.includes('googlevideo.com'))
  );

  const [sourceType, setSourceType] = useState(isIframeSourceFallback ? 'iframe' : 'stream');

  useEffect(() => {
    setSourceType(isIframeSourceFallback ? 'iframe' : 'stream');
  }, [videoUrl, isIframeSourceFallback]);

  const isIframeSource = sourceType === 'iframe';

  // Initialize HLS or native video
  useEffect(() => {
    let hls;
    const video = videoRef.current;

    if (!video || !videoUrl || sourceType === 'iframe' || sourceType === 'checking') return;

    // Preserve time if switching source
    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;

    // HLS Desteği: sourceType 'stream' olduğunda her halükarda hls denemesi yap
    const isHlsSource = videoUrl.includes('.m3u8') || videoUrl.includes('vidrame.pro') || videoUrl.includes('m3u8') || sourceType === 'stream';
    
    if (Hls.isSupported() && isHlsSource) {
      if (hlsRef.current) hlsRef.current.destroy();
      hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setQualityLevels(hls.levels);
        if (currentTime > 0) video.currentTime = currentTime;
        
        // Ensure playback continues or starts if autoPlay was requested
        if (wasPlaying || isPlaying) {
          video.play().catch(err => console.log("Auto-play prevented:", err));
        }

        if (hls.audioTracks.length > 1) {
          syncAudioTrack(activeAudioSource, hls, data.audioTracks || hls.audioTracks);
        }
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event, data) => {
        setInternalAudioTracks(data.audioTracks);
        syncAudioTrack(activeAudioSource, hlsRef.current, data.audioTracks);
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (event, data) => {
        setCurrentInternalAudioTrack(data.id);
      });
    } else {
      video.src = videoUrl;
      const handleLoaded = () => {
        if (currentTime > 0) video.currentTime = currentTime;
        if (wasPlaying || isPlaying) {
          video.play().catch(err => console.log("Auto-play prevented:", err));
        }
        video.removeEventListener('loadedmetadata', handleLoaded);
      };
      video.addEventListener('loadedmetadata', handleLoaded);
    }

    // Check for saved progress (only on initial load and for NON-IFRAME sources)
    if (!hasStarted && !isIframeSource) {
      const savedProgress = localStorage.getItem(`player_progress_${movieId}`);
      if (savedProgress) {
        const time = parseFloat(savedProgress);
        // Only prompt if finished less than 95% and more than 10 seconds
        if (time > 10 && (duration === 0 || time < duration * 0.95)) {
          setSavedTime(time);
          setShowResumePrompt(true);
        }
      }
    }

    return () => {
      // Don't destroy global ref if just switching source, 
      // but clean up current instance
    };
  }, [videoUrl, movieId, sourceType]);

  // Sync internal audio tracks when source or tracks change
  useEffect(() => {
    if (hlsRef.current && internalAudioTracks.length > 1) {
      console.log('Syncing audio track for source:', activeAudioSource);
      syncAudioTrack(activeAudioSource, hlsRef.current, internalAudioTracks);
    }
  }, [activeAudioSource, internalAudioTracks]);

  // Sync Subtitle Tracks
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !video.textTracks) return;

    const syncTracks = () => {
      console.log(`[Player] Subtitle sync for source: ${activeAudioSource}`);
      if (activeAudioSource === 'sub') {
        if (video.textTracks.length > 0) {
          for (let i = 0; i < video.textTracks.length; i++) {
            video.textTracks[i].mode = i === 0 ? 'showing' : 'disabled';
          }
          setActiveSubtitle(0);
        }
      } else {
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = 'disabled';
        }
        setActiveSubtitle('off');
      }
    };

    syncTracks();
    video.addEventListener('loadedmetadata', syncTracks);
    return () => video.removeEventListener('loadedmetadata', syncTracks);
  }, [activeAudioSource, subtitles, sourceType]);

  const togglePlay = (e) => {
    console.log('[Player] togglePlay called. Current menus:', { showQualityMenu, showSubtitleMenu, showAudioMenu });
    if (e) {
      console.log('[Player] Event target:', e.target.className);
      e.stopPropagation();
    }

    // If a menu is open, just close the menu instead of toggling play
    if (showQualityMenu || showSubtitleMenu || showAudioMenu) {
      setShowQualityMenu(false);
      setShowSubtitleMenu(false);
      setShowAudioMenu(false);
      return;
    }

    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      setHasStarted(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleWaiting = () => setIsLoading(true);
  const handlePlaying = () => setIsLoading(false);
  const handleCanPlay = () => setIsLoading(false);

  // Manage Video Load State
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);

    // Initial check in case it's already ready
    if (video.readyState >= 3) {
      setIsLoading(false);
    }

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [videoUrl, sourceType]);

  // Update Progress
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) {
      setProgress(0);
      return;
    }
    const currentProgress = (v.currentTime / v.duration) * 100;
    setProgress(isNaN(currentProgress) ? 0 : currentProgress);
    
    // Save progress every 5 seconds
    if (Math.floor(v.currentTime) % 5 === 0) {
      localStorage.setItem(`player_progress_${movieId}`, v.currentTime.toString());
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration);

    // Initial subtitle activation
    if (activeAudioSource === 'sub' || initialAudioSource === 'sub') {
      console.log('[Player] Auto-activating first subtitle track');
      if (video.textTracks && video.textTracks.length > 0) {
        video.textTracks[0].mode = 'showing';
        setActiveSubtitle(0);
      }
    }
  };

  const handleSeek = (e) => {
    const seekTime = (e.target.value / 100) * videoRef.current.duration;
    videoRef.current.currentTime = seekTime;
    setProgress(e.target.value);
  };

  const handleResume = (shouldResume) => {
    if (shouldResume && videoRef.current) {
      videoRef.current.currentTime = savedTime;
    }
    setShowResumePrompt(false);
    setHasStarted(true);
    setIsPlaying(true);
    
    // Ensure playback starts after the UI update and seek
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(err => console.log("Resume playback prevented:", err));
      }
    }, 50);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input (though we don't have any yet)
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowright':
        case 'l':
          video.currentTime += 10;
          break;
        case 'arrowleft':
        case 'j':
          video.currentTime -= 10;
          break;
        case 'arrowup':
          e.preventDefault();
          const newVolUp = Math.min(1, video.volume + 0.1);
          video.volume = newVolUp;
          setVolume(newVolUp);
          setIsMuted(false);
          break;
        case 'arrowdown':
          e.preventDefault();
          const newVolDown = Math.max(0, video.volume - 0.1);
          video.volume = newVolDown;
          setVolume(newVolDown);
          setIsMuted(newVolDown === 0);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          setIsMuted(!isMuted);
          video.muted = !isMuted;
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, showQualityMenu, showSubtitleMenu, showAudioMenu, hasStarted, sourceType]);

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showQualityMenu && !showSubtitleMenu && !showAudioMenu) {
        setShowControls(false);
      }
    }, 3000);
  };

  const toggleSubtitles = (trackIndex) => {
    const video = videoRef.current;
    if (!video) return;

    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = i === trackIndex ? 'showing' : 'disabled';
    }
    setActiveSubtitle(trackIndex === -1 ? 'off' : trackIndex);
    setShowSubtitleMenu(false);
  };

  const changeQuality = (levelIndex) => {
    console.log('[Player] changeQuality called:', levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQuality(levelIndex);
    }
    setShowQualityMenu(false);
  };

  const syncAudioTrack = (source, hls, tracks) => {
    if (!hls || !tracks || tracks.length <= 1) return;

    const isTurkish = (t) => {
      const name = t.name?.toLowerCase() || '';
      const lang = t.lang?.toLowerCase() || '';
      return name.includes('türkçe') || name.includes('tr') || name.includes('dublaj') || name.includes('tur') ||
             lang.includes('tr') || lang.includes('tur');
    };

    let targetIndex = -1;
    if (source === 'dub') {
      targetIndex = tracks.findIndex(isTurkish);
      if (targetIndex === -1) targetIndex = 0;
    } else if (source === 'sub' || source === 'original') {
      // Find the first track that is NOT Turkish
      targetIndex = tracks.findIndex(t => !isTurkish(t));
      
      // If still not found, and we have multiple tracks, usually 1 is original
      if (targetIndex === -1 && tracks.length > 1) {
        targetIndex = 1;
      }
    }

    if (targetIndex !== -1 && targetIndex !== hls.audioTrack) {
      const trackName = tracks[targetIndex]?.name || tracks[targetIndex]?.lang || `Track ${targetIndex}`;
      console.log(`[Player] Activating audio track: ${trackName} (Index: ${targetIndex})`);
      hls.audioTrack = targetIndex;
      setCurrentInternalAudioTrack(targetIndex);
    }
  };

  const updateSource = (sourceId, autoPlay = false) => {
    const newUrl = sources[sourceId];
    if (!newUrl) return;

    setActiveAudioSource(sourceId);
    if (onSourceChange) onSourceChange(sourceId);
    
    // Subtitle management is now handled by useEffect [activeAudioSource]

    if (autoPlay) {
      setHasStarted(true);
      setIsPlaying(true);
      if (videoRef.current) {
        videoRef.current.play().catch(console.error);
      }
    }
  };

  const handleInternalAudioTrackChange = (index) => {
    if (hlsRef.current && hlsRef.current.audioTracks[index]) {
      hlsRef.current.audioTrack = index;
      setCurrentInternalAudioTrack(index);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="premium-player-container group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={togglePlay}
    >
      {sourceType === 'checking' ? (
        <div className="player-loader-overlay" style={{background:'#050505', zIndex:50, flexDirection:'column'}}>
           <div style={{color:'#fff', marginBottom:'15px', fontWeight:'bold', letterSpacing:'1px', fontSize:'12px'}}>YAYIN BİÇİMİ ANALİZ EDİLİYOR...</div>
           <div className="player-spinner"></div>
        </div>
      ) : isIframeSource ? (
        <iframe
          src={videoUrl}
          className="premium-video"
          allowFullScreen
          allow="autoplay; encrypted-media"
          frameBorder="0"
          title={movieTitle}
          onLoad={() => setIsLoading(false)}
        />
      ) : (
        <video
          ref={videoRef}
          className="premium-video"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onCanPlay={handleCanPlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onContextMenu={(e) => e.preventDefault()}
          controlsList="nodownload"
          playsInline
          crossOrigin="anonymous"
        >
          {subtitles.map((track, index) => (
            <track
              key={`${track.src}-${index}`}
              kind="subtitles"
              label={track.label}
              srcLang={track.srclang || 'tr'}
              src={track.src}
              default={activeSubtitle === index}
            />
          ))}
        </video>
      )}

      {/* Loading Spinner */}
      {isLoading && hasStarted && (
        <div className="player-loader-overlay">
          <div className="player-spinner"></div>
        </div>
      )}

      {/* Centered Play Button Overlay */}
      {(!isPlaying || !hasStarted) && !showResumePrompt && (
        <div className="centered-play-overlay" onClick={togglePlay}>
          <div className="centered-play-btn">
            <Play size={48} fill="currentColor" />
          </div>
        </div>
      )}


      {/* Resume Prompt Overlay */}
      {showResumePrompt && (
        <div className="resume-overlay">
          <div className="resume-card">
            <h3>Devam et?</h3>
            <p>Bu filme en son {formatTime(savedTime)} saniyesinde kaldın. Kaldığın yerden devam etmek ister misin?</p>
            <div className="resume-actions">
              <button onClick={() => handleResume(true)} className="btn-resume-yes">Evet</button>
              <button onClick={() => handleResume(false)} className="btn-resume-no">Hayır</button>
            </div>
          </div>
        </div>
      )}


      {/* Custom Controls Overlay */}
      <div 
        className={`player-controls-wrapper ${showControls ? 'opacity-100' : 'opacity-0 pointers-none'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="player-gradient-top" onClick={(e) => e.stopPropagation()}>
          <span className="player-movie-title">{movieTitle}</span>
        </div>

        <div className="player-gradient-bottom" onClick={(e) => e.stopPropagation()}>
          {/* Persistent Version Switcher Badges - Visible on Hover */}
          <div className="player-persistent-sources">
            {sources?.dub && (
              <button 
                className={`switcher-badge ${activeAudioSource === 'dub' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); updateSource('dub', true); }}
              >
                TÜRKÇE DUBLAJ
              </button>
            )}
            {sources?.sub && (
              <button 
                className={`switcher-badge ${activeAudioSource === 'sub' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); updateSource('sub', true); }}
              >
                TÜRKÇE ALTYAZILI
              </button>
            )}
            {sources?.original && (
              <button 
                className={`switcher-badge ${activeAudioSource === 'original' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); updateSource('original', true); }}
              >
                ORİJİNAL
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="player-progress-container" onClick={(e) => { console.log('[Player] Progress container clicked'); e.stopPropagation(); }}>
            <input
              type="range"
              min="0"
              max="100"
              value={progress || 0}
              onChange={handleSeek}
              className="player-progress-slider"
              style={{ '--progress': `${progress || 0}%` }}
            />
          </div>

          <div className="player-controls-row">
            <div className="player-controls-left">
              <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="player-btn">
                {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); videoRef.current.currentTime -= 10; }} className="player-btn skip-btn">
                <RotateCcw size={28} />
                <span className="skip-label">10</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); videoRef.current.currentTime += 10; }} className="player-btn skip-btn">
                <RotateCw size={28} />
                <span className="skip-label">10</span>
              </button>
              <div className="player-time">
                {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
              </div>
            </div>

            <div className="player-controls-right">
              {/* Quality Settings */}
              {qualityLevels.length > 0 && (
                <div className="settings-control group" onClick={(e) => e.stopPropagation()}>
                  <button className="player-btn" onClick={(e) => {
                    console.log('[Player] Settings button clicked');
                    e.stopPropagation();
                    setShowQualityMenu(!showQualityMenu);
                    setShowSubtitleMenu(false);
                    setShowAudioMenu(false);
                  }}>
                    <Settings size={20} />
                  </button>
                  {showQualityMenu && (
                    <div className="player-menu">
                      <div className="menu-header">Kalite</div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); changeQuality(-1); }}
                        className={`menu-item ${currentQuality === -1 ? 'active' : ''}`}
                      >
                        Otomatik
                      </button>
                      {qualityLevels.map((level, i) => (
                        <button 
                          key={i}
                          onClick={(e) => { e.stopPropagation(); changeQuality(i); }}
                          className={`menu-item ${currentQuality === i ? 'active' : ''}`}
                        >
                          {level.height}p
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Audio Channels Menu (Hidden/Legacy but keeping for manual channel override if needed) */}
              {internalAudioTracks.length > 1 && (
                <div className="audio-control group" onClick={(e) => e.stopPropagation()}>
                  <button className="player-btn" onClick={(e) => {
                    console.log('[Player] Mic (Audio) button clicked');
                    e.stopPropagation();
                    setShowAudioMenu(!showAudioMenu);
                    setShowSubtitleMenu(false);
                    setShowQualityMenu(false);
                  }}>
                    <Mic size={20} />
                  </button>
                  {showAudioMenu && (
                    <div className="player-menu">
                      <div className="menu-header">HLS Kanalları</div>
                      <div className="p-2 space-y-1">
                        {internalAudioTracks.map((track, index) => (
                          <button
                            key={index}
                            onClick={() => handleInternalAudioTrackChange(index)}
                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                              currentInternalAudioTrack === index ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-gray-300'
                            }`}
                          >
                            <Music size={18} />
                            <div className="text-left">
                              <div className="text-sm font-medium">{track.name || `Kanal ${index}`}</div>
                              <div className="text-xs opacity-70">{track.lang || 'Bilinmiyor'}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Subtitles Menu */}
              <div className="subtitles-control group" onClick={(e) => e.stopPropagation()}>
                <button className="player-btn" onClick={(e) => {
                  console.log('[Player] Languages (Subtitles) button clicked');
                  e.stopPropagation();
                  setShowSubtitleMenu(!showSubtitleMenu);
                  setShowQualityMenu(false);
                  setShowAudioMenu(false);
                }}>
                  <Languages size={20} />
                </button>
                {showSubtitleMenu && (
                  <div className="player-menu">
                    <div className="menu-header">Altyazı</div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleSubtitles(-1); }}
                      className={`menu-item ${activeSubtitle === 'off' ? 'active' : ''}`}
                    >
                      Kapalı
                    </button>
                    {subtitles.map((track, i) => (
                      <button 
                        key={i}
                        onClick={(e) => { e.stopPropagation(); toggleSubtitles(i); }}
                        className={`menu-item ${activeSubtitle === i ? 'active' : ''}`}
                      >
                        {track.label} <span className="cc-label">CC</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="volume-control group" onClick={(e) => e.stopPropagation()}>
                <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); videoRef.current.muted = !isMuted; }} className="player-btn">
                  {isMuted ? <VolumeX /> : <Volume2 />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    e.stopPropagation();
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    videoRef.current.volume = v;
                    setIsMuted(v === 0);
                  }}
                  className="volume-slider"
                />
              </div>
              <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="player-btn">
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumPlayer;
