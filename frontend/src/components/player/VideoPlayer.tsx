// src/components/player/VideoPlayer.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type videojs from 'video.js';

interface VideoSource {
  src: string;
  type: string;
  quality?: string;
}

interface Subtitle {
  src: string;
  srclang: string;
  label: string;
  default?: boolean;
}

interface VideoPlayerProps {
  sources: VideoSource[];
  subtitles?: Subtitle[];
  poster?: string;
  title?: string;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  startTime?: number;
  autoplay?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  sources,
  subtitles = [],
  poster,
  title,
  onProgress,
  onEnded,
  startTime = 0,
  autoplay = false,
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [currentSource, setCurrentSource] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initPlayer = useCallback(async () => {
    if (!videoRef.current || !sources.length) return;

    // Dynamically import video.js (client-side only)
    const videojs = (await import('video.js')).default;
    await import('@videojs/http-streaming');

    // Cleanup previous instance
    if (playerRef.current) {
      playerRef.current.dispose();
    }

    const videoElement = document.createElement('video');
    videoElement.className = 'video-js vjs-big-play-centered vjs-theme-cinemax';
    videoRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      autoplay,
      controls: true,
      responsive: true,
      fluid: true,
      poster,
      sources: sources.map((s) => ({ src: s.src, type: s.type })),
      html5: {
        vhs: {
          overrideNative: true,
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
      controlBar: {
        children: [
          'playToggle',
          'volumePanel',
          'currentTimeDisplay',
          'timeDivider',
          'durationDisplay',
          'progressControl',
          'liveDisplay',
          'seekToLive',
          'remainingTimeDisplay',
          'customControlSpacer',
          'playbackRateMenuButton',
          'chaptersButton',
          'descriptionsButton',
          'subsCapsButton',
          'audioTrackButton',
          'fullscreenToggle',
        ],
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      },
    });

    // Add subtitle tracks
    subtitles.forEach((sub) => {
      player.addRemoteTextTrack({
        kind: 'subtitles',
        label: sub.label,
        srclang: sub.srclang,
        src: sub.src,
        default: sub.default,
      }, false);
    });

    // Resume from saved position
    if (startTime > 0) {
      player.one('loadedmetadata', () => {
        player.currentTime(startTime);
      });
    }

    // Event handlers
    player.on('ready', () => setIsLoading(false));

    player.on('error', () => {
      const err = player.error();
      console.error('Video error:', err);

      // Auto-fallback to next source
      const nextSource = currentSource + 1;
      if (nextSource < sources.length) {
        setCurrentSource(nextSource);
        player.src({ src: sources[nextSource].src, type: sources[nextSource].type });
        player.play();
        setError(null);
      } else {
        setError('Video yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      }
    });

    player.on('timeupdate', () => {
      const current = player.currentTime() ?? 0;
      const duration = player.duration() ?? 0;
      if (onProgress && duration > 0) {
        onProgress(current, duration);
      }
    });

    player.on('ended', () => {
      if (onEnded) onEnded();
    });

    playerRef.current = player;
  }, [sources, subtitles, poster, autoplay, startTime, currentSource, onProgress, onEnded]);

  useEffect(() => {
    initPlayer();
    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [initPlayer]);

  return (
    <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-2xl">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white/70 text-sm">Yükleniyor...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
          <div className="text-center p-6">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-white text-lg mb-2">Oynatılamıyor</p>
            <p className="text-white/60 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div ref={videoRef} className="w-full" />

      {/* Quality Selector Overlay */}
      {sources.length > 1 && (
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          {sources.map((src, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentSource(idx);
                if (playerRef.current) {
                  const currentTime = playerRef.current.currentTime();
                  playerRef.current.src({ src: src.src, type: src.type });
                  playerRef.current.currentTime(currentTime);
                  playerRef.current.play();
                }
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                idx === currentSource
                  ? 'bg-red-600 text-white'
                  : 'bg-black/60 text-white/70 hover:bg-black/80'
              }`}
            >
              {src.quality || `Kaynak ${idx + 1}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
