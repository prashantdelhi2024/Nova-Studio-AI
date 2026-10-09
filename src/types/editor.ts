export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';

export type TrackType = 'video' | 'audio' | 'text' | 'overlay';
export type ClipType = 'video' | 'audio' | 'image' | 'text' | 'solid';

export type TransitionType =
  | 'none'
  | 'cross-dissolve'
  | 'fade-black'
  | 'fade-white'
  | 'whip-pan'
  | 'film-burn'
  | 'light-leak'
  | 'glitch'
  | 'zoom-in'
  | 'zoom-out'
  | 'rgb-split'
  | 'blur-dissolve'
  | 'flash'
  | 'slide-left'
  | 'slide-right'
  | 'wipe';

export interface Keyframe {
  id: string;
  time: number; // relative to clip start (seconds)
  property: 'positionX' | 'positionY' | 'scale' | 'rotation' | 'opacity';
  value: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface ColorGrade {
  brightness: number; // -100 to 100, default 0
  contrast: number; // -100 to 100, default 0
  saturation: number; // -100 to 100, default 0
  temperature: number; // -100 to 100, default 0
  tint: number; // -100 to 100, default 0
  exposure: number; // -100 to 100, default 0
  highlights: number; // -100 to 100, default 0
  shadows: number; // -100 to 100, default 0
  vignette: number; // 0 to 100, default 0
  grain: number; // 0 to 100, default 0
  hue: number; // -180 to 180, default 0
  blur: number; // 0 to 50, default 0
  filterPreset?: string;
}

export interface ClipTransform {
  x: number; // offset in px or %
  y: number;
  scale: number; // 0.1 to 5, default 1
  rotation: number; // degrees, default 0
  opacity: number; // 0 to 1, default 1
  flipH: boolean;
  flipV: boolean;
  fit: 'contain' | 'cover' | 'fill';
  crop: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface ClipAudio {
  volume: number; // 0 to 2, default 1
  pan: number; // -1 (left) to 1 (right), default 0
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  isMuted: boolean;
  ducking: boolean; // auto lower when voice is playing
}

export interface ClipSpeed {
  rate: number; // 0.1 to 10, default 1
  reverse: boolean;
  freezeFrame?: boolean;
}

export interface TextConfig {
  text: string;
  fontFamily: string;
  fontSize: number; // px
  fontWeight: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  backgroundColor: string;
  backgroundPadding: number;
  alignment: 'left' | 'center' | 'right';
  animation: 'none' | 'fade' | 'slide-up' | 'typewriter' | 'pop-in' | 'neon-pulse';
  subtitles?: { start: number; end: number; word: string }[];
}

export interface Clip {
  id: string;
  trackId: string;
  name: string;
  type: ClipType;
  startTime: number; // start position on timeline in seconds
  duration: number; // duration on timeline in seconds
  sourceStartTime: number; // in-point in source media
  sourceDuration: number; // original duration of source
  mediaId?: string; // id reference to MediaItem
  color?: string; // timeline block color
  transform: ClipTransform;
  audio: ClipAudio;
  speed: ClipSpeed;
  colorGrade: ColorGrade;
  textConfig?: TextConfig;
  transitionIn?: {
    type: TransitionType;
    duration: number; // seconds
  };
  transitionOut?: {
    type: TransitionType;
    duration: number;
  };
  keyframes: Keyframe[];
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  order: number;
  isMuted: boolean;
  isLocked: boolean;
  isHidden: boolean;
  volume: number; // 0 to 2
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export interface ProjectSettings {
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  fps: number; // 24, 30, 60
  sampleRate: number;
  snapToGrid: boolean;
  previewQuality: 'auto' | 'high' | 'medium' | 'low';
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  duration: number; // total duration in seconds
  settings: ProjectSettings;
  tracks: Track[];
  clips: Clip[];
  markers: TimelineMarker[];
}

export interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  url: string;
  blob?: Blob;
  duration: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  waveform?: number[]; // normalized 0..1 amplitude values
  createdAt: number;
  sizeBytes?: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  category: 'Cinematic' | 'Film Emulation' | 'Vintage' | 'Monochrome' | 'Cyberpunk' | 'Moody' | 'Warm & Cool' | 'Automotive' | 'Clean';
  colorGrade: Partial<ColorGrade>;
  previewColor: string;
}

export interface AIAction {
  type: 'apply_color_grade' | 'add_transition' | 'add_title' | 'reframe_aspect_ratio' | 'adjust_speed' | 'smart_cut_pauses' | 'add_sfx';
  preset?: string;
  transitionType?: TransitionType;
  duration?: number;
  text?: string;
  style?: string;
  animation?: string;
  aspectRatio?: AspectRatio;
  rate?: number;
  sfxType?: string;
  sensitivity?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  proposedActions?: AIAction[];
  actionsApplied?: boolean;
}

export interface ExportSettings {
  format: 'webm' | 'mp4' | 'audio-only';
  resolution: '480p' | '720p' | '1080p' | '1440p' | '4k';
  fps: 24 | 30 | 60;
  quality: 'high' | 'balanced' | 'fast';
  width: number;
  height: number;
}
