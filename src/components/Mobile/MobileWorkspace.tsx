import React, { useState } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  Play,
  Pause,
  SlidersHorizontal,
  Palette,
  Volume2,
  Type,
  Move,
  Layers,
  Sparkles,
  Upload,
  Download,
  X,
  ChevronUp,
  Maximize2
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { PreviewMonitor } from '../PreviewMonitor';
import { ALL_FILTER_PRESETS } from '../../services/colorGrading';
import { TRANSITION_CATALOG } from '../../services/transitions';

export const MobileWorkspace: React.FC = () => {
  const {
    project,
    selectedClip,
    selectedClipId,
    setSelectedClipId,
    currentTime,
    setCurrentTime,
    isPlaying,
    togglePlayPause,
    splitClipAtPlayhead,
    deleteClip,
    duplicateClip,
    updateClip,
    setIsExportModalOpen,
    setActiveLibraryTab
  } = useEditor();

  const [activeBottomSheet, setActiveBottomSheet] = useState<
    'none' | 'transform' | 'filters' | 'transitions' | 'audio' | 'titles' | 'ai'
  >('none');

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200 select-none overflow-hidden relative">
      {/* Top Mobile Bar */}
      <div className="h-12 bg-zinc-950 border-b border-zinc-800 px-3 flex items-center justify-between">
        <span className="font-bold text-xs tracking-wider text-zinc-100 flex items-center gap-1">
          NOVA <span className="text-cyan-400 font-extrabold">STUDIO</span>
        </span>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-medium text-xs rounded-full shadow-md shadow-cyan-500/20 active:scale-95"
        >
          Export Video
        </button>
      </div>

      {/* Main Video Monitor */}
      <div className="flex-1 min-h-[40vh] flex flex-col bg-black relative">
        <PreviewMonitor />
      </div>

      {/* Touch-Friendly Scrub Bar */}
      <div className="h-10 bg-zinc-900 border-t border-zinc-800 px-4 flex items-center gap-3">
        <button
          onClick={togglePlayPause}
          className="w-7 h-7 rounded-full bg-cyan-500 text-black flex items-center justify-center flex-shrink-0 active:scale-90"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black ml-0.5" />}
        </button>

        <input
          type="range"
          min="0"
          max={project.duration}
          step="0.05"
          value={currentTime}
          onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
          className="flex-1 accent-cyan-400 cursor-pointer h-2"
        />

        <span className="font-mono text-[10px] text-cyan-400 flex-shrink-0">
          {currentTime.toFixed(1)}s / {project.duration.toFixed(0)}s
        </span>
      </div>

      {/* Horizontal Clips Track Carousel */}
      <div className="h-20 bg-zinc-950 border-t border-zinc-800 px-3 flex items-center gap-2 overflow-x-auto">
        {project.clips.map((clip) => {
          const isSelected = selectedClipId === clip.id;
          return (
            <button
              key={clip.id}
              onClick={() => setSelectedClipId(clip.id)}
              className={`h-14 px-3 min-w-[90px] rounded-lg flex flex-col justify-between text-left flex-shrink-0 border transition-all ${
                isSelected
                  ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-zinc-800'
                  : 'border-zinc-800 bg-zinc-900/80'
              }`}
            >
              <span className="text-[10px] font-semibold text-white truncate max-w-[80px]">
                {clip.name}
              </span>
              <div className="flex items-center justify-between text-[9px] text-zinc-400 font-mono">
                <span>{clip.duration.toFixed(1)}s</span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: clip.color || '#0284c7' }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Action Tool Tray */}
      <div className="h-16 bg-zinc-900 border-t border-zinc-800 px-2 flex items-center justify-around text-zinc-400">
        <button
          onClick={() => splitClipAtPlayhead()}
          disabled={!selectedClipId}
          className="flex flex-col items-center gap-1 p-1 disabled:opacity-30 active:text-cyan-400"
        >
          <Scissors className="w-4 h-4 text-cyan-400" />
          <span className="text-[9px]">Split</span>
        </button>

        <button
          onClick={() => setActiveBottomSheet('filters')}
          className="flex flex-col items-center gap-1 p-1 active:text-cyan-400"
        >
          <Palette className="w-4 h-4 text-amber-400" />
          <span className="text-[9px]">Filters</span>
        </button>

        <button
          onClick={() => setActiveBottomSheet('transitions')}
          className="flex flex-col items-center gap-1 p-1 active:text-cyan-400"
        >
          <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
          <span className="text-[9px]">Transitions</span>
        </button>

        <button
          onClick={() => setActiveBottomSheet('transform')}
          disabled={!selectedClipId}
          className="flex flex-col items-center gap-1 p-1 disabled:opacity-30 active:text-cyan-400"
        >
          <Move className="w-4 h-4 text-emerald-400" />
          <span className="text-[9px]">Transform</span>
        </button>

        <button
          onClick={() => deleteClip(undefined, true)}
          disabled={!selectedClipId}
          className="flex flex-col items-center gap-1 p-1 disabled:opacity-30 active:text-red-400"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
          <span className="text-[9px]">Delete</span>
        </button>
      </div>

      {/* Bottom Sheet Drawer for Quick Mobile Editing */}
      {activeBottomSheet !== 'none' && (
        <div className="absolute inset-x-0 bottom-0 top-1/3 bg-zinc-900 border-t border-zinc-700 rounded-t-2xl z-40 p-4 flex flex-col shadow-2xl animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="font-semibold text-xs text-zinc-100 uppercase tracking-wider">
              {activeBottomSheet}
            </h3>
            <button
              onClick={() => setActiveBottomSheet('none')}
              className="p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pt-3 space-y-4">
            {activeBottomSheet === 'filters' && (
              <div className="grid grid-cols-2 gap-2">
                {ALL_FILTER_PRESETS.slice(0, 16).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      if (selectedClipId) {
                        updateClip(selectedClipId, {
                          colorGrade: {
                            ...selectedClip?.colorGrade,
                            ...preset.colorGrade,
                            filterPreset: preset.id
                          } as any
                        });
                        setActiveBottomSheet('none');
                      }
                    }}
                    className="p-2.5 rounded bg-zinc-800/80 border border-zinc-700 text-left text-xs"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block mr-1.5"
                      style={{ backgroundColor: preset.previewColor }}
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            )}

            {activeBottomSheet === 'transitions' && (
              <div className="space-y-2">
                {TRANSITION_CATALOG.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => {
                      if (selectedClipId) {
                        updateClip(selectedClipId, {
                          transitionOut: {
                            type: t.type,
                            duration: t.defaultDuration
                          }
                        });
                        setActiveBottomSheet('none');
                      }
                    }}
                    className="w-full p-2.5 rounded bg-zinc-800/80 border border-zinc-700 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-white">{t.name}</span>
                    <span className="text-[10px] text-cyan-400">{t.defaultDuration}s</span>
                  </button>
                ))}
              </div>
            )}

            {activeBottomSheet === 'transform' && selectedClip && (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-zinc-400 block mb-1">Scale</span>
                  <input
                    type="range"
                    min="0.2"
                    max="3"
                    step="0.05"
                    value={selectedClip.transform.scale}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        transform: { ...selectedClip.transform, scale: parseFloat(e.target.value) }
                      })
                    }
                    className="w-full accent-cyan-400 h-2"
                  />
                </div>
                <div>
                  <span className="text-zinc-400 block mb-1">Rotation</span>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={selectedClip.transform.rotation}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        transform: { ...selectedClip.transform, rotation: parseInt(e.target.value) }
                      })
                    }
                    className="w-full accent-cyan-400 h-2"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
