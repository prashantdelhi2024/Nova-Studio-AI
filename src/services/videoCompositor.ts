import { Project, Clip, Track } from '../types/editor';
import { colorGradeToCSSFilter, applyCanvasVignetteAndGrain } from './colorGrading';
import { renderTransitionEffect } from './transitions';

export interface CompositorRenderOptions {
  showSafeAreas?: boolean;
  quality?: 'auto' | 'high' | 'medium' | 'low';
}

/**
 * Single authoritative compositor function used identically by both
 * the Live Preview Monitor and the Offline Video Render Exporter.
 */
export function renderTimelineFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: Project,
  currentTime: number,
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
  options: CompositorRenderOptions = {}
): void {
  // 1. Clear base background to black
  ctx.save();
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 2. Sort tracks from bottom to top (highest order to lowest order)
  const sortedTracks = [...project.tracks].sort((a, b) => b.order - a.order);

  for (const track of sortedTracks) {
    if (track.isHidden) continue;

    // Active clips on this track at currentTime
    const activeClips = project.clips.filter(
      (c) =>
        c.trackId === track.id &&
        currentTime >= c.startTime &&
        currentTime < c.startTime + c.duration
    );

    for (const clip of activeClips) {
      renderClipOnCanvas(ctx, width, height, clip, currentTime, mediaElements);
    }
  }

  // 3. Render safe area guides if requested (Preview mode only)
  if (options.showSafeAreas) {
    renderSafeAreas(ctx, width, height);
  }
}

/**
 * Renders an individual clip with all transforms, color grades, text styling, and transitions
 */
export function renderClipOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  clip: Clip,
  currentTime: number,
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>
): void {
  const localTime = currentTime - clip.startTime;

  ctx.save();

  // Opacity & Global Alpha
  ctx.globalAlpha = Math.max(0, Math.min(1, clip.transform.opacity));

  // Transform coordinates centered around canvas origin
  const centerX = width / 2 + clip.transform.x * width;
  const centerY = height / 2 + clip.transform.y * height;
  ctx.translate(centerX, centerY);

  // Rotation
  if (clip.transform.rotation !== 0) {
    ctx.rotate((clip.transform.rotation * Math.PI) / 180);
  }

  // Scale & Flip
  const scaleX = clip.transform.scale * (clip.transform.flipH ? -1 : 1);
  const scaleY = clip.transform.scale * (clip.transform.flipV ? -1 : 1);
  ctx.scale(scaleX, scaleY);

  // Render Video or Image Clip
  if (clip.type === 'video' || clip.type === 'image') {
    const mediaEl = clip.mediaId ? mediaElements.get(clip.mediaId) : null;

    if (mediaEl) {
      // Color grading CSS filter
      ctx.filter = colorGradeToCSSFilter(clip.colorGrade);

      // Handle fit mode (contain, cover, fill)
      let drawW = width;
      let drawH = height;

      if (clip.transform.fit === 'contain') {
        const sourceW = (mediaEl as any).videoWidth || (mediaEl as any).naturalWidth || width;
        const sourceH = (mediaEl as any).videoHeight || (mediaEl as any).naturalHeight || height;
        const ratio = Math.min(width / sourceW, height / sourceH);
        drawW = sourceW * ratio;
        drawH = sourceH * ratio;
      }

      ctx.drawImage(mediaEl, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.filter = 'none';
    } else {
      // Procedural background block fallback
      ctx.fillStyle = clip.color || '#1e293b';
      ctx.fillRect(-width / 2, -height / 2, width, height);

      // Text label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(clip.name.toUpperCase(), 0, 0);
    }

    // Apply Vignette & Film grain in local space
    applyCanvasVignetteAndGrain(ctx, width, height, clip.colorGrade);
  }

  // Render Text / Title Clip
  else if (clip.type === 'text' && clip.textConfig) {
    const tc = clip.textConfig;
    ctx.textAlign = tc.alignment as CanvasTextAlign;
    ctx.textBaseline = 'middle';
    ctx.font = `${tc.fontWeight} ${tc.fontSize}px ${tc.fontFamily}`;

    // Animation calculation
    let animAlpha = 1;
    let animOffsetY = 0;

    if (tc.animation === 'fade') {
      animAlpha = Math.min(1, localTime * 2.5);
    } else if (tc.animation === 'slide-up') {
      const p = Math.min(1, localTime * 2);
      animOffsetY = (1 - p) * 35;
      animAlpha = p;
    } else if (tc.animation === 'pop-in') {
      const p = Math.min(1, localTime * 3);
      ctx.scale(0.85 + 0.15 * p, 0.85 + 0.15 * p);
      animAlpha = p;
    }

    ctx.globalAlpha *= animAlpha;

    // Background box
    if (tc.backgroundColor && tc.backgroundColor !== 'transparent') {
      const metrics = ctx.measureText(tc.text);
      const pad = tc.backgroundPadding;
      const boxW = metrics.width + pad * 2;
      const boxH = tc.fontSize * 1.35 + pad * 1.5;
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

    // Text Fill
    ctx.fillStyle = tc.color;
    ctx.fillText(tc.text, 0, animOffsetY);
    ctx.shadowBlur = 0;
  }

  ctx.restore();

  // 4. Transitions overlay
  // Transition In (at beginning of clip)
  if (clip.transitionIn && clip.transitionIn.type !== 'none') {
    const inDur = clip.transitionIn.duration;
    if (localTime <= inDur && inDur > 0) {
      const progress = Math.max(0, Math.min(1, localTime / inDur));
      renderTransitionEffect(ctx, width, height, clip.transitionIn.type, progress);
    }
  }

  // Transition Out (at end of clip)
  if (clip.transitionOut && clip.transitionOut.type !== 'none') {
    const outDur = clip.transitionOut.duration;
    const timeRemaining = clip.duration - localTime;
    if (timeRemaining <= outDur && outDur > 0) {
      const progress = Math.max(0, Math.min(1, 1 - timeRemaining / outDur));
      renderTransitionEffect(ctx, width, height, clip.transitionOut.type, progress);
    }
  }
}

/**
 * Renders standard Action Safe & Title Safe markers and Rule of Thirds grid
 */
function renderSafeAreas(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.lineWidth = 1;

  // Action safe (90%)
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.65)';
  ctx.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);

  // Title safe (80%)
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.65)';
  ctx.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);

  // Rule of Thirds
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(width / 3, 0); ctx.lineTo(width / 3, height);
  ctx.moveTo((width / 3) * 2, 0); ctx.lineTo((width / 3) * 2, height);
  ctx.moveTo(0, height / 3); ctx.lineTo(width, height / 3);
  ctx.moveTo(0, (height / 3) * 2); ctx.lineTo(width, (height / 3) * 2);
  ctx.stroke();

  // Center crosshair
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
  ctx.beginPath();
  ctx.moveTo(width / 2 - 15, height / 2); ctx.lineTo(width / 2 + 15, height / 2);
  ctx.moveTo(width / 2, height / 2 - 15); ctx.lineTo(width / 2, height / 2 + 15);
  ctx.stroke();

  ctx.restore();
}
