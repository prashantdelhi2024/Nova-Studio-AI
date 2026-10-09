import React from 'react';
import {
  Move,
  Palette,
  SlidersHorizontal,
  Volume2,
  Gauge,
  Type,
  Key,
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { FILTER_PRESETS, DEFAULT_COLOR_GRADE } from '../../services/colorGrading';
import { TRANSITION_CATALOG } from '../../services/transitions';
import { TransitionType } from '../../types/editor';

export const InspectorPanel: React.FC = () => {
  const {
    selectedClip,
    updateClip,
    currentTime,
    inspectorTab,
    setInspectorTab
  } = useEditor();

  if (!selectedClip) {
    return (
      <aside className="w-72 bg-zinc-950 border-l border-zinc-800/80 p-6 flex flex-col items-center justify-center text-center select-none text-zinc-400">
        <Layers className="w-8 h-8 text-zinc-600 mb-3" />
        <h3 className="text-xs font-semibold text-zinc-300">No Clip Selected</h3>
        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
          Click any video, audio, or title clip on the timeline to edit transforms, color grades, transitions, speed, and audio.
        </p>
      </aside>
    );
  }

  const { transform, colorGrade, audio, speed, textConfig } = selectedClip;

  return (
    <aside className="w-80 bg-zinc-950 border-l border-zinc-800/80 flex flex-col select-none text-xs text-zinc-300 h-full overflow-hidden">
      {/* Header Info */}
      <div className="h-12 border-b border-zinc-800 px-4 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-2 truncate">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedClip.color || '#0284c7' }}
          />
          <span className="font-semibold text-zinc-100 truncate text-xs">
            {selectedClip.name}
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
          {selectedClip.type.toUpperCase()}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/30 overflow-x-auto text-[11px]">
        <button
          onClick={() => setInspectorTab('transform')}
          className={`flex-1 py-2 px-1 text-center font-medium border-b-2 transition-colors flex items-center justify-center gap-1 ${
            inspectorTab === 'transform'
              ? 'border-cyan-400 text-cyan-400 bg-zinc-900/60'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Move className="w-3 h-3" />
          <span>Transform</span>
        </button>

        <button
          onClick={() => setInspectorTab('color')}
          className={`flex-1 py-2 px-1 text-center font-medium border-b-2 transition-colors flex items-center justify-center gap-1 ${
            inspectorTab === 'color'
              ? 'border-cyan-400 text-cyan-400 bg-zinc-900/60'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Palette className="w-3 h-3" />
          <span>Color</span>
        </button>

        <button
          onClick={() => setInspectorTab('transitions')}
          className={`flex-1 py-2 px-1 text-center font-medium border-b-2 transition-colors flex items-center justify-center gap-1 ${
            inspectorTab === 'transitions'
              ? 'border-cyan-400 text-cyan-400 bg-zinc-900/60'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>Transitions</span>
        </button>

        {selectedClip.type === 'text' && (
          <button
            onClick={() => setInspectorTab('text')}
            className={`flex-1 py-2 px-1 text-center font-medium border-b-2 transition-colors flex items-center justify-center gap-1 ${
              inspectorTab === 'text'
                ? 'border-cyan-400 text-cyan-400 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Type className="w-3 h-3" />
            <span>Text</span>
          </button>
        )}

        <button
          onClick={() => setInspectorTab('audio')}
          className={`flex-1 py-2 px-1 text-center font-medium border-b-2 transition-colors flex items-center justify-center gap-1 ${
            inspectorTab === 'audio'
              ? 'border-cyan-400 text-cyan-400 bg-zinc-900/60'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Volume2 className="w-3 h-3" />
          <span>Audio</span>
        </button>

        <button
          onClick={() => setInspectorTab('speed')}
          className={`flex-1 py-2 px-1 text-center font-medium border-b-2 transition-colors flex items-center justify-center gap-1 ${
            inspectorTab === 'speed'
              ? 'border-cyan-400 text-cyan-400 bg-zinc-900/60'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Gauge className="w-3 h-3" />
          <span>Speed</span>
        </button>
      </div>

      {/* Tab Panels Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* TRANSFORM TAB */}
        {inspectorTab === 'transform' && (
          <div className="space-y-4">
            {/* Scale */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Scale</span>
                <span className="font-mono text-zinc-200">{Math.round(transform.scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3"
                step="0.05"
                value={transform.scale}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    transform: { ...transform, scale: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1"
              />
            </div>

            {/* Position X / Y */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-zinc-400 mb-1 block">Pos X</span>
                <input
                  type="number"
                  step="0.05"
                  value={transform.x}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      transform: { ...transform, x: parseFloat(e.target.value) || 0 }
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none"
                />
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 mb-1 block">Pos Y</span>
                <input
                  type="number"
                  step="0.05"
                  value={transform.y}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      transform: { ...transform, y: parseFloat(e.target.value) || 0 }
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none"
                />
              </div>
            </div>

            {/* Rotation */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Rotation</span>
                <span className="font-mono text-zinc-200">{transform.rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={transform.rotation}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    transform: { ...transform, rotation: parseInt(e.target.value) }
                  })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Opacity</span>
                <span className="font-mono text-zinc-200">{Math.round(transform.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={transform.opacity}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    transform: { ...transform, opacity: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1"
              />
            </div>

            {/* Flip H & V */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() =>
                  updateClip(selectedClip.id, {
                    transform: { ...transform, flipH: !transform.flipH }
                  })
                }
                className={`flex-1 py-1.5 rounded border transition-colors ${
                  transform.flipH
                    ? 'bg-cyan-950 border-cyan-500/50 text-cyan-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                Flip Horizontal
              </button>
              <button
                onClick={() =>
                  updateClip(selectedClip.id, {
                    transform: { ...transform, flipV: !transform.flipV }
                  })
                }
                className={`flex-1 py-1.5 rounded border transition-colors ${
                  transform.flipV
                    ? 'bg-cyan-950 border-cyan-500/50 text-cyan-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                Flip Vertical
              </button>
            </div>

            {/* Reset transform */}
            <button
              onClick={() =>
                updateClip(selectedClip.id, {
                  transform: {
                    x: 0,
                    y: 0,
                    scale: 1,
                    rotation: 0,
                    opacity: 1,
                    flipH: false,
                    flipV: false,
                    fit: 'cover',
                    crop: { top: 0, bottom: 0, left: 0, right: 0 }
                  }
                })
              }
              className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Transform</span>
            </button>
          </div>
        )}

        {/* COLOR GRADE TAB */}
        {inspectorTab === 'color' && (
          <div className="space-y-4">
            {/* Filter Preset Picker */}
            <div>
              <span className="text-[11px] text-zinc-400 mb-1.5 block font-medium">Quick Grade Preset</span>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {FILTER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      updateClip(selectedClip.id, {
                        colorGrade: {
                          ...colorGrade,
                          ...p.colorGrade,
                          filterPreset: p.id
                        }
                      })
                    }
                    className={`p-1.5 rounded border text-left truncate flex items-center gap-1.5 transition-colors ${
                      colorGrade.filterPreset === p.id
                        ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                        : 'border-zinc-800/80 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.previewColor }}
                    />
                    <span className="truncate text-[10px]">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Contrast */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Contrast</span>
                <span className="font-mono text-zinc-200">{colorGrade.contrast}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={colorGrade.contrast}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    colorGrade: { ...colorGrade, contrast: parseInt(e.target.value) }
                  })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Saturation</span>
                <span className="font-mono text-zinc-200">{colorGrade.saturation}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={colorGrade.saturation}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    colorGrade: { ...colorGrade, saturation: parseInt(e.target.value) }
                  })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1"
              />
            </div>

            {/* Temperature */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Temperature (Warm / Cool)</span>
                <span className="font-mono text-zinc-200">{colorGrade.temperature}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={colorGrade.temperature}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    colorGrade: { ...colorGrade, temperature: parseInt(e.target.value) }
                  })
                }
                className="w-full accent-amber-400 cursor-pointer h-1"
              />
            </div>

            {/* Vignette */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Vignette</span>
                <span className="font-mono text-zinc-200">{colorGrade.vignette}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={colorGrade.vignette}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    colorGrade: { ...colorGrade, vignette: parseInt(e.target.value) }
                  })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1"
              />
            </div>

            {/* Film Grain */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Film Grain Noise</span>
                <span className="font-mono text-zinc-200">{colorGrade.grain}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={colorGrade.grain}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    colorGrade: { ...colorGrade, grain: parseInt(e.target.value) }
                  })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1"
              />
            </div>

            {/* Reset Grade */}
            <button
              onClick={() =>
                updateClip(selectedClip.id, {
                  colorGrade: DEFAULT_COLOR_GRADE
                })
              }
              className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Color Grade</span>
            </button>
          </div>
        )}

        {/* TRANSITIONS TAB */}
        {inspectorTab === 'transitions' && (
          <div className="space-y-4">
            {/* Transition In */}
            <div>
              <span className="text-[11px] text-zinc-400 mb-1 block font-medium">Transition In</span>
              <select
                value={selectedClip.transitionIn?.type || 'none'}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    transitionIn: {
                      type: e.target.value as TransitionType,
                      duration: selectedClip.transitionIn?.duration || 0.6
                    }
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 outline-none"
              >
                <option value="none">None (Cut)</option>
                {TRANSITION_CATALOG.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.name}
                  </option>
                ))}
              </select>

              {selectedClip.transitionIn && selectedClip.transitionIn.type !== 'none' && (
                <div className="mt-2">
                  <div className="flex justify-between text-zinc-400 mb-1 text-[11px]">
                    <span>In Duration</span>
                    <span className="font-mono text-zinc-200">
                      {selectedClip.transitionIn.duration.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={selectedClip.transitionIn.duration}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        transitionIn: {
                          type: selectedClip.transitionIn!.type,
                          duration: parseFloat(e.target.value)
                        }
                      })
                    }
                    className="w-full accent-cyan-400 cursor-pointer h-1"
                  />
                </div>
              )}
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Transition Out */}
            <div>
              <span className="text-[11px] text-zinc-400 mb-1 block font-medium">Transition Out</span>
              <select
                value={selectedClip.transitionOut?.type || 'none'}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    transitionOut: {
                      type: e.target.value as TransitionType,
                      duration: selectedClip.transitionOut?.duration || 0.6
                    }
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 outline-none"
              >
                <option value="none">None (Cut)</option>
                {TRANSITION_CATALOG.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.name}
                  </option>
                ))}
              </select>

              {selectedClip.transitionOut && selectedClip.transitionOut.type !== 'none' && (
                <div className="mt-2">
                  <div className="flex justify-between text-zinc-400 mb-1 text-[11px]">
                    <span>Out Duration</span>
                    <span className="font-mono text-zinc-200">
                      {selectedClip.transitionOut.duration.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={selectedClip.transitionOut.duration}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        transitionOut: {
                          type: selectedClip.transitionOut!.type,
                          duration: parseFloat(e.target.value)
                        }
                      })
                    }
                    className="w-full accent-indigo-400 cursor-pointer h-1"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TEXT & TITLE TAB */}
        {inspectorTab === 'text' && textConfig && (
          <div className="space-y-4">
            <div>
              <span className="text-[11px] text-zinc-400 mb-1 block">Title Text</span>
              <textarea
                value={textConfig.text}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    textConfig: { ...textConfig, text: e.target.value }
                  })
                }
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-zinc-400 mb-1 block">Font Size</span>
                <input
                  type="number"
                  min="16"
                  max="120"
                  value={textConfig.fontSize}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      textConfig: { ...textConfig, fontSize: parseInt(e.target.value) || 36 }
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
                />
              </div>

              <div>
                <span className="text-[11px] text-zinc-400 mb-1 block">Text Color</span>
                <input
                  type="color"
                  value={textConfig.color}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      textConfig: { ...textConfig, color: e.target.value }
                    })
                  }
                  className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded p-0.5 cursor-pointer"
                />
              </div>
            </div>

            {/* Animation Style */}
            <div>
              <span className="text-[11px] text-zinc-400 mb-1 block">Motion Animation</span>
              <select
                value={textConfig.animation}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    textConfig: { ...textConfig, animation: e.target.value as any }
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200"
              >
                <option value="none">None (Static)</option>
                <option value="pop-in">Pop-In Bounce</option>
                <option value="slide-up">Smooth Slide Up</option>
                <option value="fade">Cinema Fade</option>
              </select>
            </div>
          </div>
        )}

        {/* AUDIO TAB */}
        {inspectorTab === 'audio' && (
          <div className="space-y-4">
            {/* Volume */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Clip Volume</span>
                <span className="font-mono text-zinc-200">{Math.round(audio.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={audio.volume}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    audio: { ...audio, volume: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-emerald-400 cursor-pointer h-1"
              />
            </div>

            {/* Fade In & Out */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-zinc-400 mb-1 block">Fade In (sec)</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={audio.fadeIn}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      audio: { ...audio, fadeIn: parseFloat(e.target.value) || 0 }
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
                />
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 mb-1 block">Fade Out (sec)</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={audio.fadeOut}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      audio: { ...audio, fadeOut: parseFloat(e.target.value) || 0 }
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
                />
              </div>
            </div>

            {/* Mute Clip */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={audio.isMuted}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      audio: { ...audio, isMuted: e.target.checked }
                    })
                  }
                  className="accent-cyan-400 rounded"
                />
                <span>Mute this clip</span>
              </label>
            </div>
          </div>
        )}

        {/* SPEED TAB */}
        {inspectorTab === 'speed' && (
          <div className="space-y-4">
            <span className="text-[11px] text-zinc-400 block font-medium">Speed Multiplier</span>
            
            {/* Speed Quick Presets */}
            <div className="grid grid-cols-4 gap-1.5">
              {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() =>
                    updateClip(selectedClip.id, {
                      speed: { ...speed, rate }
                    })
                  }
                  className={`py-1.5 rounded border text-center font-mono ${
                    speed.rate === rate
                      ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Rate Slider */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Custom Rate</span>
                <span className="font-mono text-zinc-200">{speed.rate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="5.0"
                step="0.1"
                value={speed.rate}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    speed: { ...speed, rate: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1"
              />
            </div>

            {/* Reverse playback */}
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300 pt-2">
              <input
                type="checkbox"
                checked={speed.reverse}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    speed: { ...speed, reverse: e.target.checked }
                  })
                }
                className="accent-cyan-400 rounded"
              />
              <span>Reverse Playback</span>
            </label>
          </div>
        )}
      </div>
    </aside>
  );
};
