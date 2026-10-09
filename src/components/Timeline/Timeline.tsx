import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  Magnet,
  ZoomIn,
  ZoomOut,
  Plus,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Maximize2,
  Layers,
  Sparkles
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { Clip, Track, TransitionType } from '../../types/editor';

export const Timeline: React.FC = () => {
  const {
    project,
    currentTime,
    setCurrentTime,
    selectedClipId,
    setSelectedClipId,
    selectedTrackId,
    setSelectedTrackId,
    timelineZoom,
    setTimelineZoom,
    snapEnabled,
    setSnapEnabled,
    splitClipAtPlayhead,
    deleteClip,
    duplicateClip,
    trimClip,
    moveClip,
    addTrack,
    updateTrack
  } = useEditor();

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [draggingClip, setDraggingClip] = useState<{
    clipId: string;
    initialMouseX: number;
    initialStartTime: number;
    trackId: string;
  } | null>(null);

  const [trimmingClip, setTrimmingClip] = useState<{
    clipId: string;
    edge: 'start' | 'end';
    initialMouseX: number;
    initialStartTime: number;
    initialDuration: number;
  } | null>(null);

  const totalWidth = Math.max(1200, project.duration * timelineZoom + 200);

  // Time ruler scrubbing handler
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineContainerRef.current) return;
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const scrollLeft = timelineContainerRef.current.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft - 180; // 180px track header offset
    if (clickX >= 0) {
      const newTime = Math.max(0, Math.min(project.duration, clickX / timelineZoom));
      setCurrentTime(newTime);
    }
  };

  // Scrubbing on ruler drag
  const startScrubbing = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    handleTimelineClick(e);
  };

  // Mouse move / up listeners for scrubbing & dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbing && timelineContainerRef.current) {
        const rect = timelineContainerRef.current.getBoundingClientRect();
        const scrollLeft = timelineContainerRef.current.scrollLeft;
        const clickX = e.clientX - rect.left + scrollLeft - 180;
        if (clickX >= 0) {
          const newTime = Math.max(0, Math.min(project.duration, clickX / timelineZoom));
          setCurrentTime(newTime);
        }
      }

      if (draggingClip) {
        const deltaX = e.clientX - draggingClip.initialMouseX;
        const deltaTime = deltaX / timelineZoom;
        let newStartTime = Math.max(0, draggingClip.initialStartTime + deltaTime);

        // Magnetic Snapping
        if (snapEnabled) {
          // Snap to playhead
          if (Math.abs(newStartTime - currentTime) < 0.2) {
            newStartTime = currentTime;
          }
          // Snap to other clip edges
          project.clips.forEach((c) => {
            if (c.id !== draggingClip.clipId) {
              if (Math.abs(newStartTime - (c.startTime + c.duration)) < 0.2) {
                newStartTime = c.startTime + c.duration;
              }
              if (Math.abs(newStartTime - c.startTime) < 0.2) {
                newStartTime = c.startTime;
              }
            }
          });
        }

        moveClip(draggingClip.clipId, draggingClip.trackId, newStartTime);
      }

      if (trimmingClip) {
        const deltaX = e.clientX - trimmingClip.initialMouseX;
        const deltaTime = deltaX / timelineZoom;

        if (trimmingClip.edge === 'end') {
          const newDuration = Math.max(0.2, trimmingClip.initialDuration + deltaTime);
          trimClip(trimmingClip.clipId, trimmingClip.initialStartTime, newDuration);
        } else {
          // Trim start
          const maxDelta = trimmingClip.initialDuration - 0.2;
          const clampedDelta = Math.min(maxDelta, deltaTime);
          const newStartTime = Math.max(0, trimmingClip.initialStartTime + clampedDelta);
          const newDuration = trimmingClip.initialDuration - clampedDelta;
          trimClip(trimmingClip.clipId, newStartTime, newDuration);
        }
      }
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      setDraggingClip(null);
      setTrimmingClip(null);
    };

    if (isScrubbing || draggingClip || trimmingClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isScrubbing,
    draggingClip,
    trimmingClip,
    timelineZoom,
    project.duration,
    project.clips,
    currentTime,
    snapEnabled,
    setCurrentTime,
    moveClip,
    trimClip
  ]);

  // Zoom helpers
  const handleZoomIn = () => setTimelineZoom(Math.min(240, timelineZoom * 1.25));
  const handleZoomOut = () => setTimelineZoom(Math.max(20, timelineZoom * 0.8));

  // Fit to screen
  const handleFitToScreen = () => {
    if (timelineContainerRef.current) {
      const availableWidth = timelineContainerRef.current.clientWidth - 220;
      const fitZoom = Math.max(25, availableWidth / Math.max(1, project.duration));
      setTimelineZoom(Number(fitZoom.toFixed(1)));
    }
  };

  // Generate ruler tick marks
  const renderRulerTicks = () => {
    const ticks = [];
    const stepSec = timelineZoom < 40 ? 5 : timelineZoom < 80 ? 2 : 1;
    const maxSec = Math.ceil(project.duration) + 10;

    for (let s = 0; s <= maxSec; s += stepSec) {
      const left = s * timelineZoom;
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      const label = `${mins}:${secs.toString().padStart(2, '0')}`;

      ticks.push(
        <div
          key={`tick-${s}`}
          className="absolute top-0 flex flex-col items-center pointer-events-none select-none"
          style={{ left: `${left}px` }}
        >
          <span className="text-[10px] font-mono text-zinc-400 mt-1">{label}</span>
          <div className="w-px h-2.5 bg-zinc-600 mt-0.5" />
        </div>
      );
    }
    return ticks;
  };

  return (
    <div className="h-64 sm:h-72 bg-zinc-950 border-t border-zinc-800/90 flex flex-col select-none">
      {/* Timeline Controls Toolbar */}
      <div className="h-10 bg-zinc-900 border-b border-zinc-800/80 px-4 flex items-center justify-between text-xs text-zinc-300">
        {/* Left Tools: Split, Delete, Duplicate, Snap */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => splitClipAtPlayhead()}
            disabled={!selectedClipId}
            title="Split at Playhead (S or C)"
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700/80 disabled:opacity-40 text-zinc-200 rounded border border-zinc-700/50 transition-colors"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium text-[11px]">Split</span>
          </button>

          <button
            onClick={() => deleteClip(undefined, true)}
            disabled={!selectedClipId}
            title="Ripple Delete Clip (Delete/Backspace)"
            className="flex items-center gap-1 px-2 py-1 bg-zinc-800/80 hover:bg-red-950/60 hover:text-red-300 disabled:opacity-40 text-zinc-300 rounded border border-zinc-700/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px]">Delete</span>
          </button>

          <button
            onClick={() => duplicateClip()}
            disabled={!selectedClipId}
            title="Duplicate Clip (Ctrl+D)"
            className="flex items-center gap-1 px-2 py-1 bg-zinc-800/80 hover:bg-zinc-700/80 disabled:opacity-40 text-zinc-300 rounded border border-zinc-700/50 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px]">Duplicate</span>
          </button>

          <div className="h-4 w-px bg-zinc-700 mx-1" />

          {/* Magnetic Snapping Toggle */}
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            title="Toggle Magnetic Snapping (N)"
            className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
              snapEnabled
                ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
                : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="text-[11px]">Snap</span>
          </button>
        </div>

        {/* Right Tools: Zoom Slider & Add Track */}
        <div className="flex items-center gap-2">
          {/* Zoom Slider */}
          <div className="flex items-center gap-1 bg-zinc-950/60 px-2 py-0.5 rounded border border-zinc-800">
            <button
              onClick={handleZoomOut}
              title="Zoom Out (-)"
              className="p-1 text-zinc-400 hover:text-white"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="20"
              max="200"
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
              aria-label="Timeline zoom level"
              className="w-16 accent-cyan-400 cursor-pointer h-1"
            />
            <button
              onClick={handleZoomIn}
              title="Zoom In (+)"
              className="p-1 text-zinc-400 hover:text-white"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitToScreen}
              title="Fit to Screen"
              className="p-1 text-zinc-400 hover:text-white ml-1"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          {/* Add Track dropdown */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => addTrack('video')}
              title="Add Video Track"
              className="px-2 py-1 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-[11px] rounded border border-zinc-700/60 flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-cyan-400" />
              <span>+Video</span>
            </button>
            <button
              onClick={() => addTrack('audio')}
              title="Add Audio Track"
              className="px-2 py-1 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-[11px] rounded border border-zinc-700/60 flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>+Audio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Multi-Track Area */}
      <div
        ref={timelineContainerRef}
        className="flex-1 overflow-x-auto overflow-y-auto relative bg-zinc-950 flex"
      >
        {/* Left Track Headers (Fixed width column) */}
        <div className="w-44 flex-shrink-0 bg-zinc-900/90 border-r border-zinc-800/80 sticky left-0 z-20 flex flex-col shadow-lg shadow-black/50">
          {/* Header top ruler spacer */}
          <div className="h-7 bg-zinc-950 border-b border-zinc-800 flex items-center px-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" />
              Tracks
            </span>
          </div>

          {/* Track row controls */}
          <div className="flex flex-col">
            {project.tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => setSelectedTrackId(track.id)}
                className={`h-14 border-b border-zinc-800/70 px-2 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  selectedTrackId === track.id ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/30'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      track.type === 'video'
                        ? 'bg-cyan-400'
                        : track.type === 'audio'
                        ? 'bg-emerald-400'
                        : 'bg-violet-400'
                    }`}
                  />
                  <span className="font-medium text-xs text-zinc-200 truncate">{track.name}</span>
                </div>

                {/* Track Mute / Solo / Lock icons */}
                <div className="flex items-center gap-1 text-zinc-400">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTrack(track.id, { isHidden: !track.isHidden });
                    }}
                    title={track.isHidden ? 'Show Track' : 'Hide Track'}
                    className={`p-1 rounded hover:text-white ${track.isHidden ? 'text-amber-400' : ''}`}
                  >
                    {track.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTrack(track.id, { isMuted: !track.isMuted });
                    }}
                    title={track.isMuted ? 'Unmute Track' : 'Mute Track'}
                    className={`p-1 rounded hover:text-white ${track.isMuted ? 'text-red-400' : ''}`}
                  >
                    {track.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTrack(track.id, { isLocked: !track.isLocked });
                    }}
                    title={track.isLocked ? 'Unlock Track' : 'Lock Track'}
                    className={`p-1 rounded hover:text-white ${track.isLocked ? 'text-cyan-400' : ''}`}
                  >
                    {track.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Lanes */}
        <div
          className="relative flex-1 flex flex-col"
          style={{ width: `${totalWidth}px` }}
        >
          {/* Time Ruler */}
          <div
            className="h-7 bg-zinc-950 border-b border-zinc-800 relative cursor-pointer"
            onMouseDown={startScrubbing}
          >
            {renderRulerTicks()}
          </div>

          {/* Tracks Content Lanes */}
          <div className="relative flex flex-col flex-1">
            {project.tracks.map((track) => {
              const trackClips = project.clips.filter((c) => c.trackId === track.id);

              return (
                <div
                  key={track.id}
                  className={`h-14 border-b border-zinc-800/60 relative bg-zinc-950/40 ${
                    track.isLocked ? 'opacity-70 pointer-events-none' : ''
                  }`}
                  onClick={() => setSelectedTrackId(track.id)}
                >
                  {/* Grid Lines */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent ${timelineZoom}px)`
                    }}
                  />

                  {/* Render Clips */}
                  {trackClips.map((clip) => {
                    const isSelected = selectedClipId === clip.id;
                    const left = clip.startTime * timelineZoom;
                    const width = Math.max(16, clip.duration * timelineZoom);

                    return (
                      <div
                        key={clip.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                          setSelectedTrackId(track.id);
                          setDraggingClip({
                            clipId: clip.id,
                            initialMouseX: e.clientX,
                            initialStartTime: clip.startTime,
                            trackId: track.id
                          });
                        }}
                        className={`absolute top-1 bottom-1 rounded-md overflow-hidden flex flex-col justify-between cursor-move shadow-md select-none transition-shadow ${
                          isSelected
                            ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-zinc-950 z-10'
                            : 'border border-white/10 hover:border-white/30'
                        }`}
                        style={{
                          left: `${left}px`,
                          width: `${width}px`,
                          backgroundColor: clip.color || '#1e293b'
                        }}
                      >
                        {/* Trim Handle Left */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                            setTrimmingClip({
                              clipId: clip.id,
                              edge: 'start',
                              initialMouseX: e.clientX,
                              initialStartTime: clip.startTime,
                              initialDuration: clip.duration
                            });
                          }}
                          className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/40 z-20 flex items-center justify-center group"
                          title="Drag to trim start"
                        >
                          <div className="w-0.5 h-4 bg-white/70 group-hover:bg-white rounded-full" />
                        </div>

                        {/* Clip Content Card */}
                        <div className="px-3 py-1 flex items-center justify-between text-white text-[11px] font-medium truncate pointer-events-none">
                          <span className="truncate flex items-center gap-1.5">
                            {clip.name}
                          </span>
                          <span className="text-[10px] text-white/70 font-mono flex-shrink-0 ml-1">
                            {clip.duration.toFixed(1)}s
                          </span>
                        </div>

                        {/* Waveform / Visual preview bar */}
                        {clip.type === 'audio' ? (
                          <div className="h-4 px-2 flex items-center gap-0.5 opacity-80 pointer-events-none">
                            {Array.from({ length: Math.min(40, Math.floor(width / 4)) }).map((_, i) => (
                              <div
                                key={i}
                                className="flex-1 bg-white/60 rounded-full"
                                style={{
                                  height: `${Math.max(20, Math.sin(i * 0.7) * 40 + 50)}%`
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="h-3 px-2 flex items-center justify-between text-[9px] text-white/50 pointer-events-none">
                            {clip.transitionIn && clip.transitionIn.type !== 'none' && (
                              <span className="bg-black/40 px-1 rounded text-cyan-300">
                                ◧ {clip.transitionIn.type}
                              </span>
                            )}
                            {clip.transitionOut && clip.transitionOut.type !== 'none' && (
                              <span className="bg-black/40 px-1 rounded text-indigo-300 ml-auto">
                                {clip.transitionOut.type} ◨
                              </span>
                            )}
                          </div>
                        )}

                        {/* Trim Handle Right */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                            setTrimmingClip({
                              clipId: clip.id,
                              edge: 'end',
                              initialMouseX: e.clientX,
                              initialStartTime: clip.startTime,
                              initialDuration: clip.duration
                            });
                          }}
                          className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/40 z-20 flex items-center justify-center group"
                          title="Drag to trim end"
                        >
                          <div className="w-0.5 h-4 bg-white/70 group-hover:bg-white rounded-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Red Playhead Line */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col items-center"
            style={{ left: `${currentTime * timelineZoom}px` }}
          >
            {/* Playhead Top Scrubber Cap */}
            <div className="w-3.5 h-4 bg-cyan-400 rounded-b-sm shadow-md shadow-cyan-500/50 -translate-y-1" />
            <div className="w-0.5 flex-1 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </div>
        </div>
      </div>
    </div>
  );
};
