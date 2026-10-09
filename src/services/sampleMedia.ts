import { MediaItem, Project } from '../types/editor';
import { audioEngine, AudioEngine } from './audioEngine';

/**
 * Creates high quality canvas-generated video clips encoded as real playable Video Blobs
 */
export async function generateSyntheticVideoBlob(
  type: 'cyber' | 'sunset' | 'velocity' | 'bloom',
  durationSec = 8,
  width = 1280,
  height = 720
): Promise<{ blob: Blob; url: string; thumbnail: string }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const fps = 30;
    const totalFrames = durationSec * fps;
    const stream = canvas.captureStream(fps);

    // Audio stream synthesis for the video
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    } catch {
      recorder = new MediaRecorder(stream);
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    let firstFrameThumb = '';

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      resolve({ blob, url, thumbnail: firstFrameThumb });
    };

    recorder.start();

    let frame = 0;
    function renderFrame() {
      const t = frame / fps;

      // Draw background & scenes
      if (type === 'cyber') {
        // Deep cyber navy with neon perspective grid
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#090d16');
        bgGrad.addColorStop(1, '#020408');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Perspective grid
        const horizon = height * 0.55;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.lineWidth = 1.5;

        // Radiating lines
        for (let x = -width; x < width * 2; x += 120) {
          ctx.beginPath();
          ctx.moveTo(width / 2, horizon);
          ctx.lineTo(x + Math.sin(t * 0.5) * 50, height);
          ctx.stroke();
        }

        // Horizontal scan lines moving forward
        const gridOffset = (t * 120) % 60;
        for (let y = horizon; y < height; y += 15 + (y - horizon) * 0.2) {
          const actualY = y + gridOffset;
          if (actualY < height) {
            ctx.beginPath();
            ctx.moveTo(0, actualY);
            ctx.lineTo(width, actualY);
            ctx.stroke();
          }
        }

        // Cyber Sun
        const sunGrad = ctx.createRadialGradient(width / 2, horizon - 50, 10, width / 2, horizon - 50, 140);
        sunGrad.addColorStop(0, '#ff007f');
        sunGrad.addColorStop(0.7, '#8b5cf6');
        sunGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(width / 2, horizon - 50, 140, 0, Math.PI * 2);
        ctx.fill();

        // Title branding element
        ctx.fillStyle = '#00f7ff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CYBER HORIZON', width / 2, horizon - 40);

      } else if (type === 'sunset') {
        // Golden sunset ocean
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#7c2d12');
        grad.addColorStop(0.4, '#ea580c');
        grad.addColorStop(0.65, '#f59e0b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Sun
        const sunY = height * 0.45 + Math.sin(t * 0.1) * 10;
        const sun = ctx.createRadialGradient(width * 0.65, sunY, 15, width * 0.65, sunY, 180);
        sun.addColorStop(0, '#fffbeb');
        sun.addColorStop(0.3, '#fde047');
        sun.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = sun;
        ctx.beginPath();
        ctx.arc(width * 0.65, sunY, 180, 0, Math.PI * 2);
        ctx.fill();

        // Water reflection ripples
        const oceanY = height * 0.6;
        for (let i = 0; i < 25; i++) {
          const ry = oceanY + (i / 25) * (height - oceanY);
          const rw = (width * 0.3) * (1 + (i / 25) * 1.5);
          const rx = width * 0.65 - rw / 2 + Math.sin(t * 2 + i * 0.4) * 20;
          ctx.fillStyle = `rgba(254, 240, 138, ${0.4 - (i / 25) * 0.3})`;
          ctx.fillRect(rx, ry, rw, 2 + i * 0.3);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GOLDEN COAST', width / 2, height * 0.85);

      } else if (type === 'velocity') {
        // Night speed run / car cockpit velocity
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, width, height);

        // Motion streaks radiating from vanishing point
        const cx = width / 2;
        const cy = height * 0.48;
        const streakCount = 35;
        for (let i = 0; i < streakCount; i++) {
          const angle = (i / streakCount) * Math.PI * 2 + Math.sin(t * 0.2);
          const dist = ((t * 800 + i * 90) % (width * 0.8)) + 30;
          const sx = cx + Math.cos(angle) * dist;
          const sy = cy + Math.sin(angle) * dist * 0.6;
          const len = 30 + dist * 0.2;

          ctx.strokeStyle = i % 3 === 0 ? '#ff2a00' : i % 3 === 1 ? '#ffcc00' : '#ffffff';
          ctx.lineWidth = 1 + (dist / width) * 4;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len * 0.6);
          ctx.stroke();
        }

        // Speedometer UI
        ctx.strokeStyle = 'rgba(255, 40, 40, 0.8)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, height * 0.85, 90, Math.PI * 0.8, Math.PI * 2.2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        const speedKmh = Math.floor(180 + Math.sin(t * 3) * 35);
        ctx.fillText(`${speedKmh} KM/H`, cx, height * 0.86);

      } else {
        // Macro bloom
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(0.5, '#047857');
        grad.addColorStop(1, '#065f46');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Floating bokeh circles
        for (let i = 0; i < 20; i++) {
          const bx = (width * 0.1 + (i * 73 + t * 40) % (width * 0.9));
          const by = (height * 0.1 + (i * 91 + Math.sin(t + i) * 80) % (height * 0.8));
          const br = 25 + (i % 5) * 20;
          const bGrad = ctx.createRadialGradient(bx, by, 5, bx, by, br);
          bGrad.addColorStop(0, 'rgba(167, 243, 208, 0.6)');
          bGrad.addColorStop(1, 'rgba(167, 243, 208, 0)');
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#ecfdf5';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NATURE BLOOM', width / 2, height / 2);
      }

      // Save first frame as high-res thumbnail
      if (frame === 0) {
        firstFrameThumb = canvas.toDataURL('image/jpeg', 0.8);
      }

      frame++;
      if (frame < totalFrames) {
        requestAnimationFrame(renderFrame);
      } else {
        recorder.stop();
      }
    }

    renderFrame();
  });
}

/**
 * Creates synthetic high-energy royalty-free music Audio Blob
 */
export async function generateSyntheticAudioBlob(
  type: 'cinematic-ambient' | 'velocity-pulse',
  durationSec = 15
): Promise<{ blob: Blob; url: string; waveform: number[] }> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  if (type === 'cinematic-ambient') {
    // 100 bpm ambient pulse with chord progressions
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Kick every 0.6s
      const beatPhase = (t % 0.6) / 0.6;
      const kick = Math.exp(-beatPhase * 18) * Math.sin(2 * Math.PI * 65 * (1 - beatPhase * 0.5) * beatPhase);
      // Pad chords: D minor (D3: 146.8Hz, F3: 174.6Hz, A3: 220Hz)
      const chord = (
        Math.sin(2 * Math.PI * 146.8 * t) * 0.15 +
        Math.sin(2 * Math.PI * 174.6 * t) * 0.12 +
        Math.sin(2 * Math.PI * 220.0 * t) * 0.10
      );
      // Sub drone
      const sub = Math.sin(2 * Math.PI * 55 * t) * 0.2;
      const sample = (kick * 0.4 + chord * 0.35 + sub * 0.25);
      left[i] = sample;
      right[i] = sample;
    }
  } else {
    // 128 bpm electronic velocity pulse
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const beatPhase = (t % 0.46875) / 0.46875;
      const kick = Math.exp(-beatPhase * 24) * Math.sin(2 * Math.PI * 80 * (1 - beatPhase) * beatPhase);
      const hihat = (t % 0.234 > 0.117) ? (Math.random() * 2 - 1) * Math.exp(-((t % 0.234 - 0.117) * 40)) * 0.15 : 0;
      const bass = Math.sin(2 * Math.PI * 73.4 * t) * 0.25;
      const sample = (kick * 0.5 + hihat * 0.2 + bass * 0.3);
      left[i] = sample;
      right[i] = sample;
    }
  }

  // Convert buffer to WAV Blob
  const wavBlob = audioBufferToWav(buffer);
  const url = URL.createObjectURL(wavBlob);
  const waveform = audioEngine.constructor.prototype ? (AudioEngine as any).generateWaveformFromSamples(60, 2) : [];

  return { blob: wavBlob, url, waveform };
}

// Minimal AudioBuffer to WAV encoder
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Interleave channels
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Creates the initial starter project with multiple rich tracks so the editor is immediately populated and playable
 */
export function createStarterProject(): { project: Project; initialMedia: MediaItem[] } {
  const projectId = 'starter-project-nova';

  const initialMedia: MediaItem[] = [
    {
      id: 'media-cyber-city',
      name: 'Cyber City Nights 4K.mp4',
      type: 'video',
      url: '',
      duration: 8.0,
      width: 1920,
      height: 1080,
      createdAt: Date.now()
    },
    {
      id: 'media-sunset-coast',
      name: 'Golden Hour Coast.mp4',
      type: 'video',
      url: '',
      duration: 8.0,
      width: 1920,
      height: 1080,
      createdAt: Date.now()
    },
    {
      id: 'media-velocity-run',
      name: 'Velocity Tunnel Drive.mp4',
      type: 'video',
      url: '',
      duration: 8.0,
      width: 1920,
      height: 1080,
      createdAt: Date.now()
    },
    {
      id: 'media-ambient-beat',
      name: 'Cinematic Horizon Beat.wav',
      type: 'audio',
      url: '',
      duration: 16.0,
      waveform: [0.3, 0.5, 0.8, 0.4, 0.9, 0.6, 0.7, 0.3, 0.85, 0.6, 0.4, 0.9, 0.5, 0.7, 0.4, 0.8, 0.6, 0.9, 0.4, 0.8],
      createdAt: Date.now()
    }
  ];

  const project: Project = {
    id: projectId,
    name: 'Cinematic Showcase Edit',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    duration: 18.0,
    settings: {
      aspectRatio: '16:9',
      width: 1920,
      height: 1080,
      fps: 30,
      sampleRate: 48000,
      snapToGrid: true,
      previewQuality: 'auto'
    },
    tracks: [
      {
        id: 'track-v2',
        name: 'V2 (Overlays & Titles)',
        type: 'text',
        order: 0,
        isMuted: false,
        isLocked: false,
        isHidden: false,
        volume: 1
      },
      {
        id: 'track-v1',
        name: 'V1 (Primary Video)',
        type: 'video',
        order: 1,
        isMuted: false,
        isLocked: false,
        isHidden: false,
        volume: 1
      },
      {
        id: 'track-a1',
        name: 'A1 (Music Soundtrack)',
        type: 'audio',
        order: 2,
        isMuted: false,
        isLocked: false,
        isHidden: false,
        volume: 0.85
      },
      {
        id: 'track-a2',
        name: 'A2 (Sound Effects & Foley)',
        type: 'audio',
        order: 3,
        isMuted: false,
        isLocked: false,
        isHidden: false,
        volume: 1.0
      }
    ],
    clips: [
      // Primary video track clips
      {
        id: 'clip-v1-1',
        trackId: 'track-v1',
        name: 'Cyber City Nights',
        type: 'video',
        startTime: 0,
        duration: 5.5,
        sourceStartTime: 0,
        sourceDuration: 8.0,
        mediaId: 'media-cyber-city',
        color: '#0284c7',
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
          volume: 0.8,
          pan: 0,
          fadeIn: 0.5,
          fadeOut: 0.5,
          isMuted: false,
          ducking: false
        },
        speed: { rate: 1, reverse: false },
        colorGrade: {
          brightness: 0,
          contrast: 22,
          saturation: 25,
          temperature: -15,
          tint: 10,
          exposure: 0,
          highlights: 15,
          shadows: -15,
          vignette: 30,
          grain: 0,
          hue: 0,
          blur: 0,
          filterPreset: 'cinematic-teal-orange'
        },
        transitionIn: { type: 'fade-black', duration: 0.6 },
        transitionOut: { type: 'whip-pan', duration: 0.4 },
        keyframes: []
      },
      {
        id: 'clip-v1-2',
        trackId: 'track-v1',
        name: 'Golden Hour Coast',
        type: 'video',
        startTime: 5.5,
        duration: 6.0,
        sourceStartTime: 0,
        sourceDuration: 8.0,
        mediaId: 'media-sunset-coast',
        color: '#f59e0b',
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
          volume: 0.9,
          pan: 0,
          fadeIn: 0.2,
          fadeOut: 0.5,
          isMuted: false,
          ducking: false
        },
        speed: { rate: 1, reverse: false },
        colorGrade: {
          brightness: 0,
          contrast: 15,
          saturation: 20,
          temperature: 30,
          tint: -5,
          exposure: 5,
          highlights: 10,
          shadows: 5,
          vignette: 25,
          grain: 0,
          hue: 0,
          blur: 0,
          filterPreset: 'cinematic-hollywood-gold'
        },
        transitionIn: { type: 'whip-pan', duration: 0.4 },
        transitionOut: { type: 'film-burn', duration: 0.6 },
        keyframes: []
      },
      {
        id: 'clip-v1-3',
        trackId: 'track-v1',
        name: 'Velocity Tunnel Drive',
        type: 'video',
        startTime: 11.5,
        duration: 6.5,
        sourceStartTime: 0,
        sourceDuration: 8.0,
        mediaId: 'media-velocity-run',
        color: '#ef4444',
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
          fadeIn: 0.3,
          fadeOut: 0.8,
          isMuted: false,
          ducking: false
        },
        speed: { rate: 1.1, reverse: false },
        colorGrade: {
          brightness: 0,
          contrast: 32,
          saturation: 15,
          temperature: -10,
          tint: 15,
          exposure: 0,
          highlights: 25,
          shadows: -25,
          vignette: 40,
          grain: 15,
          hue: 0,
          blur: 0,
          filterPreset: 'automotive-metallic-spec'
        },
        transitionIn: { type: 'film-burn', duration: 0.6 },
        transitionOut: { type: 'fade-black', duration: 0.8 },
        keyframes: []
      },

      // Title & Text overlay track
      {
        id: 'clip-text-1',
        trackId: 'track-v2',
        name: 'Cinematic Title',
        type: 'text',
        startTime: 0.8,
        duration: 4.2,
        sourceStartTime: 0,
        sourceDuration: 4.2,
        color: '#a855f7',
        transform: {
          x: 0,
          y: 0.28, // lower third / center lower
          scale: 1,
          rotation: 0,
          opacity: 1,
          flipH: false,
          flipV: false,
          fit: 'contain',
          crop: { top: 0, bottom: 0, left: 0, right: 0 }
        },
        audio: { volume: 0, pan: 0, fadeIn: 0, fadeOut: 0, isMuted: true, ducking: false },
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
        textConfig: {
          text: 'NOVA STUDIO AI',
          fontFamily: 'Inter, sans-serif',
          fontSize: 54,
          fontWeight: '800',
          color: '#ffffff',
          strokeColor: '#00f7ff',
          strokeWidth: 2,
          shadowColor: 'rgba(0, 0, 0, 0.8)',
          shadowBlur: 14,
          backgroundColor: 'rgba(10, 15, 30, 0.65)',
          backgroundPadding: 16,
          alignment: 'center',
          animation: 'pop-in'
        },
        keyframes: []
      },
      {
        id: 'clip-text-2',
        trackId: 'track-v2',
        name: 'Velocity Subtitle',
        type: 'text',
        startTime: 12.0,
        duration: 4.5,
        sourceStartTime: 0,
        sourceDuration: 4.5,
        color: '#a855f7',
        transform: {
          x: 0,
          y: 0.32,
          scale: 1,
          rotation: 0,
          opacity: 1,
          flipH: false,
          flipV: false,
          fit: 'contain',
          crop: { top: 0, bottom: 0, left: 0, right: 0 }
        },
        audio: { volume: 0, pan: 0, fadeIn: 0, fadeOut: 0, isMuted: true, ducking: false },
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
        textConfig: {
          text: 'VELOCITY EDIT • 4K 60FPS',
          fontFamily: 'monospace',
          fontSize: 32,
          fontWeight: '700',
          color: '#ffdd00',
          strokeColor: '#ff2200',
          strokeWidth: 1,
          shadowColor: 'rgba(0,0,0,0.9)',
          shadowBlur: 8,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backgroundPadding: 12,
          alignment: 'center',
          animation: 'fade'
        },
        keyframes: []
      },

      // Audio track clips
      {
        id: 'clip-audio-1',
        trackId: 'track-a1',
        name: 'Cinematic Horizon Beat',
        type: 'audio',
        startTime: 0,
        duration: 17.5,
        sourceStartTime: 0,
        sourceDuration: 18.0,
        mediaId: 'media-ambient-beat',
        color: '#10b981',
        transform: {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          flipH: false,
          flipV: false,
          fit: 'contain',
          crop: { top: 0, bottom: 0, left: 0, right: 0 }
        },
        audio: {
          volume: 0.85,
          pan: 0,
          fadeIn: 1.0,
          fadeOut: 1.5,
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
        keyframes: []
      },

      // SFX track clips
      {
        id: 'clip-sfx-1',
        trackId: 'track-a2',
        name: 'Whip Pan Whoosh SFX',
        type: 'audio',
        startTime: 5.3,
        duration: 0.8,
        sourceStartTime: 0,
        sourceDuration: 0.8,
        color: '#6366f1',
        transform: {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          flipH: false,
          flipV: false,
          fit: 'contain',
          crop: { top: 0, bottom: 0, left: 0, right: 0 }
        },
        audio: {
          volume: 1,
          pan: 0,
          fadeIn: 0.05,
          fadeOut: 0.1,
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
        keyframes: []
      },
      {
        id: 'clip-sfx-2',
        trackId: 'track-a2',
        name: 'Cinematic Sub Impact SFX',
        type: 'audio',
        startTime: 11.4,
        duration: 1.2,
        sourceStartTime: 0,
        sourceDuration: 1.2,
        color: '#6366f1',
        transform: {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          flipH: false,
          flipV: false,
          fit: 'contain',
          crop: { top: 0, bottom: 0, left: 0, right: 0 }
        },
        audio: {
          volume: 1,
          pan: 0,
          fadeIn: 0.02,
          fadeOut: 0.3,
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
        keyframes: []
      }
    ],
    markers: [
      { id: 'marker-1', time: 5.5, label: 'Transition 1', color: '#06b6d4' },
      { id: 'marker-2', time: 11.5, label: 'Drop / Velocity', color: '#ef4444' }
    ]
  };

  return { project, initialMedia };
}
