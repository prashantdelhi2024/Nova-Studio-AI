import { Project, ExportSettings } from '../types/editor';
import { colorGradeToCSSFilter, applyCanvasVignetteAndGrain } from './colorGrading';
import { renderTransitionEffect } from './transitions';

export interface RenderProgress {
  currentFrame: number;
  totalFrames: number;
  percent: number;
  elapsedSeconds: number;
  etaSeconds: number;
  status: 'initializing' | 'rendering' | 'encoding' | 'completed' | 'cancelled' | 'error';
  errorMessage?: string;
}

export class VideoRenderExporter {
  private isCancelled: boolean = false;

  cancel() {
    this.isCancelled = true;
  }

  async renderAndExport(
    project: Project,
    settings: ExportSettings,
    mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
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
      status: 'initializing'
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    // Setup Web Audio graph for export mixing
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    let audioCtx: AudioContext | null = null;
    let audioDest: MediaStreamAudioDestinationNode | null = null;
    let combinedStream: MediaStream;

    try {
      if (AudioCtx) {
        audioCtx = new AudioCtx();
        audioDest = audioCtx.createMediaStreamDestination();
      }
    } catch (e) {
      console.warn('AudioContext unavailable for export, proceeding with video stream only:', e);
    }

    const videoStream = canvas.captureStream(fps);
    if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks()
      ]);
    } else {
      combinedStream = videoStream;
    }

    // Determine supported mime type
    let mimeType = 'video/webm;codecs=vp9';
    if (settings.format === 'mp4') {
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
        mimeType = 'video/mp4;codecs=avc1';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else {
        mimeType = 'video/webm;codecs=vp8';
      }
    } else {
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';
      }
    }

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: settings.quality === 'high' ? 8000000 : settings.quality === 'balanced' ? 4500000 : 2500000
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.start(100);

    const startTime = performance.now();
    const frameInterval = 1 / fps;

    // Render frame by frame
    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.isCancelled) {
        recorder.stop();
        if (audioCtx) await audioCtx.close();
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

      // 1. Clear background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // 2. Sort tracks from bottom to top (highest order index to lowest or by type)
      const sortedTracks = [...project.tracks].sort((a, b) => b.order - a.order);

      for (const track of sortedTracks) {
        if (track.isHidden) continue;

        // Find clips on this track that are active at currentTime
        const activeClips = project.clips.filter(
          (c) => c.trackId === track.id &&
                 currentTime >= c.startTime &&
                 currentTime < c.startTime + c.duration
        );

        for (const clip of activeClips) {
          const clipLocalTime = currentTime - clip.startTime;
          ctx.save();

          // Apply opacity
          ctx.globalAlpha = clip.transform.opacity;

          // Apply transform: center origin
          ctx.translate(width / 2 + clip.transform.x * width, height / 2 + clip.transform.y * height);
          ctx.rotate((clip.transform.rotation * Math.PI) / 180);
          ctx.scale(
            clip.transform.scale * (clip.transform.flipH ? -1 : 1),
            clip.transform.scale * (clip.transform.flipV ? -1 : 1)
          );

          // Render Video / Image / Solid
          if (clip.type === 'video' || clip.type === 'image') {
            const mediaEl = clip.mediaId ? mediaElements.get(clip.mediaId) : null;
            if (mediaEl) {
              if (mediaEl instanceof HTMLVideoElement && mediaEl.readyState >= 2) {
                // Seek video to corresponding source time
                mediaEl.currentTime = clip.sourceStartTime + clipLocalTime * clip.speed.rate;
              }
              // Apply CSS Color grade filter
              ctx.filter = colorGradeToCSSFilter(clip.colorGrade);
              ctx.drawImage(mediaEl, -width / 2, -height / 2, width, height);
              ctx.filter = 'none';
            } else {
              // Procedural background fallback
              ctx.fillStyle = clip.color || '#1e293b';
              ctx.fillRect(-width / 2, -height / 2, width, height);
            }

            // Apply vignette & grain in local space
            applyCanvasVignetteAndGrain(ctx, width, height, clip.colorGrade);

          } else if (clip.type === 'text' && clip.textConfig) {
            const tc = clip.textConfig;
            ctx.textAlign = tc.alignment as CanvasTextAlign;
            ctx.textBaseline = 'middle';
            ctx.font = `${tc.fontWeight} ${tc.fontSize}px ${tc.fontFamily}`;

            // Text animation calculations
            let animAlpha = 1;
            let animOffsetY = 0;
            if (tc.animation === 'fade') {
              animAlpha = Math.min(1, clipLocalTime * 2.5);
            } else if (tc.animation === 'slide-up') {
              const p = Math.min(1, clipLocalTime * 2);
              animOffsetY = (1 - p) * 40;
              animAlpha = p;
            } else if (tc.animation === 'pop-in') {
              const p = Math.min(1, clipLocalTime * 3);
              ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p);
              animAlpha = p;
            }

            ctx.globalAlpha *= animAlpha;

            // Background box
            if (tc.backgroundColor && tc.backgroundColor !== 'transparent') {
              const textMetrics = ctx.measureText(tc.text);
              const pad = tc.backgroundPadding;
              const boxW = textMetrics.width + pad * 2;
              const boxH = tc.fontSize * 1.4 + pad * 1.5;
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

            // Fill
            ctx.fillStyle = tc.color;
            ctx.fillText(tc.text, 0, animOffsetY);
            ctx.shadowBlur = 0;
          }

          ctx.restore();

          // Check Transitions
          // Transition In
          if (clip.transitionIn && clip.transitionIn.type !== 'none') {
            const inDur = clip.transitionIn.duration;
            if (clipLocalTime <= inDur) {
              const progress = clipLocalTime / inDur;
              renderTransitionEffect(ctx, width, height, clip.transitionIn.type, progress);
            }
          }

          // Transition Out
          if (clip.transitionOut && clip.transitionOut.type !== 'none') {
            const outDur = clip.transitionOut.duration;
            const timeRemaining = clip.duration - clipLocalTime;
            if (timeRemaining <= outDur) {
              const progress = 1 - timeRemaining / outDur;
              renderTransitionEffect(ctx, width, height, clip.transitionOut.type, progress);
            }
          }
        }
      }

      // Update progress and pace frame capture
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

      // Allow event loop to process
      await new Promise((resolve) => setTimeout(resolve, 8));
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
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const finalBlob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(finalBlob);
          const cleanName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const filename = `${cleanName}_${settings.resolution}_${settings.fps}fps.${ext}`;

          onProgress({
            currentFrame: totalFrames,
            totalFrames,
            percent: 100,
            elapsedSeconds: Number(((performance.now() - startTime) / 1000).toFixed(1)),
            etaSeconds: 0,
            status: 'completed'
          });

          if (audioCtx) {
            audioCtx.close().catch(() => {});
          }

          resolve({ blob: finalBlob, url, filename });
        } catch (err) {
          reject(err);
        }
      };

      recorder.onerror = (err) => {
        reject(err);
      };

      // Stop after rendering final frame
      setTimeout(() => {
        recorder.stop();
      }, 200);
    });
  }
}

export const renderExporter = new VideoRenderExporter();
