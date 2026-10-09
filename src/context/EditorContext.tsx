import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Project,
  Track,
  Clip,
  MediaItem,
  AspectRatio,
  AIAction,
  AIMessage,
  ColorGrade,
  TransitionType,
  ExportSettings
} from '../types/editor';
import { dbService } from '../services/db';
import { createStarterProject, generateSyntheticVideoBlob } from '../services/sampleMedia';
import { audioEngine } from '../services/audioEngine';
import { renderExporter, RenderProgress } from '../services/renderExport';
import { FILTER_PRESETS } from '../services/colorGrading';

interface EditorContextType {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  togglePlayPause: () => void;
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  selectedTrackId: string | null;
  setSelectedTrackId: (id: string | null) => void;
  selectedClip: Clip | null;
  
  // Timeline zoom & snapping
  timelineZoom: number; // pixels per second
  setTimelineZoom: (zoom: number) => void;
  snapEnabled: boolean;
  setSnapEnabled: (snap: boolean) => void;

  // History & Undo / Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Media
  mediaItems: MediaItem[];
  addMediaItem: (item: MediaItem) => Promise<void>;
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>;
  registerMediaElement: (id: string, el: HTMLVideoElement | HTMLImageElement) => void;

  // Editing actions
  splitClipAtPlayhead: (clipId?: string) => void;
  trimClip: (clipId: string, newStartTime: number, newDuration: number) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;
  deleteClip: (clipId?: string, ripple?: boolean) => void;
  duplicateClip: (clipId?: string) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  addClipToTrack: (clipData: Partial<Clip>, trackId?: string) => void;
  
  // Track actions
  addTrack: (type: 'video' | 'audio' | 'text') => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  deleteTrack: (trackId: string) => void;

  // UI State
  activeLibraryTab: string;
  setActiveLibraryTab: (tab: string) => void;
  inspectorTab: string;
  setInspectorTab: (tab: string) => void;
  showSafeAreas: boolean;
  setShowSafeAreas: (show: boolean) => void;
  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
  isShortcutsModalOpen: boolean;
  setIsShortcutsModalOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;

  // Audio peak meter
  audioPeak: { left: number; right: number };

  // Project management
  changeAspectRatio: (ratio: AspectRatio) => void;
  createNewProject: (name?: string, ratio?: AspectRatio) => void;
  loadStarterProject: () => Promise<void>;
  exportProjectJSON: () => void;
  importProjectJSON: (jsonString: string) => Promise<boolean>;
  autosaveStatus: 'saved' | 'saving' | 'unsaved';

  // AI execution
  applyAIAction: (action: AIAction) => void;

  // Export engine
  exportProgress: RenderProgress | null;
  startExport: (settings: ExportSettings) => Promise<{ blob: Blob; url: string; filename: string }>;
  cancelExport: () => void;
}

const EditorContext = createContext<EditorContextType | null>(null);

const MAX_HISTORY = 40;

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const starter = createStarterProject();
  const [project, setProject] = useState<Project>(starter.project);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(starter.project.clips[0]?.id || null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(starter.project.tracks[0]?.id || null);
  const [timelineZoom, setTimelineZoom] = useState<number>(60); // 60px per second default
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(starter.initialMedia);
  const [activeLibraryTab, setActiveLibraryTab] = useState<string>('media');
  const [inspectorTab, setInspectorTab] = useState<string>('transform');
  const [showSafeAreas, setShowSafeAreas] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [audioPeak, setAudioPeak] = useState<{ left: number; right: number }>({ left: 0, right: 0 });
  const [exportProgress, setExportProgress] = useState<RenderProgress | null>(null);

  // Undo/Redo history stacks
  const historyRef = useRef<Project[]>([starter.project]);
  const historyIndexRef = useRef<number>(0);
  const [, setHistoryVersion] = useState<number>(0);

  // Media element cache
  const mediaElementsRef = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map());

  const registerMediaElement = useCallback((id: string, el: HTMLVideoElement | HTMLImageElement) => {
    mediaElementsRef.current.set(id, el);
  }, []);

  const pushHistory = useCallback((newProject: Project) => {
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (nextHistory.length >= MAX_HISTORY) {
      nextHistory.shift();
    }
    nextHistory.push(JSON.parse(JSON.stringify(newProject)));
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setHistoryVersion((v) => v + 1);
    setAutosaveStatus('unsaved');
  }, []);

  // Update project with history tracking
  const updateProjectWithHistory = useCallback((updater: (prev: Project) => Project) => {
    setProject((prev) => {
      const updated = updater(prev);
      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const target = historyRef.current[historyIndexRef.current];
      setProject(JSON.parse(JSON.stringify(target)));
      setHistoryVersion((v) => v + 1);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const target = historyRef.current[historyIndexRef.current];
      setProject(JSON.parse(JSON.stringify(target)));
      setHistoryVersion((v) => v + 1);
    }
  }, []);

  // Autosave to IndexedDB with debounce
  useEffect(() => {
    if (autosaveStatus !== 'unsaved') return;
    const timer = setTimeout(async () => {
      setAutosaveStatus('saving');
      try {
        await dbService.saveProject(project);
        setAutosaveStatus('saved');
      } catch (err) {
        console.warn('Autosave error:', err);
        setAutosaveStatus('unsaved');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [project, autosaveStatus]);

  // Load saved project from IndexedDB on startup if available, or generate media blobs
  useEffect(() => {
    async function initDB() {
      try {
        const savedProjects = await dbService.getAllProjects();
        if (savedProjects.length > 0) {
          const lastProject = savedProjects[0];
          setProject(lastProject);
          historyRef.current = [lastProject];
          historyIndexRef.current = 0;
        }

        const savedMedia = await dbService.getAllMediaItems();
        if (savedMedia.length > 0) {
          setMediaItems(savedMedia);
        } else {
          // Pre-generate synthetic videos in background so user has instant playable video clips
          starter.initialMedia.forEach(async (item) => {
            if (item.type === 'video' && !item.url) {
              const type = item.id.includes('cyber') ? 'cyber' : item.id.includes('sunset') ? 'sunset' : 'velocity';
              const result = await generateSyntheticVideoBlob(type, 8);
              item.url = result.url;
              item.blob = result.blob;
              item.thumbnail = result.thumbnail;
              await dbService.saveMediaItem(item);
              setMediaItems((prev) => [...prev]);
            }
          });
        }
      } catch (e) {
        console.warn('Error loading initial projects:', e);
      }
    }
    initDB();
  }, []);

  // Playback timer & requestAnimationFrame loop
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((p) => {
      const next = !p;
      if (next) {
        audioEngine.resume();
        lastTimeRef.current = performance.now();
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        const nextTime = prev + deltaSec;
        if (nextTime >= project.duration) {
          setIsPlaying(false);
          return 0; // loop back to start
        }
        return nextTime;
      });

      // Update audio peak meters
      setAudioPeak(audioEngine.getPeakLevels());

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, project.duration]);

  const selectedClip = project.clips.find((c) => c.id === selectedClipId) || null;

  // Clip actions
  const splitClipAtPlayhead = useCallback((targetClipId?: string) => {
    const clipId = targetClipId || selectedClipId;
    if (!clipId) return;

    updateProjectWithHistory((prev) => {
      const clipIndex = prev.clips.findIndex((c) => c.id === clipId);
      if (clipIndex === -1) return prev;

      const clip = prev.clips[clipIndex];
      // Only split if playhead is strictly inside the clip
      if (currentTime <= clip.startTime + 0.1 || currentTime >= clip.startTime + clip.duration - 0.1) {
        return prev;
      }

      const splitOffset = currentTime - clip.startTime;
      const firstPartDuration = splitOffset;
      const secondPartDuration = clip.duration - splitOffset;

      const clipA: Clip = {
        ...clip,
        duration: firstPartDuration,
        transitionOut: undefined
      };

      const clipB: Clip = {
        ...clip,
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: `${clip.name} (Part 2)`,
        startTime: currentTime,
        duration: secondPartDuration,
        sourceStartTime: clip.sourceStartTime + splitOffset * clip.speed.rate,
        transitionIn: undefined
      };

      const newClips = [...prev.clips];
      newClips.splice(clipIndex, 1, clipA, clipB);

      setSelectedClipId(clipB.id);
      audioEngine.playSFX('click');

      return { ...prev, clips: newClips };
    });
  }, [selectedClipId, currentTime, updateProjectWithHistory]);

  const trimClip = useCallback((clipId: string, newStartTime: number, newDuration: number) => {
    if (newDuration < 0.2) return;
    updateProjectWithHistory((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => (c.id === clipId ? { ...c, startTime: newStartTime, duration: newDuration } : c))
    }));
  }, [updateProjectWithHistory]);

  const moveClip = useCallback((clipId: string, newTrackId: string, newStartTime: number) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => (c.id === clipId ? { ...c, trackId: newTrackId, startTime: Math.max(0, newStartTime) } : c))
    }));
  }, [updateProjectWithHistory]);

  const deleteClip = useCallback((targetClipId?: string, ripple = false) => {
    const clipId = targetClipId || selectedClipId;
    if (!clipId) return;

    updateProjectWithHistory((prev) => {
      const clipToDelete = prev.clips.find((c) => c.id === clipId);
      if (!clipToDelete) return prev;

      let newClips = prev.clips.filter((c) => c.id !== clipId);

      if (ripple) {
        // Shift trailing clips on the same track back by the deleted duration
        newClips = newClips.map((c) => {
          if (c.trackId === clipToDelete.trackId && c.startTime > clipToDelete.startTime) {
            return { ...c, startTime: Math.max(0, c.startTime - clipToDelete.duration) };
          }
          return c;
        });
      }

      audioEngine.playSFX('pop');
      return { ...prev, clips: newClips };
    });
    setSelectedClipId(null);
  }, [selectedClipId, updateProjectWithHistory]);

  const duplicateClip = useCallback((targetClipId?: string) => {
    const clipId = targetClipId || selectedClipId;
    if (!clipId) return;

    updateProjectWithHistory((prev) => {
      const clip = prev.clips.find((c) => c.id === clipId);
      if (!clip) return prev;

      const duplicated: Clip = {
        ...JSON.parse(JSON.stringify(clip)),
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: `${clip.name} (Copy)`,
        startTime: clip.startTime + clip.duration
      };

      setSelectedClipId(duplicated.id);
      audioEngine.playSFX('click');
      return { ...prev, clips: [...prev.clips, duplicated] };
    });
  }, [selectedClipId, updateProjectWithHistory]);

  const updateClip = useCallback((clipId: string, updates: Partial<Clip>) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
    }));
  }, [updateProjectWithHistory]);

  const addClipToTrack = useCallback((clipData: Partial<Clip>, trackId?: string) => {
    updateProjectWithHistory((prev) => {
      const targetTrackId = trackId || selectedTrackId || prev.tracks[0]?.id;
      const targetTrack = prev.tracks.find((t) => t.id === targetTrackId);
      const clipType = clipData.type || (targetTrack?.type === 'audio' ? 'audio' : 'video');

      // Calculate safe start time at playhead or end of track
      const clipsOnTrack = prev.clips.filter((c) => c.trackId === targetTrackId);
      const lastClipEnd = clipsOnTrack.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
      const startTime = currentTime > 0 ? currentTime : lastClipEnd;

      const newClip: Clip = {
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        trackId: targetTrackId,
        name: clipData.name || 'New Clip',
        type: clipType,
        startTime,
        duration: clipData.duration || 4.0,
        sourceStartTime: 0,
        sourceDuration: clipData.duration || 4.0,
        color: clipType === 'video' ? '#0284c7' : clipType === 'audio' ? '#10b981' : '#a855f7',
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
        },
        audio: {
          volume: 1,
          pan: 0,
          fadeIn: 0,
          fadeOut: 0,
          isMuted: false,
          ducking: false
        },
        speed: { rate: 1, reverse: false },
        colorGrade: {
          brightness: 0,
          contrast: 0,
          saturation: 0,
          temperature: 0,
          tint: 0,
          exposure: 0,
          highlights: 0,
          shadows: 0,
          vignette: 0,
          grain: 0,
          hue: 0,
          blur: 0
        },
        keyframes: [],
        ...clipData
      };

      const updatedProjectDuration = Math.max(prev.duration, startTime + newClip.duration + 2);
      setSelectedClipId(newClip.id);
      audioEngine.playSFX('click');

      return {
        ...prev,
        duration: updatedProjectDuration,
        clips: [...prev.clips, newClip]
      };
    });
  }, [currentTime, selectedTrackId, updateProjectWithHistory]);

  // Track management
  const addTrack = useCallback((type: 'video' | 'audio' | 'text') => {
    updateProjectWithHistory((prev) => {
      const count = prev.tracks.filter((t) => t.type === type).length + 1;
      const prefix = type === 'video' ? 'V' : type === 'audio' ? 'A' : 'T';
      const newTrack: Track = {
        id: `track-${type}-${Date.now()}`,
        name: `${prefix}${count} (${type.charAt(0).toUpperCase() + type.slice(1)})`,
        type,
        order: prev.tracks.length,
        isMuted: false,
        isLocked: false,
        isHidden: false,
        volume: 1
      };
      return { ...prev, tracks: [...prev.tracks, newTrack] };
    });
  }, [updateProjectWithHistory]);

  const updateTrack = useCallback((trackId: string, updates: Partial<Track>) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t))
    }));
  }, [updateProjectWithHistory]);

  const deleteTrack = useCallback((trackId: string) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((t) => t.id !== trackId),
      clips: prev.clips.filter((c) => c.trackId !== trackId)
    }));
  }, [updateProjectWithHistory]);

  // Media
  const addMediaItem = useCallback(async (item: MediaItem) => {
    await dbService.saveMediaItem(item);
    setMediaItems((prev) => [item, ...prev]);
  }, []);

  // Aspect ratio switch
  const changeAspectRatio = useCallback((ratio: AspectRatio) => {
    let width = 1920;
    let height = 1080;
    if (ratio === '9:16') {
      width = 1080;
      height = 1920;
    } else if (ratio === '1:1') {
      width = 1080;
      height = 1080;
    } else if (ratio === '4:5') {
      width = 1080;
      height = 1350;
    } else if (ratio === '21:9') {
      width = 2560;
      height = 1080;
    }

    updateProjectWithHistory((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        aspectRatio: ratio,
        width,
        height
      }
    }));
  }, [updateProjectWithHistory]);

  const createNewProject = useCallback((name = 'Untitled Project', ratio: AspectRatio = '16:9') => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      duration: 15.0,
      settings: {
        aspectRatio: ratio,
        width: ratio === '9:16' ? 1080 : 1920,
        height: ratio === '9:16' ? 1920 : 1080,
        fps: 30,
        sampleRate: 48000,
        snapToGrid: true,
        previewQuality: 'auto'
      },
      tracks: [
        { id: 'track-v1', name: 'V1 (Main Video)', type: 'video', order: 0, isMuted: false, isLocked: false, isHidden: false, volume: 1 },
        { id: 'track-a1', name: 'A1 (Audio)', type: 'audio', order: 1, isMuted: false, isLocked: false, isHidden: false, volume: 1 }
      ],
      clips: [],
      markers: []
    };
    setProject(newProj);
    historyRef.current = [newProj];
    historyIndexRef.current = 0;
    setCurrentTime(0);
    setSelectedClipId(null);
  }, []);

  const loadStarterProject = useCallback(async () => {
    const starter = createStarterProject();
    setProject(starter.project);
    historyRef.current = [starter.project];
    historyIndexRef.current = 0;
    setCurrentTime(0);
    setSelectedClipId(starter.project.clips[0]?.id || null);
    await dbService.saveProject(starter.project);
  }, []);

  const exportProjectJSON = useCallback(() => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${project.name.toLowerCase().replace(/\s+/g, '_')}_backup.nova.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [project]);

  const importProjectJSON = useCallback(async (jsonString: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonString) as Project;
      if (parsed && parsed.tracks && parsed.clips) {
        setProject(parsed);
        historyRef.current = [parsed];
        historyIndexRef.current = 0;
        await dbService.saveProject(parsed);
        return true;
      }
    } catch (e) {
      console.error('Failed to import project backup JSON:', e);
    }
    return false;
  }, []);

  // AI Action applicator
  const applyAIAction = useCallback((action: AIAction) => {
    switch (action.type) {
      case 'reframe_aspect_ratio':
        if (action.aspectRatio) changeAspectRatio(action.aspectRatio);
        break;

      case 'apply_color_grade':
        if (action.preset) {
          const presetObj = FILTER_PRESETS.find((f) => f.id === action.preset);
          if (presetObj) {
            updateProjectWithHistory((prev) => ({
              ...prev,
              clips: prev.clips.map((c) =>
                c.type === 'video'
                  ? {
                      ...c,
                      colorGrade: {
                        ...c.colorGrade,
                        ...presetObj.colorGrade,
                        filterPreset: presetObj.id
                      }
                    }
                  : c
              )
            }));
          }
        }
        break;

      case 'add_transition':
        if (action.transitionType) {
          updateProjectWithHistory((prev) => ({
            ...prev,
            clips: prev.clips.map((c, i) =>
              c.type === 'video' && i < prev.clips.length - 1
                ? {
                    ...c,
                    transitionOut: {
                      type: action.transitionType as TransitionType,
                      duration: action.duration || 0.5
                    }
                  }
                : c
            )
          }));
        }
        break;

      case 'add_title':
        if (action.text) {
          addClipToTrack({
            name: action.text,
            type: 'text',
            duration: 4.0,
            textConfig: {
              text: action.text,
              fontFamily: 'Inter, sans-serif',
              fontSize: 48,
              fontWeight: '800',
              color: '#ffffff',
              strokeColor: '#00f7ff',
              strokeWidth: 2,
              shadowColor: 'rgba(0,0,0,0.8)',
              shadowBlur: 10,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backgroundPadding: 14,
              alignment: 'center',
              animation: (action.style as any) || 'pop-in'
            }
          });
        }
        break;

      case 'add_sfx':
        audioEngine.playSFX((action.sfxType as any) || 'whoosh');
        break;

      default:
        break;
    }
  }, [changeAspectRatio, updateProjectWithHistory, addClipToTrack]);

  // Export engine
  const startExport = useCallback(async (settings: ExportSettings) => {
    return await renderExporter.renderAndExport(
      project,
      settings,
      mediaElementsRef.current,
      (progress) => {
        setExportProgress({ ...progress });
      }
    );
  }, [project]);

  const cancelExport = useCallback(() => {
    renderExporter.cancel();
  }, []);

  return (
    <EditorContext.Provider
      value={{
        project,
        setProject,
        currentTime,
        setCurrentTime,
        isPlaying,
        setIsPlaying,
        togglePlayPause,
        selectedClipId,
        setSelectedClipId,
        selectedTrackId,
        setSelectedTrackId,
        selectedClip,
        timelineZoom,
        setTimelineZoom,
        snapEnabled,
        setSnapEnabled,
        canUndo,
        canRedo,
        undo,
        redo,
        mediaItems,
        addMediaItem,
        mediaElements: mediaElementsRef.current,
        registerMediaElement,
        splitClipAtPlayhead,
        trimClip,
        moveClip,
        deleteClip,
        duplicateClip,
        updateClip,
        addClipToTrack,
        addTrack,
        updateTrack,
        deleteTrack,
        activeLibraryTab,
        setActiveLibraryTab,
        inspectorTab,
        setInspectorTab,
        showSafeAreas,
        setShowSafeAreas,
        isExportModalOpen,
        setIsExportModalOpen,
        isShortcutsModalOpen,
        setIsShortcutsModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        audioPeak,
        changeAspectRatio,
        createNewProject,
        loadStarterProject,
        exportProjectJSON,
        importProjectJSON,
        autosaveStatus,
        applyAIAction,
        exportProgress,
        startExport,
        cancelExport
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
