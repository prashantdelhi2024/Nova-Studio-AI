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
import { colorGradeToCSSFilter, applyCanvasVignetteAndGrain } from '../services/colorGrading';
import { renderTransitionEffect } from '../services/transitions';
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

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, width, height);

    // Sort tracks from bottom to top (highest order to lowest)
    const sortedTracks = [...project.tracks].sort((a, b) => b.order - a.order);

    for (const track of sortedTracks) {
      if (track.isHidden) continue;

      const activeClips = project.clips.filter(
        (c) => c.trackId === track.id &&
               currentTime >= c.startTime &&
               currentTime < c.startTime + c.duration
      );

      for (const clip of activeClips) {
        const localTime = currentTime - clip.startTime;

        ctx.save();
        ctx.globalAlpha = clip.transform.opacity;

        // Origin at center
        ctx.translate(width / 2 + clip.transform.x * width, height / 2 + clip.transform.y * height);
        ctx.rotate((clip.transform.rotation * Math.PI) / 180);
        ctx.scale(
          clip.transform.scale * (clip.transform.flipH ? -1 : 1),
          clip.transform.scale * (clip.transform.flipV ? -1 : 1)
        );

        if (clip.type === 'video' || clip.type === 'image') {
          const vid = clip.mediaId ? videoElementsPool.current.get(clip.mediaId) : null;
          if (vid && vid.readyState >= 2) {
            ctx.filter = colorGradeToCSSFilter(clip.colorGrade);
            ctx.drawImage(vid, -width / 2, -height / 2, width, height);
            ctx.filter = 'none';
          } else {
            // High-fidelity procedural background
            ctx.fillStyle = clip.color || '#1e293b';
            ctx.fillRect(-width / 2, -height / 2, width, height);

            // Procedural preview pattern
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(clip.name.toUpperCase(), 0, 0);
          }

          // Vignette and film grain
          applyCanvasVignetteAndGrain(ctx, width, height, clip.colorGrade);

        } else if (clip.type === 'text' && clip.textConfig) {
          const tc = clip.textConfig;
          ctx.textAlign = tc.alignment as CanvasTextAlign;
          ctx.textBaseline = 'middle';
          ctx.font = `${tc.fontWeight} ${tc.fontSize}px ${tc.fontFamily}`;

          let animAlpha = 1;
          let animOffsetY = 0;
          if (tc.animation === 'fade') {
            animAlpha = Math.min(1, localTime * 2.5);
          } else if (tc.animation === 'slide-up') {
            const p = Math.min(1, localTime * 2);
            animOffsetY = (1 - p) * 30;
            animAlpha = p;
          } else if (tc.animation === 'pop-in') {
            const p = Math.min(1, localTime * 3);
            ctx.scale(0.85 + 0.15 * p, 0.85 + 0.15 * p);
            animAlpha = p;
          }

          ctx.globalAlpha *= animAlpha;

          // Background box
          if (tc.backgroundColor && tc.backgroundColor !== 'transparent') {
            const textMetrics = ctx.measureText(tc.text);
            const pad = tc.backgroundPadding;
            const boxW = textMetrics.width + pad * 2;
            const boxH = tc.fontSize * 1.35 + pad * 1.5;
            ctx.fillStyle = tc.backgroundColor;
            ctx.fillRect(-boxW / 2, -boxH / 2 + animOffsetY, boxW, boxH);
          }

          // Stroke
          if (tc.strokeWidth > 0 && tc.strokeColor) {
            ctx.strokeStyle = tc.strokeColor;
            ctx.lineWidth = tc.strokeWidth;
            ctx.strokeText(tc.text, 0, animOffsetY);
          }

          // Shadow
          if (tc.shadowBlur > 0) {
            ctx.shadowColor = tc.shadowColor;
            ctx.shadowBlur = tc.shadowBlur;
          }

          // Fill text
          ctx.fillStyle = tc.color;
          ctx.fillText(tc.text, 0, animOffsetY);
          ctx.shadowBlur = 0;
        }

        ctx.restore();

        // Transitions
        if (clip.transitionIn && clip.transitionIn.type !== 'none') {
          const inDur = clip.transitionIn.duration;
          if (localTime <= inDur) {
            const progress = localTime / inDur;
            renderTransitionEffect(ctx, width, height, clip.transitionIn.type, progress);
          }
        }

        if (clip.transitionOut && clip.transitionOut.type !== 'none') {
          const outDur = clip.transitionOut.duration;
          const timeRemaining = clip.duration - localTime;
          if (timeRemaining <= outDur) {
            const progress = 1 - timeRemaining / outDur;
            renderTransitionEffect(ctx, width, height, clip.transitionOut.type, progress);
          }
        }
      }
    }

    // Safe Area Guides Overlay
    if (showSafeAreas) {
      ctx.save();
      ctx.lineWidth = 1;

      // Action safe (90%)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);

      // Title safe (80%)
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
      ctx.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);

      // Rule of Thirds
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(width / 3, 0); ctx.lineTo(width / 3, height);
      ctx.moveTo((width / 3) * 2, 0); ctx.lineTo((width / 3) * 2, height);
      ctx.moveTo(0, height / 3); ctx.lineTo(width, height / 3);
      ctx.moveTo(0, (height / 3) * 2); ctx.lineTo(width, (height / 3) * 2);
      ctx.stroke();

      // Center crosshair
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.beginPath();
      ctx.moveTo(width / 2 - 15, height / 2); ctx.lineTo(width / 2 + 15, height / 2);
      ctx.moveTo(width / 2, height / 2 - 15); ctx.lineTo(width / 2, height / 2 + 15);
      ctx.stroke();

      ctx.restore();
    }
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
