import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Download,
  AlertCircle,
  CheckCircle2,
  Film,
  Settings2,
  StopCircle,
  Loader2
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { ExportSettings } from '../../types/editor';

export const ExportModal: React.FC = () => {
  const {
    project,
    isExportModalOpen,
    setIsExportModalOpen,
    startExport,
    cancelExport,
    exportProgress
  } = useEditor();

  const [format, setFormat] = useState<'webm' | 'mp4' | 'audio-only'>('mp4');
  const [resolution, setResolution] = useState<'480p' | '720p' | '1080p' | '1440p' | '4k'>('1080p');
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [quality, setQuality] = useState<'high' | 'balanced' | 'fast'>('high');

  const [isExporting, setIsExporting] = useState(false);
  const [downloadResult, setDownloadResult] = useState<{ url: string; filename: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isExportModalOpen) return null;

  // Calculate resolution dimensions respecting project's aspect ratio
  const getDimensions = () => {
    const isVertical = project.settings.aspectRatio === '9:16';
    const isSquare = project.settings.aspectRatio === '1:1';
    const isUltraWide = project.settings.aspectRatio === '21:9';

    if (resolution === '4k') {
      if (isVertical) return { width: 2160, height: 3840 };
      if (isSquare) return { width: 2160, height: 2160 };
      if (isUltraWide) return { width: 5120, height: 2160 };
      return { width: 3840, height: 2160 };
    } else if (resolution === '1440p') {
      if (isVertical) return { width: 1440, height: 2560 };
      if (isSquare) return { width: 1440, height: 1440 };
      if (isUltraWide) return { width: 3440, height: 1440 };
      return { width: 2560, height: 1440 };
    } else if (resolution === '1080p') {
      if (isVertical) return { width: 1080, height: 1920 };
      if (isSquare) return { width: 1080, height: 1080 };
      if (isUltraWide) return { width: 2560, height: 1080 };
      return { width: 1920, height: 1080 };
    } else if (resolution === '720p') {
      if (isVertical) return { width: 720, height: 1280 };
      if (isSquare) return { width: 720, height: 720 };
      return { width: 1280, height: 720 };
    } else {
      if (isVertical) return { width: 480, height: 854 };
      if (isSquare) return { width: 480, height: 480 };
      return { width: 854, height: 480 };
    }
  };

  const handleStartExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setDownloadResult(null);

    const dims = getDimensions();
    const settings: ExportSettings = {
      format,
      resolution,
      fps,
      quality,
      width: dims.width,
      height: dims.height
    };

    try {
      const res = await startExport(settings);
      setDownloadResult({ url: res.url, filename: res.filename });
    } catch (err: any) {
      if (err.message !== 'Export cancelled by user') {
        setErrorMessage(err.message || 'Rendering failed');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancel = () => {
    cancelExport();
    setIsExporting(false);
  };

  const triggerDownload = () => {
    if (downloadResult) {
      const a = document.createElement('a');
      a.href = downloadResult.url;
      a.download = downloadResult.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const dims = getDimensions();
  const estimatedMB = Math.round(
    (project.duration * (quality === 'high' ? 8 : quality === 'balanced' ? 4.5 : 2.5)) / 8
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-xs text-zinc-300">
        {/* Header */}
        <div className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-100 text-sm">Export & Render Timeline</h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                Duration: {project.duration.toFixed(1)}s • Aspect: {project.settings.aspectRatio}
              </p>
            </div>
          </div>

          <button
            onClick={() => !isExporting && setIsExportModalOpen(false)}
            disabled={isExporting}
            className="text-zinc-500 hover:text-white p-1 rounded transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status / Active Render Progress View */}
          {isExporting && exportProgress && (
            <div className="p-4 bg-zinc-900/80 border border-cyan-500/40 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span className="font-semibold text-zinc-100">
                    {exportProgress.status === 'encoding' ? 'Finalizing Video File...' : 'Rendering Frames...'}
                  </span>
                </div>
                <span className="font-mono text-cyan-400 font-bold text-sm">
                  {exportProgress.percent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 transition-all duration-150"
                  style={{ width: `${exportProgress.percent}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                <span>
                  Frame {exportProgress.currentFrame} / {exportProgress.totalFrames}
                </span>
                <span>
                  Elapsed: {exportProgress.elapsedSeconds}s • ETA: {exportProgress.etaSeconds}s
                </span>
              </div>

              <button
                onClick={handleCancel}
                className="w-full mt-2 py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-200 rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Cancel Render</span>
              </button>
            </div>
          )}

          {/* Success Download View */}
          {downloadResult && !isExporting && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Video Rendered Successfully!</span>
              </div>
              <p className="text-[11px] text-zinc-300">
                Your edited video file <strong>{downloadResult.filename}</strong> has been encoded with full timeline cuts, transitions, color grading, and mixed audio.
              </p>

              <button
                onClick={triggerDownload}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-md flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40"
              >
                <Download className="w-4 h-4" />
                <span>Download Video File</span>
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-red-300 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Settings form (when not rendering) */}
          {!isExporting && !downloadResult && (
            <div className="space-y-4">
              {/* Resolution */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1.5">Resolution Preset</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['720p', '1080p', '4k'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setResolution(r)}
                      className={`py-2 px-3 rounded-lg border text-center transition-colors ${
                        resolution === r
                          ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200 font-semibold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs uppercase">{r}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {r === '1080p' ? 'Full HD' : r === '4k' ? 'Ultra HD' : 'HD'}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[11px] font-mono text-zinc-500">
                  Target Canvas: {dims.width} × {dims.height} px
                </div>
              </div>

              {/* Format & Frame Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1.5">File Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none"
                  >
                    <option value="mp4">MP4 (H.264 / AVC)</option>
                    <option value="webm">WebM (VP9 High Efficiency)</option>
                    <option value="audio-only">Audio Only (WAV/WebM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1.5">Frame Rate</label>
                  <select
                    value={fps}
                    onChange={(e) => setFps(parseInt(e.target.value) as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none"
                  >
                    <option value={24}>24 fps (Cinematic Film)</option>
                    <option value={30}>30 fps (Broadcast Standard)</option>
                    <option value={60}>60 fps (High Velocity Smooth)</option>
                  </select>
                </div>
              </div>

              {/* Quality & Estimated Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1.5">Bitrate Quality</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none"
                  >
                    <option value="high">High (Maximum Quality)</option>
                    <option value="balanced">Balanced (Recommended)</option>
                    <option value="fast">Fast (Smaller File)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1.5">Estimated File Size</label>
                  <div className="h-9 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 flex items-center font-mono text-zinc-300">
                    ~{estimatedMB} MB
                  </div>
                </div>
              </div>

              {/* Information pill */}
              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-[11px] text-zinc-400 flex items-start gap-2">
                <Settings2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>
                  All active tracks, transitions, color grading, title animations, and audio ducking will be rendered directly in browser memory without watermarks or account sign-up.
                </span>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleStartExport}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Start Video Render</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
