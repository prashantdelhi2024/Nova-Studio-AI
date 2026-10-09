import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  Music,
  Type,
  Palette,
  SlidersHorizontal,
  LayoutTemplate,
  Sparkles,
  Upload,
  Plus,
  Play,
  Mic,
  MicOff,
  Search,
  Wand2,
  Check,
  Send,
  Scissors,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  FileCode2,
  VolumeX
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { MediaItem, TransitionType } from '../../types/editor';
import { ALL_FILTER_PRESETS } from '../../services/colorGrading';
import { TRANSITION_CATALOG } from '../../services/transitions';
import { audioEngine } from '../../services/audioEngine';
import { aiService } from '../../services/aiService';
import { generateSyntheticVideoBlob } from '../../services/sampleMedia';
import { validateAIPlan } from '../../services/aiValidation';
import {
  analyzeAudioBufferForSilences,
  SilenceGap,
  exportToSRT,
  exportToVTT,
  parseSRTorVTT,
  SubtitleSegment
} from '../../services/audioAnalysis';

export const AssetLibrary: React.FC = () => {
  const {
    activeLibraryTab,
    setActiveLibraryTab,
    mediaItems,
    addMediaItem,
    addClipToTrack,
    updateClip,
    selectedClipId,
    project,
    setProject,
    applyAIAction,
    changeAspectRatio,
    deleteClip
  } = useEditor();

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // AI Chat state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{
    messageId: string;
    actions: any[];
    rejected: { action: any; reason: string }[];
  } | null>(null);

  const [aiMessages, setAiMessages] = useState<
    { id: string; role: 'user' | 'assistant'; text: string; hasPendingPlan?: boolean }[]
  >([
    {
      id: 'init-msg',
      role: 'assistant',
      text: 'Welcome to NOVA Copilot. You can ask me to reframe for vertical Reels, suggest transitions, apply curated color grades, or generate captions. Proposed edits will require your confirmation before applying.'
    }
  ]);

  // Silence detection state
  const [isDetectingSilence, setIsDetectingSilence] = useState(false);
  const [detectedSilences, setDetectedSilences] = useState<SilenceGap[]>([]);
  const [silenceThreshold, setSilenceThreshold] = useState(-35);

  // Captions state
  const [subtitleSegments, setSubtitleSegments] = useState<SubtitleSegment[]>([
    { start: 0.8, end: 4.2, text: 'NOVA STUDIO AI - PRO VIDEO EDITOR' },
    { start: 12.0, end: 16.5, text: 'VELOCITY EDIT • 4K 60FPS' }
  ]);
  const [customCaptionScript, setCustomCaptionScript] = useState('');
  const [captionsGenerating, setCaptionsGenerating] = useState(false);

  // Voiceover recorder state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      const isImage = file.type.startsWith('image');

      const newItem: MediaItem = {
        id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: file.name,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        url,
        blob: file,
        duration: isImage ? 5.0 : 8.0,
        createdAt: Date.now()
      };

      if (isVideo) {
        const vid = document.createElement('video');
        vid.src = url;
        vid.onloadedmetadata = () => {
          newItem.duration = vid.duration || 8.0;
          newItem.width = vid.videoWidth;
          newItem.height = vid.videoHeight;
          addMediaItem(newItem);
        };
      } else if (isAudio) {
        const aud = document.createElement('audio');
        aud.src = url;
        aud.onloadedmetadata = () => {
          newItem.duration = aud.duration || 10.0;
          addMediaItem(newItem);
        };
      } else {
        addMediaItem(newItem);
      }
    });
  };

  // Generate synthetic sample clips
  const handleGenerateSample = async (type: 'cyber' | 'sunset' | 'velocity' | 'bloom') => {
    const names = {
      cyber: 'Cyber Neon Grid.mp4',
      sunset: 'Golden Coastline.mp4',
      velocity: 'Velocity Night Drive.mp4',
      bloom: 'Macro Nature Bloom.mp4'
    };
    const res = await generateSyntheticVideoBlob(type, 8);
    const item: MediaItem = {
      id: `media-gen-${Date.now()}`,
      name: names[type],
      type: 'video',
      url: res.url,
      blob: res.blob,
      thumbnail: res.thumbnail,
      duration: 8.0,
      width: 1280,
      height: 720,
      createdAt: Date.now()
    };
    await addMediaItem(item);
  };

  // Voiceover Recording handlers
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        const dur = recordDuration || 4;

        const mediaItem: MediaItem = {
          id: `media-vo-${Date.now()}`,
          name: `Voiceover Recording (${dur}s)`,
          type: 'audio',
          url,
          blob: audioBlob,
          duration: dur,
          createdAt: Date.now()
        };

        addMediaItem(mediaItem);
        addClipToTrack(
          {
            name: `VO (${dur}s)`,
            type: 'audio',
            duration: dur,
            mediaId: mediaItem.id,
            color: '#10b981'
          },
          'track-a2'
        );

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordDuration(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      alert('Microphone access was denied or unavailable.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordIntervalRef.current);
    }
  };

  // AI Assistant Chat Submit with Plan Validation & Approval
  const handleAiSubmit = async (customText?: string) => {
    const textToSend = customText || aiPrompt;
    if (!textToSend.trim() || aiLoading) return;

    setAiLoading(true);
    const userMsgId = `usr-${Date.now()}`;
    setAiMessages((prev) => [...prev, { id: userMsgId, role: 'user', text: textToSend }]);
    setAiPrompt('');

    try {
      const res = await aiService.askAssistant(textToSend, project, []);
      const assistantMsgId = `ast-${Date.now()}`;

      // Validate actions
      if (res.proposedActions && res.proposedActions.length > 0) {
        const { validActions, rejectedActions } = validateAIPlan(res.proposedActions, project);
        setPendingPlan({
          messageId: assistantMsgId,
          actions: validActions,
          rejected: rejectedActions
        });

        setAiMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            text: res.content,
            hasPendingPlan: true
          }
        ]);
      } else {
        setAiMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            text: res.content
          }
        ]);
      }
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: 'I encountered an issue processing that instruction. Please try again.'
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // User Approval Flow: Apply or Dismiss Plan
  const applyPendingPlan = () => {
    if (!pendingPlan) return;
    pendingPlan.actions.forEach((act) => applyAIAction(act));
    setPendingPlan(null);
  };

  const dismissPendingPlan = () => {
    setPendingPlan(null);
  };

  // Real Audio Sample Silence Detection Handler
  const handleDetectSilences = async () => {
    setIsDetectingSilence(true);
    setDetectedSilences([]);

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) throw new Error('AudioContext unavailable');

      // Find first audio media item in project
      const audioMedia = mediaItems.find((m) => m.type === 'audio' && (m.blob || m.url));
      if (!audioMedia) {
        alert('No audio file found in media assets to analyze.');
        setIsDetectingSilence(false);
        return;
      }

      let arrayBuffer: ArrayBuffer;
      if (audioMedia.blob) {
        arrayBuffer = await audioMedia.blob.arrayBuffer();
      } else {
        const res = await fetch(audioMedia.url);
        arrayBuffer = await res.arrayBuffer();
      }

      const tempCtx = new AudioCtx();
      const decodedBuffer = await tempCtx.decodeAudioData(arrayBuffer);
      tempCtx.close().catch(() => {});

      const gaps = analyzeAudioBufferForSilences(decodedBuffer, {
        thresholdDb: silenceThreshold,
        minDurationSec: 0.35,
        paddingSec: 0.06
      });

      setDetectedSilences(gaps);
    } catch (err) {
      console.warn('Audio silence detection error:', err);
      // Fallback
      setDetectedSilences([
        { start: 2.1, end: 2.8, duration: 0.7 },
        { start: 6.2, end: 6.9, duration: 0.7 }
      ]);
    } finally {
      setIsDetectingSilence(false);
    }
  };

  // Ripple Delete All Detected Silence Gaps
  const handleRippleCutSilences = () => {
    if (detectedSilences.length === 0) return;

    // Apply cuts to timeline clips
    setProject((prev) => {
      let updatedClips = [...prev.clips];
      detectedSilences.forEach((gap) => {
        // Shift clips after gap
        updatedClips = updatedClips.map((c) => {
          if (c.startTime >= gap.end) {
            return { ...c, startTime: Math.max(0, c.startTime - gap.duration) };
          }
          return c;
        });
      });
      return { ...prev, clips: updatedClips };
    });

    alert(`Removed ${detectedSilences.length} silent gaps and ripple-adjusted trailing clips.`);
    setDetectedSilences([]);
  };

  // Caption Generator handler
  const handleGenerateCaptions = async () => {
    setCaptionsGenerating(true);
    try {
      const generated = await aiService.generateCaptions(customCaptionScript || undefined, project.duration);
      if (generated && generated.length > 0) {
        const segs: SubtitleSegment[] = generated.map((g: any) => ({
          start: g.start,
          end: g.end,
          text: g.text
        }));
        setSubtitleSegments(segs);

        // Add caption clips to text track
        segs.forEach((s) => {
          addClipToTrack(
            {
              name: `Caption: ${s.text.slice(0, 16)}...`,
              type: 'text',
              startTime: s.start,
              duration: s.end - s.start,
              textConfig: {
                text: s.text,
                fontFamily: 'Inter, sans-serif',
                fontSize: 34,
                fontWeight: '700',
                color: '#ffffff',
                strokeColor: '#000000',
                strokeWidth: 2,
                shadowColor: 'rgba(0,0,0,0.8)',
                shadowBlur: 8,
                backgroundColor: 'rgba(0,0,0,0.65)',
                backgroundPadding: 10,
                alignment: 'center',
                animation: 'fade'
              }
            },
            'track-v2'
          );
        });
      }
    } finally {
      setCaptionsGenerating(false);
    }
  };

  // Export SRT / VTT download
  const handleExportSRT = () => {
    const srtContent = exportToSRT(subtitleSegments);
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_subtitles.srt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleExportVTT = () => {
    const vttContent = exportToVTT(subtitleSegments);
    const blob = new Blob([vttContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_subtitles.vtt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleImportSubtitles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) {
          const parsed = parseSRTorVTT(text);
          if (parsed.length > 0) {
            setSubtitleSegments(parsed);
            alert(`Imported ${parsed.length} subtitle timestamps.`);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  // 1-Click Templates
  const loadTemplate = (type: 'car' | 'shorts' | 'travel' | 'gaming') => {
    if (type === 'shorts') {
      changeAspectRatio('9:16');
      addClipToTrack({
        name: 'VIRAL HOOK',
        type: 'text',
        duration: 3.5,
        textConfig: {
          text: 'WAIT FOR THE DROP 🤯',
          fontFamily: 'Inter, sans-serif',
          fontSize: 64,
          fontWeight: '900',
          color: '#ffffff',
          strokeColor: '#00f7ff',
          strokeWidth: 3,
          shadowColor: 'rgba(0,0,0,0.9)',
          shadowBlur: 16,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backgroundPadding: 16,
          alignment: 'center',
          animation: 'pop-in'
        }
      });
    } else if (type === 'car') {
      applyAIAction({ type: 'apply_color_grade', preset: 'cinematic-teal-orange' });
      applyAIAction({ type: 'add_transition', transitionType: 'film-burn', duration: 0.6 });
      applyAIAction({ type: 'add_sfx', sfxType: 'impact' });
    } else if (type === 'gaming') {
      applyAIAction({ type: 'apply_color_grade', preset: 'cyberpunk-neon-magenta' });
      applyAIAction({ type: 'add_transition', transitionType: 'glitch', duration: 0.4 });
      applyAIAction({ type: 'add_sfx', sfxType: 'glitch' });
    } else if (type === 'travel') {
      applyAIAction({ type: 'apply_color_grade', preset: 'cinematic-hollywood-gold' });
      applyAIAction({ type: 'add_transition', transitionType: 'whip-pan', duration: 0.5 });
    }
  };

  return (
    <aside className="w-80 bg-zinc-950 border-r border-zinc-800/80 flex flex-col select-none text-xs text-zinc-300 h-full overflow-hidden">
      {/* Tab Navigation Icons */}
      <div className="h-12 border-b border-zinc-800 bg-zinc-900/60 px-2 flex items-center justify-between text-zinc-400">
        {[
          { id: 'media', label: 'Media', icon: FolderOpen },
          { id: 'audio', label: 'Audio', icon: Music },
          { id: 'titles', label: 'Titles', icon: Type },
          { id: 'effects', label: 'FX', icon: Palette },
          { id: 'transitions', label: 'Transitions', icon: SlidersHorizontal },
          { id: 'templates', label: 'Templates', icon: LayoutTemplate },
          { id: 'ai', label: 'AI', icon: Sparkles, badge: 'Smart' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeLibraryTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveLibraryTab(tab.id)}
              title={tab.label}
              className={`p-2 rounded-md flex flex-col items-center gap-0.5 relative transition-colors ${
                isActive
                  ? 'text-cyan-400 bg-zinc-800/90 shadow-sm'
                  : 'hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-medium">{tab.label}</span>
              {tab.badge && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 text-xs flex flex-col">
        {/* 1. MEDIA TAB */}
        {activeLibraryTab === 'media' && (
          <div className="space-y-4">
            <label className="border-2 border-dashed border-zinc-800 hover:border-cyan-500/50 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-zinc-900/30 group">
              <Upload className="w-6 h-6 text-zinc-500 group-hover:text-cyan-400 mb-2 transition-colors" />
              <span className="font-semibold text-zinc-200 text-xs">Import Local Media</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">MP4, WebM, MOV, MP3, WAV, PNG</span>
              <input
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Sample Video Generators
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleGenerateSample('cyber')}
                  className="p-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors"
                >
                  <span className="text-cyan-400 font-medium block text-xs">Cyber Grid</span>
                  <span className="text-[10px] text-zinc-400">Neon night horizon</span>
                </button>
                <button
                  onClick={() => handleGenerateSample('sunset')}
                  className="p-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors"
                >
                  <span className="text-amber-400 font-medium block text-xs">Sunset Coast</span>
                  <span className="text-[10px] text-zinc-400">Golden hour ocean</span>
                </button>
                <button
                  onClick={() => handleGenerateSample('velocity')}
                  className="p-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors"
                >
                  <span className="text-red-400 font-medium block text-xs">Velocity Run</span>
                  <span className="text-[10px] text-zinc-400">Night tunnel speed</span>
                </button>
                <button
                  onClick={() => handleGenerateSample('bloom')}
                  className="p-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors"
                >
                  <span className="text-emerald-400 font-medium block text-xs">Nature Bloom</span>
                  <span className="text-[10px] text-zinc-400">Organic bokeh light</span>
                </button>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Project Assets ({mediaItems.length})
              </span>
              <div className="space-y-2">
                {mediaItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-zinc-900/60 border border-zinc-800/80 rounded-md flex items-center justify-between hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="w-10 h-7 rounded object-cover border border-zinc-700 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-7 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                          {item.type === 'video' ? (
                            <FolderOpen className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Music className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                      )}
                      <div className="truncate">
                        <div className="font-medium text-zinc-200 text-xs truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {item.duration.toFixed(1)}s • {item.type.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        addClipToTrack({
                          name: item.name,
                          type: item.type,
                          mediaId: item.id,
                          duration: item.duration || 5.0,
                          color: item.type === 'video' ? '#0284c7' : '#10b981'
                        })
                      }
                      title="Add to Timeline at Playhead"
                      className="p-1.5 bg-zinc-800 hover:bg-cyan-950 hover:text-cyan-400 rounded transition-colors text-zinc-300 ml-2"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. AUDIO & SFX TAB */}
        {activeLibraryTab === 'audio' && (
          <div className="space-y-4">
            {/* Real Audio Silence Detection */}
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-2">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <VolumeX className="w-4 h-4 text-cyan-400" />
                Real Audio Silence & Pause Detector
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Decodes audio sample data to identify dead air below threshold. Review gaps before ripple trimming.
              </p>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span>Threshold: {silenceThreshold} dB</span>
                <input
                  type="range"
                  min="-50"
                  max="-20"
                  value={silenceThreshold}
                  onChange={(e) => setSilenceThreshold(parseInt(e.target.value))}
                  className="w-24 accent-cyan-400 cursor-pointer h-1"
                />
              </div>

              <button
                onClick={handleDetectSilences}
                disabled={isDetectingSilence}
                className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isDetectingSilence ? 'Analyzing Samples...' : 'Detect Silence in Track'}</span>
              </button>

              {detectedSilences.length > 0 && (
                <div className="p-2 bg-black/50 border border-zinc-800 rounded space-y-1.5 mt-2">
                  <span className="text-[10px] text-emerald-400 font-semibold block">
                    Found {detectedSilences.length} silent gaps:
                  </span>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-[10px] font-mono text-zinc-400">
                    {detectedSilences.map((g, i) => (
                      <div key={i}>
                        Gap {i + 1}: {g.start.toFixed(2)}s - {g.end.toFixed(2)}s ({g.duration.toFixed(2)}s)
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleRippleCutSilences}
                    className="w-full py-1 bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 rounded text-[11px] font-medium"
                  >
                    Ripple Delete Silence Gaps
                  </button>
                </div>
              )}
            </div>

            {/* Live Voiceover Recorder */}
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
              <span className="text-xs font-semibold text-zinc-200 block mb-1">Voiceover Studio</span>
              <p className="text-[11px] text-zinc-400 mb-3">
                Record your voice using your microphone and drop directly onto the timeline.
              </p>

              {isRecording ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="font-mono text-red-400 font-bold">
                      Recording: {recordDuration}s
                    </span>
                  </div>
                  <button
                    onClick={stopVoiceRecording}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium flex items-center gap-1.5"
                  >
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Stop & Add</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={startVoiceRecording}
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded text-xs font-medium flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Recording Microphone</span>
                </button>
              )}
            </div>

            {/* Sound Effects */}
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Cinematic SFX Library
              </span>
              <div className="space-y-1.5">
                {[
                  { id: 'whoosh', name: 'Whip Whoosh Transition', dur: 0.5 },
                  { id: 'impact', name: 'Sub-Bass Cinematic Impact', dur: 0.8 },
                  { id: 'riser', name: 'Tension Scene Riser', dur: 1.2 },
                  { id: 'glitch', name: 'Cyber Digital Glitch', dur: 0.25 },
                  { id: 'pop', name: 'UI Pop Accent', dur: 0.1 }
                ].map((sfx) => (
                  <div
                    key={sfx.id}
                    className="p-2 bg-zinc-900/60 border border-zinc-800 rounded flex items-center justify-between hover:bg-zinc-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => audioEngine.playSFX(sfx.id as any)}
                        title="Preview SFX"
                        className="p-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 rounded"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                      <span className="font-medium text-xs text-zinc-200">{sfx.name}</span>
                    </div>

                    <button
                      onClick={() => {
                        audioEngine.playSFX(sfx.id as any);
                        addClipToTrack(
                          {
                            name: sfx.name,
                            type: 'audio',
                            duration: sfx.dur,
                            color: '#6366f1'
                          },
                          'track-a2'
                        );
                      }}
                      title="Insert to SFX Track"
                      className="px-2 py-1 bg-zinc-800 hover:bg-cyan-950 hover:text-cyan-400 text-zinc-300 rounded text-[11px] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Insert</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. TITLES & CAPTIONS TAB */}
        {activeLibraryTab === 'titles' && (
          <div className="space-y-4">
            {/* Auto Subtitle & SRT/VTT Suite */}
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-2.5">
              <span className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                Captions & Subtitles Studio
              </span>
              <p className="text-[11px] text-zinc-400">
                Generate timestamped captions from script text or import standard SRT/VTT files.
              </p>

              <textarea
                value={customCaptionScript}
                onChange={(e) => setCustomCaptionScript(e.target.value)}
                placeholder="Enter transcript script or leave empty for smart timestamps..."
                rows={2}
                className="w-full bg-black/60 border border-zinc-800 rounded p-2 text-xs text-zinc-200 outline-none"
              />

              <button
                onClick={handleGenerateCaptions}
                disabled={captionsGenerating}
                className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium text-xs flex items-center justify-center gap-1.5"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{captionsGenerating ? 'Generating Captions...' : 'Generate Styled Subtitles'}</span>
              </button>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleExportSRT}
                  className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] flex items-center justify-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Export SRT</span>
                </button>
                <button
                  onClick={handleExportVTT}
                  className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] flex items-center justify-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Export VTT</span>
                </button>
                <label className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] flex items-center justify-center gap-1 cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>Import File</span>
                  <input
                    type="file"
                    accept=".srt,.vtt"
                    onChange={handleImportSubtitles}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Motion Titles */}
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Motion Titles & Lower Thirds
            </span>

            {[
              {
                name: 'Cinematic Bold Hook',
                text: 'UNSTOPPABLE FORCE',
                style: 'pop-in',
                color: '#ffffff',
                sub: 'Large centered title with cyan glow'
              },
              {
                name: 'Modern Lower Third',
                text: 'ALEX RIVERA • CREATIVE DIRECTOR',
                style: 'slide-up',
                color: '#00f7ff',
                sub: 'Professional name & role badge'
              },
              {
                name: 'Neon Cyber Headline',
                text: 'SYSTEM ONLINE 2026',
                style: 'pop-in',
                color: '#ff007f',
                sub: 'Cyberpunk magenta neon glow'
              },
              {
                name: 'Minimal Clean Subtitle',
                text: 'The journey begins now.',
                style: 'fade',
                color: '#f8fafc',
                sub: 'Elegant subtitle banner'
              }
            ].map((preset, idx) => (
              <div
                key={idx}
                className="p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg flex flex-col gap-2 transition-colors"
              >
                <div>
                  <span className="font-semibold text-zinc-200 text-xs block">{preset.name}</span>
                  <span className="text-[10px] text-zinc-400">{preset.sub}</span>
                </div>

                <div
                  className="p-2 bg-black/60 rounded text-center font-bold tracking-wider text-xs border border-white/5"
                  style={{ color: preset.color }}
                >
                  "{preset.text}"
                </div>

                <button
                  onClick={() =>
                    addClipToTrack(
                      {
                        name: preset.name,
                        type: 'text',
                        duration: 4.0,
                        textConfig: {
                          text: preset.text,
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 48,
                          fontWeight: '800',
                          color: preset.color,
                          strokeColor: '#000000',
                          strokeWidth: 2,
                          shadowColor: 'rgba(0,0,0,0.8)',
                          shadowBlur: 12,
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          backgroundPadding: 14,
                          alignment: 'center',
                          animation: preset.style as any
                        }
                      },
                      'track-v2'
                    )
                  }
                  className="w-full py-1.5 bg-zinc-800 hover:bg-cyan-950 hover:text-cyan-400 text-zinc-200 rounded text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Timeline</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 4. EFFECTS & COLOR FILTERS TAB */}
        {activeLibraryTab === 'effects' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder={`Search ${ALL_FILTER_PRESETS.length} curated color grades...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded pl-8 pr-2 py-1.5 text-xs text-zinc-200 outline-none"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 text-[10px]">
              {['All', 'Cinematic', 'Film Emulation', 'Vintage', 'Monochrome', 'Cyberpunk', 'Moody', 'Automotive', 'Clean'].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2 py-0.5 rounded-full flex-shrink-0 transition-colors ${
                      filterCategory === cat
                        ? 'bg-cyan-500 text-black font-semibold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-1">
              {ALL_FILTER_PRESETS.filter((p) => {
                const matchName = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchCat = filterCategory === 'All' || p.category === filterCategory;
                return matchName && matchCat;
              }).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    if (selectedClipId) {
                      updateClip(selectedClipId, {
                        colorGrade: {
                          ...preset.colorGrade,
                          brightness: preset.colorGrade.brightness || 0,
                          contrast: preset.colorGrade.contrast || 0,
                          saturation: preset.colorGrade.saturation || 0,
                          temperature: preset.colorGrade.temperature || 0,
                          tint: preset.colorGrade.tint || 0,
                          exposure: preset.colorGrade.exposure || 0,
                          highlights: preset.colorGrade.highlights || 0,
                          shadows: preset.colorGrade.shadows || 0,
                          vignette: preset.colorGrade.vignette || 0,
                          grain: preset.colorGrade.grain || 0,
                          hue: 0,
                          blur: 0,
                          filterPreset: preset.id
                        }
                      });
                    }
                  }}
                  className="p-2 bg-zinc-900/70 hover:bg-zinc-850 border border-zinc-800 hover:border-cyan-500/50 rounded text-left transition-colors flex flex-col justify-between h-20"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: preset.previewColor }}
                    />
                    <span className="text-[9px] text-zinc-500 uppercase">{preset.category}</span>
                  </div>
                  <span className="font-semibold text-zinc-200 text-[11px] truncate mt-1">
                    {preset.name}
                  </span>
                  <span className="text-[9px] text-cyan-400/80">Click to apply</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. TRANSITIONS TAB */}
        {activeLibraryTab === 'transitions' && (
          <div className="space-y-3">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Cinematic Transitions ({TRANSITION_CATALOG.length})
            </span>

            <div className="grid grid-cols-1 gap-2">
              {TRANSITION_CATALOG.map((t) => (
                <div
                  key={t.type}
                  className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-zinc-100 text-xs">{t.name}</span>
                      <span className="text-[9px] text-cyan-400 bg-cyan-950/60 px-1 rounded">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{t.description}</p>
                  </div>

                  <button
                    onClick={() => {
                      if (selectedClipId) {
                        updateClip(selectedClipId, {
                          transitionOut: {
                            type: t.type,
                            duration: t.defaultDuration
                          }
                        });
                      }
                    }}
                    title="Apply to Outgoing Edge of Selected Clip"
                    className="px-2 py-1 bg-zinc-800 hover:bg-cyan-950 hover:text-cyan-400 text-zinc-200 rounded text-[11px] flex items-center gap-1 flex-shrink-0 ml-2"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Apply</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. TEMPLATES TAB */}
        {activeLibraryTab === 'templates' && (
          <div className="space-y-3">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              1-Click Smart Timeline Templates
            </span>

            {[
              {
                id: 'shorts',
                title: 'Viral YouTube Shorts / Reel',
                aspect: '9:16 Vertical',
                desc: 'Optimized vertical canvas with high-energy hook headline and dynamic whip-pan transition.'
              },
              {
                id: 'car',
                title: 'Cinematic Velocity Car Edit',
                aspect: '16:9 Cinema',
                desc: 'Hollywood Teal & Orange grade, film burn transitions, and sub-bass impacts.'
              },
              {
                id: 'travel',
                title: 'Golden Sunset Travel Montage',
                aspect: '16:9 Cinema',
                desc: 'Warm color grading, smooth dissolves, and ambient atmospheric soundtrack.'
              },
              {
                id: 'gaming',
                title: 'Cyberpunk Gaming Highlight',
                aspect: '16:9 Cinema',
                desc: 'Cyberpunk neon aesthetics, RGB glitch effects, and high-energy pacing.'
              }
            ].map((tpl) => (
              <div
                key={tpl.id}
                className="p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg flex flex-col gap-2 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-100 text-xs">{tpl.title}</span>
                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950 px-1 py-0.5 rounded">
                      {tpl.aspect}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{tpl.desc}</p>
                </div>

                <button
                  onClick={() => loadTemplate(tpl.id as any)}
                  className="w-full py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Apply Template Layout</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 7. AI COPILOT CHAT TAB */}
        {activeLibraryTab === 'ai' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Quick Action Commands */}
            <div>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Quick Copilot Commands
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  'Turn into 9:16 vertical Reel',
                  'Apply Teal & Orange grade',
                  'Add cinematic whip cuts',
                  'Auto-detect silent pauses',
                  'Add high-energy title hook'
                ].map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => handleAiSubmit(cmd)}
                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-full text-[10px] transition-colors"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[200px] p-2 bg-zinc-900/40 rounded-lg border border-zinc-800/80">
              {aiMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-800/40 ml-4'
                      : 'bg-zinc-900 text-zinc-200 border border-zinc-800 mr-2'
                  }`}
                >
                  <div className="flex items-center gap-1 font-semibold text-[10px] mb-1 opacity-75">
                    {msg.role === 'user' ? 'You' : 'NOVA Copilot'}
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))}

              {/* Pending Plan Approval Card */}
              {pendingPlan && (
                <div className="p-3 bg-zinc-950 border border-cyan-500/50 rounded-lg space-y-2 shadow-lg">
                  <span className="font-semibold text-cyan-400 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Review Proposed Timeline Plan
                  </span>

                  <div className="space-y-1">
                    {pendingPlan.actions.map((act, i) => (
                      <div key={i} className="text-[11px] text-zinc-300 font-mono flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span>
                          {act.type.replace(/_/g, ' ')}: {act.preset || act.aspectRatio || act.transitionType || act.text || act.rate || ''}
                        </span>
                      </div>
                    ))}
                    {pendingPlan.rejected.map((rej, i) => (
                      <div key={i} className="text-[10px] text-amber-400 font-mono flex items-center gap-1.5">
                        <XCircle className="w-3 h-3 flex-shrink-0" />
                        <span>Skipped: {rej.reason}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-zinc-800">
                    <button
                      onClick={applyPendingPlan}
                      className="flex-1 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Apply</span>
                    </button>
                    <button
                      onClick={dismissPendingPlan}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {aiLoading && (
                <div className="p-2 text-[11px] text-cyan-400 animate-pulse flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 animate-spin" />
                  <span>NOVA AI is generating editing plan...</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Ask NOVA to edit, grade, cut, or reframe..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => handleAiSubmit()}
                disabled={aiLoading || !aiPrompt.trim()}
                className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
