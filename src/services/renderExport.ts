import { Project, ExportSettings, Clip, MediaItem } from '../types/editor';
import { renderTimelineFrame } from './videoCompositor';

export interface RenderProgress {
  currentFrame: number;
  totalFrames: number;
  percent: number;
  elapsedSeconds: number;
  etaSeconds: number;
  status: 'initializing' | 'mixing-audio' | 'rendering' | 'encoding' | 'completed' | 'cancelled' | 'error';
  errorMessage?: string;
}

export class VideoRenderExporter {
  private isCancelled: boolean = false;
  private audioBufferCache: Map<string, AudioBuffer> = new Map();

  cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Waits for an HTMLVideoElement to seek to the desired timestamp with timeout fallback
   */
  private async seekVideo(video: HTMLVideoElement, targetTime: number, timeoutMs = 150): Promise<void> {
    if (Math.abs(video.currentTime - targetTime) < 0.03) {
      return;
    }

    return new Promise<void>((resolve) => {
      let isResolved = false;
      const onSeeked = () => {
        if (!isResolved) {
          isResolved = true;
          video.removeEventListener('seeked', onSeeked);
          clearTimeout(timer);
          resolve();
        }
      };

      const timer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }
      }, timeoutMs);

      video.addEventListener('seeked', onSeeked, { once: true });
      video.currentTime = targetTime;
    });
  }

  /**
   * Pre-renders the complete multi-track audio mix using OfflineAudioContext.
   * Respects track volume, track mute, clip volume, fades, and in/out points.
   */
  private async renderOfflineAudioMix(
    project: Project,
    mediaItems: MediaItem[]
  ): Promise<AudioBuffer | null> {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    const sampleRate = 48000;
    const duration = Math.max(1, project.duration);
    const length = Math.ceil(sampleRate * duration);

    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);
    const mediaMap = new Map<string, MediaItem>(mediaItems.map((m) => [m.id, m]));

    let hasAudioToMix = false;

    for (const track of project.tracks) {
      if (track.isMuted) continue;

      const trackClips = project.clips.filter((c) => c.trackId === track.id);

      for (const clip of trackClips) {
        if (clip.audio.isMuted || clip.audio.volume <= 0) continue;
        if (!clip.mediaId) continue;

        const media = mediaMap.get(clip.mediaId);
        if (!media) continue;

        try {
          // Get or decode AudioBuffer
          let buffer = this.audioBufferCache.get(media.id);
          if (!buffer) {
            let arrayBuffer: ArrayBuffer | null = null;
            if (media.blob) {
              arrayBuffer = await media.blob.arrayBuffer();
            } else if (media.url) {
              const res = await fetch(media.url);
              arrayBuffer = await res.arrayBuffer();
            }

            if (arrayBuffer) {
              const tempCtx = new AudioCtx();
              buffer = await tempCtx.decodeAudioData(arrayBuffer);
              tempCtx.close().catch(() => {});
              this.audioBufferCache.set(media.id, buffer);
            }
          }

          if (buffer) {
            hasAudioToMix = true;
            const source = offlineCtx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = clip.speed.rate || 1;

            const gain = offlineCtx.createGain();
            const clipVol = clip.audio.volume * track.volume;
            const startTime = clip.startTime;
            const endTime = clip.startTime + clip.duration;

            gain.gain.setValueAtTime(0, startTime);

            // Handle fade-in
            if (clip.audio.fadeIn > 0) {
              gain.gain.linearRampToValueAtTime(clipVol, startTime + clip.audio.fadeIn);
            } else {
              gain.gain.setValueAtTime(clipVol, startTime);
            }

            // Handle fade-out
            if (clip.audio.fadeOut > 0) {
              gain.gain.setValueAtTime(clipVol, Math.max(startTime, endTime - clip.audio.fadeOut));
              gain.gain.linearRampToValueAtTime(0, endTime);
            } else {
              gain.gain.setValueAtTime(clipVol, endTime);
            }

            source.connect(gain);
            gain.connect(offlineCtx.destination);

            source.start(startTime, clip.sourceStartTime, clip.duration);
          }
        } catch (err) {
          console.warn(`Could not mix audio for clip ${clip.name}:`, err);
        }
      }
    }

    if (!hasAudioToMix) return null;

    try {
      return await offlineCtx.startRendering();
    } catch (err) {
      console.warn('OfflineAudioContext rendering failed:', err);
      return null;
    }
  }

  /**
   * Main export method that renders video frames and synchronized mixed audio
   */
  async renderAndExport(
    project: Project,
    settings: ExportSettings,
    mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
    mediaItems: MediaItem[],
    onProgress: (progress: RenderProgress) => void
  ): Promise<{ blob: Blob; url: string; filename: string }> {
    this.isCancelled = false;

    const width = settings.width;
    const height = settings.height;
    const fps = settings.fps;
    const duration = Math.max(1, project.duration);
    const totalFrames = Math.ceil(duration * fps);

    onProgress({
      currentFrame: 0,
      totalFrames,
      percent: 0,
      elapsedSeconds: 0,
      etaSeconds: 0,
      status: 'mixing-audio'
    });

    // 1. Pre-render offline audio mix
    const mixedAudioBuffer = await this.renderOfflineAudioMix(project, mediaItems);

    if (this.isCancelled) {
      throw new Error('Export cancelled by user');
    }

    // Handle Audio-Only Export immediately if requested
    if (settings.format === 'audio-only') {
      const wavBlob = mixedAudioBuffer ? this.audioBufferToWav(mixedAudioBuffer) : new Blob([], { type: 'audio/wav' });
      const url = URL.createObjectURL(wavBlob);
      const cleanName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `${cleanName}_audio.wav`;

      onProgress({
        currentFrame: totalFrames,
        totalFrames,
        percent: 100,
        elapsedSeconds: 0.5,
        etaSeconds: 0,
        status: 'completed'
      });

      return { blob: wavBlob, url, filename };
    }

    // 2. Setup Canvas and Streams for Video Export
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    let playbackAudioCtx: AudioContext | null = null;
    let audioDest: MediaStreamAudioDestinationNode | null = null;
    let audioSourceNode: AudioBufferSourceNode | null = null;

    if (AudioCtx && mixedAudioBuffer) {
      playbackAudioCtx = new AudioCtx({ sampleRate: mixedAudioBuffer.sampleRate });
      audioDest = playbackAudioCtx.createMediaStreamDestination();
      audioSourceNode = playbackAudioCtx.createBufferSource();
      audioSourceNode.buffer = mixedAudioBuffer;
      audioSourceNode.connect(audioDest);
    }

    const videoStream = canvas.captureStream(fps);
    let combinedStream: MediaStream;

    if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks()
      ]);
    } else {
      combinedStream = videoStream;
    }

    // 3. Determine real supported container format
    let mimeType = 'video/webm;codecs=vp9';
    let outputExt = 'webm';

    if (settings.format === 'mp4') {
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
        mimeType = 'video/mp4;codecs=avc1';
        outputExt = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
        outputExt = 'mp4';
      } else {
        // Fallback: browser does not support encoding MP4 natively in MediaRecorder
        mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm;codecs=vp8';
        outputExt = 'webm';
      }
    } else {
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';
      }
      outputExt = 'webm';
    }

    const bitrate = settings.quality === 'high' ? 8000000 : settings.quality === 'balanced' ? 4500000 : 2500000;
    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: bitrate
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.start(100);
    if (audioSourceNode) {
      audioSourceNode.start(0);
    }

    const startTime = performance.now();
    const frameInterval = 1 / fps;

    // 4. Frame-by-Frame Rendering Loop
    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.isCancelled) {
        recorder.stop();
        if (playbackAudioCtx) await playbackAudioCtx.close().catch(() => {});
        onProgress({
          currentFrame: frame,
          totalFrames,
          percent: Math.round((frame / totalFrames) * 100),
          elapsedSeconds: (performance.now() - startTime) / 1000,
          etaSeconds: 0,
          status: 'cancelled'
        });
        throw new Error('Export cancelled by user');
      }

      const currentTime = frame * frameInterval;

      // Ensure all active video elements are seeked to the exact frame timestamp
      const activeVideoClips = project.clips.filter(
        (c) => c.type === 'video' &&
               currentTime >= c.startTime &&
               currentTime < c.startTime + c.duration
      );

      for (const clip of activeVideoClips) {
        if (clip.mediaId) {
          const el = mediaElements.get(clip.mediaId);
          if (el instanceof HTMLVideoElement && el.readyState >= 2) {
            const clipLocalTime = currentTime - clip.startTime;
            const targetTime = clip.sourceStartTime + clipLocalTime * (clip.speed.rate || 1);
            await this.seekVideo(el, targetTime);
          }
        }
      }

      // Render the frame onto canvas using the unified compositor
      renderTimelineFrame(ctx, width, height, project, currentTime, mediaElements);

      // Calculate progress and ETA
      const elapsed = (performance.now() - startTime) / 1000;
      const progressPercent = Math.min(99, Math.round(((frame + 1) / totalFrames) * 100));
      const framesPerSec = (frame + 1) / Math.max(0.01, elapsed);
      const remainingFrames = totalFrames - (frame + 1);
      const eta = remainingFrames / Math.max(1, framesPerSec);

      if (frame % 3 === 0 || frame === totalFrames - 1) {
        onProgress({
          currentFrame: frame + 1,
          totalFrames,
          percent: progressPercent,
          elapsedSeconds: Number(elapsed.toFixed(1)),
          etaSeconds: Number(eta.toFixed(1)),
          status: 'rendering'
        });
      }

      // Yield event loop slightly so MediaRecorder can encode the captured frame
      await new Promise((resolve) => setTimeout(resolve, Math.max(4, Math.floor(1000 / fps * 0.4))));
    }

    onProgress({
      currentFrame: totalFrames,
      totalFrames,
      percent: 99,
      elapsedSeconds: Number(((performance.now() - startTime) / 1000).toFixed(1)),
      etaSeconds: 0,
      status: 'encoding'
    });

    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        try {
          const finalBlob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(finalBlob);
          const cleanName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const filename = `${cleanName}_${settings.resolution}_${settings.fps}fps.${outputExt}`;

          onProgress({
            currentFrame: totalFrames,
            totalFrames,
            percent: 100,
            elapsedSeconds: Number(((performance.now() - startTime) / 1000).toFixed(1)),
            etaSeconds: 0,
            status: 'completed'
          });

          if (playbackAudioCtx) {
            playbackAudioCtx.close().catch(() => {});
          }

          resolve({ blob: finalBlob, url, filename });
        } catch (err) {
          reject(err);
        }
      };

      recorder.onerror = (err) => {
        reject(err);
      };

      setTimeout(() => {
        recorder.stop();
      }, 250);
    });
  }

  /**
   * Helper to encode an AudioBuffer to standard WAV Blob format
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
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

    function writeString(offset: number, str: string) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
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
}

export const renderExporter = new VideoRenderExporter();
