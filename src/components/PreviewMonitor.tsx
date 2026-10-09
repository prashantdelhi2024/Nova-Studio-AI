import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Grid,
  Volume2,
  VolumeX,
  Gauge
} from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { renderTimelineFrame } from '../services/videoCompositor';
import { audioEngine } from '../services/audioEngine';

export const PreviewMonitor: React.FC = () => {
  const {
    project,
    currentTime,
    setCurrentTime,
    isPlaying,
    togglePlayPause,
    showSafeAreas,
    setShowSafeAreas,
    audioPeak,
    mediaElements,
    registerMediaElement,
    mediaItems
  } = useEditor();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // Hidden video elements pool to decode real video frames
  const videoElementsPool = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Setup video elements for active media items
  useEffect(() => {
    mediaItems.forEach((item) => {
      if (item.type === 'video' && item.url && !videoElementsPool.current.has(item.id)) {
        const vid = document.createElement('video');
        vid.src = item.url;
        vid.crossOrigin = 'anonymous';
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = 'auto';
        vid.load();
        videoElementsPool.current.set(item.id, vid);
        registerMediaElement(item.id, vid);
      }
    });
  }, [mediaItems, registerMediaElement]);

  // Synchronize video elements during playback
  useEffect(() => {
    videoElementsPool.current.forEach((vid, mediaId) => {
      // Find if this video is active at current time
      const activeClip = project.clips.find(
        (c) => c.mediaId === mediaId &&
               currentTime >= c.startTime &&
               currentTime < c.startTime + c.duration
      );

      if (activeClip) {
        const targetTime = activeClip.sourceStartTime + (currentTime - activeClip.startTime) * activeClip.speed.rate;
        if (Math.abs(vid.currentTime - targetTime) > 0.15) {
          vid.currentTime = targetTime;
        }
        if (isPlaying && vid.paused) {
          vid.play().catch(() => {});
        } else if (!isPlaying && !vid.paused) {
          vid.pause();
        }
      } else {
        if (!vid.paused) vid.pause();
      }
    });
  }, [currentTime, isPlaying, project.clips]);

  // Main Canvas Render Loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderTimelineFrame(
      ctx,
      canvas.width,
      canvas.height,
      project,
      currentTime,
      videoElementsPool.current,
      { showSafeAreas }
    );
  }, [project, currentTime, showSafeAreas]);

  // Trigger render on time change or state update
  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  // Format seconds to timecode hh:mm:ss:ff (30 fps)
  const formatTimecode = (sec: number) => {
    const s = Math.max(0, sec);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    const frames = Math.floor((s % 1) * 30);

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
  };

  const handleStepFrame = (delta: number) => {
    const frameDuration = 1 / 30;
    setCurrentTime(Math.max(0, Math.min(project.duration, currentTime + delta * frameDuration)));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleVolumeToggle = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioEngine.setMute(nextMute);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    setIsMuted(false);
    audioEngine.setMasterVolume(v);
  };

  // Determine aspect ratio class
  const getAspectRatioClasses = () => {
    switch (project.settings.aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[82%]';
      case '1:1':
        return 'aspect-square max-h-[88%]';
      case '4:5':
        return 'aspect-[4/5] max-h-[85%]';
      case '21:9':
        return 'aspect-[21/9] max-w-[95%]';
      case '16:9':
      default:
        return 'aspect-video max-w-[92%]';
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col flex-1 bg-zinc-950 min-h-0 relative select-none overflow-hidden"
    >
      {/* Video Screen Area */}
      <div className="flex-1 flex items-center justify-center p-3 relative min-h-0 bg-radial from-zinc-900/60 to-zinc-950">
        <div
          className={`relative rounded-md overflow-hidden shadow-2xl shadow-black/80 border border-zinc-800/80 bg-black flex items-center justify-center ${getAspectRatioClasses()}`}
        >
          <canvas
            ref={canvasRef}
            width={project.settings.width}
            height={project.settings.height}
            className="w-full h-full object-contain block"
          />

          {/* Resolution Badge in top-left */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300 pointer-events-none flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{project.settings.width}×{project.settings.height}</span>
            <span>({project.settings.aspectRatio})</span>
          </div>

          {/* Safe Areas Guide Label */}
          {showSafeAreas && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 pointer-events-none">
              SAFE GUIDES ON
            </div>
          )}
        </div>
      </div>

      {/* Monitor Control Bar */}
      <div className="h-12 bg-zinc-900/90 border-t border-zinc-800/80 px-4 flex items-center justify-between text-xs text-zinc-300">
        {/* Left: Timecode Readout */}
        <div className="flex items-center gap-3">
          <div className="font-mono text-xs text-cyan-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 shadow-inner">
            {formatTimecode(currentTime)}
          </div>
          <span className="text-zinc-600 text-xs">/</span>
          <div className="font-mono text-xs text-zinc-400">
            {formatTimecode(project.duration)}
          </div>
        </div>

        {/* Center: Transport Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Jump to Start */}
          <button
            onClick={() => setCurrentTime(0)}
            title="Jump to Start (Home)"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Previous Frame */}
          <button
            onClick={() => handleStepFrame(-1)}
            title="Previous Frame (Left Arrow)"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Big Play / Pause */}
          <button
            onClick={togglePlayPause}
            title="Play/Pause (Space)"
            className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25 active:scale-95 transition-all mx-1"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>

          {/* Next Frame */}
          <button
            onClick={() => handleStepFrame(1)}
            title="Next Frame (Right Arrow)"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Audio Meter & Display Overlays */}
        <div className="flex items-center gap-3">
          {/* Audio Peak Meters (L/R) */}
          <div className="hidden sm:flex items-center gap-1 bg-zinc-950 border border-zinc-800/80 px-2 py-1 rounded">
            <div className="flex flex-col gap-0.5">
              <div className="w-14 h-1.5 bg-zinc-800 rounded-sm overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 transition-all duration-75"
                  style={{ width: `${Math.round(audioPeak.left * 100)}%` }}
                />
              </div>
              <div className="w-14 h-1.5 bg-zinc-800 rounded-sm overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 transition-all duration-75"
                  style={{ width: `${Math.round(audioPeak.right * 100)}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono ml-0.5">dB</span>
          </div>

          {/* Volume Control */}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={handleVolumeToggle}
              className="text-zinc-400 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              aria-label="Master volume"
              className="w-14 accent-cyan-400 cursor-pointer h-1"
            />
          </div>

          {/* Safe Guides Toggle */}
          <button
            onClick={() => setShowSafeAreas(!showSafeAreas)}
            title="Toggle Safe Area Guides & Grid"
            className={`p-1.5 rounded transition-colors ${
              showSafeAreas ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-500/40' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title="Fullscreen Monitor"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
