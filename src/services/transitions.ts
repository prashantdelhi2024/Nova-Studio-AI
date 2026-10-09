import { TransitionType } from '../types/editor';

export interface TransitionDescriptor {
  type: TransitionType;
  name: string;
  category: 'Dissolve' | 'Cinematic' | 'Motion' | 'Glitch & Light' | 'Geometric';
  description: string;
  defaultDuration: number; // seconds
}

export const TRANSITION_CATALOG: TransitionDescriptor[] = [
  {
    type: 'cross-dissolve',
    name: 'Cross Dissolve',
    category: 'Dissolve',
    description: 'Smooth optical alpha cross-fade between outgoing and incoming footage',
    defaultDuration: 0.8
  },
  {
    type: 'fade-black',
    name: 'Dip to Black',
    category: 'Dissolve',
    description: 'Fades down to pure black, then brings in the next scene',
    defaultDuration: 0.6
  },
  {
    type: 'fade-white',
    name: 'Dip to White',
    category: 'Dissolve',
    description: 'Cinematic dream-like fade through white exposure',
    defaultDuration: 0.5
  },
  {
    type: 'whip-pan',
    name: 'Whip Pan Motion',
    category: 'Motion',
    description: 'Fast energetic horizontal pan with directional motion blur',
    defaultDuration: 0.4
  },
  {
    type: 'film-burn',
    name: 'Vintage Film Burn',
    category: 'Glitch & Light',
    description: 'Organic warm analog projector burn and flame sweep',
    defaultDuration: 0.7
  },
  {
    type: 'light-leak',
    name: 'Anamorphic Light Leak',
    category: 'Glitch & Light',
    description: 'Prismatic anamorphic flare sweep across the screen',
    defaultDuration: 0.75
  },
  {
    type: 'glitch',
    name: 'Digital RGB Glitch',
    category: 'Glitch & Light',
    description: 'Cyberpunk scanline displacement and chromatic glitch',
    defaultDuration: 0.35
  },
  {
    type: 'zoom-in',
    name: 'Crash Zoom In',
    category: 'Motion',
    description: 'High velocity punch zoom forward into the next clip',
    defaultDuration: 0.45
  },
  {
    type: 'zoom-out',
    name: 'Warp Zoom Out',
    category: 'Motion',
    description: 'Dynamic zoom pull-back revealing the next shot',
    defaultDuration: 0.45
  },
  {
    type: 'rgb-split',
    name: 'RGB Chromatic Split',
    category: 'Glitch & Light',
    description: 'Red, Green, Blue channel offset pulse',
    defaultDuration: 0.4
  },
  {
    type: 'blur-dissolve',
    name: 'Defocus Blur Dissolve',
    category: 'Dissolve',
    description: 'Optical lens rack defocus into sharp reveal',
    defaultDuration: 0.6
  },
  {
    type: 'flash',
    name: 'Impact Flash',
    category: 'Glitch & Light',
    description: 'High energy beat impact white strobe flash',
    defaultDuration: 0.3
  },
  {
    type: 'slide-left',
    name: 'Slide Left',
    category: 'Geometric',
    description: 'Incoming clip pushes left across frame',
    defaultDuration: 0.5
  },
  {
    type: 'slide-right',
    name: 'Slide Right',
    category: 'Geometric',
    description: 'Incoming clip pushes right across frame',
    defaultDuration: 0.5
  },
  {
    type: 'wipe',
    name: 'Linear Wipe',
    category: 'Geometric',
    description: 'Clean angled line wipe across screen',
    defaultDuration: 0.6
  }
];

/**
 * Renders transition overlay effect directly onto canvas during playback and offline video rendering
 * @param progress 0.0 (transition start) to 1.0 (transition finish)
 */
export function renderTransitionEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  type: TransitionType,
  progress: number
): void {
  // Clamp progress strictly to 0..1
  const p = Math.max(0, Math.min(1, progress));
  if (type === 'none' || p <= 0 || p >= 1) return;

  ctx.save();

  switch (type) {
    case 'cross-dissolve': {
      // Optical cross dissolve with subtle midpoint exposure bloom
      const midAlpha = Math.sin(p * Math.PI) * 0.45;
      ctx.fillStyle = `rgba(20, 20, 28, ${midAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'fade-black': {
      // Peaks at progress = 0.5
      const alpha = p < 0.5 ? p * 2 : (1 - p) * 2;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'fade-white': {
      const alpha = p < 0.5 ? p * 2 : (1 - p) * 2;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'flash': {
      // Exponential decay strobe flash
      const flashAlpha = Math.sin(p * Math.PI) * 0.95;
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'film-burn': {
      // Vintage analog projector warm burn effect
      const peak = Math.sin(p * Math.PI);
      const grad = ctx.createLinearGradient(
        (p - 0.5) * width * 1.5,
        0,
        p * width * 1.5,
        height
      );
      grad.addColorStop(0, 'rgba(255, 120, 20, 0)');
      grad.addColorStop(0.3, `rgba(255, 60, 0, ${(peak * 0.75).toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(255, 220, 100, ${(peak * 0.9).toFixed(3)})`);
      grad.addColorStop(0.7, `rgba(255, 40, 10, ${(peak * 0.6).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'light-leak': {
      // Anamorphic prismatic light flares sweep across screen
      const peak = Math.sin(p * Math.PI);
      const radGrad = ctx.createRadialGradient(
        width * (0.2 + p * 0.6),
        height * 0.3,
        20,
        width * (0.2 + p * 0.6),
        height * 0.3,
        width * 0.7
      );
      radGrad.addColorStop(0, `rgba(255, 240, 180, ${(peak * 0.85).toFixed(3)})`);
      radGrad.addColorStop(0.4, `rgba(255, 90, 150, ${(peak * 0.5).toFixed(3)})`);
      radGrad.addColorStop(0.8, `rgba(0, 180, 255, ${(peak * 0.3).toFixed(3)})`);
      radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'glitch': {
      // Digital scanlines and block displacements
      const intensity = Math.sin(p * Math.PI);
      if (intensity > 0.05) {
        const bands = 6;
        for (let i = 0; i < bands; i++) {
          const y = (i / bands) * height + Math.sin(p * 20 + i) * 20;
          const h = (height / bands) * 0.5;
          const offset = Math.sin(p * 15 + i) * 35 * intensity;
          ctx.fillStyle = i % 2 === 0
            ? `rgba(0, 255, 255, ${(0.35 * intensity).toFixed(3)})`
            : `rgba(255, 0, 100, ${(0.35 * intensity).toFixed(3)})`;
          ctx.fillRect(offset, y, width, h);
        }
      }
      break;
    }

    case 'whip-pan': {
      // Directional motion blur translation streaks
      const speed = Math.sin(p * Math.PI);
      const streakAlpha = speed * 0.45;
      ctx.fillStyle = `rgba(0, 0, 0, ${streakAlpha.toFixed(2)})`;
      ctx.fillRect(0, 0, width, height);

      // Horizontal blur streak lines
      ctx.fillStyle = `rgba(255, 255, 255, ${(speed * 0.15).toFixed(2)})`;
      for (let y = 0; y < height; y += 12) {
        ctx.fillRect(0, y, width, 1.5);
      }
      break;
    }

    case 'zoom-in': {
      // Dynamic crash zoom expansion overlay
      const scale = 1 + Math.sin(p * Math.PI) * 0.35;
      const alpha = Math.sin(p * Math.PI) * 0.5;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);

      // Vignette radial pull
      const rGrad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, (width / 2) * scale);
      rGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      rGrad.addColorStop(1, `rgba(0, 0, 0, ${(alpha * 0.8).toFixed(3)})`);
      ctx.fillStyle = rGrad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'zoom-out': {
      // Warp zoom out compression overlay
      const alpha = Math.sin(p * Math.PI) * 0.5;
      const rGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.7);
      rGrad.addColorStop(0, `rgba(0, 0, 0, ${(alpha * 0.7).toFixed(3)})`);
      rGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rGrad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'rgb-split': {
      // Chromatic aberration offset
      const offset = Math.sin(p * Math.PI) * 20;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255, 0, 50, 0.5)';
      ctx.strokeRect(-offset, 0, width, height);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.strokeRect(offset, 0, width, height);
      break;
    }

    case 'blur-dissolve': {
      // Lens defocus dissolve simulation
      const blurAlpha = Math.sin(p * Math.PI) * 0.6;
      ctx.fillStyle = `rgba(10, 10, 15, ${blurAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'slide-left': {
      // Slide left transition bar
      const x = (1 - p) * width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(x, 0, width, height);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.fillRect(x - 4, 0, 4, height);
      break;
    }

    case 'slide-right': {
      // Slide right transition bar
      const x = p * width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, x, height);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
      ctx.fillRect(x, 0, 4, height);
      break;
    }

    case 'wipe': {
      // Linear angled wipe line
      const wipeX = p * (width + 60) - 30;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(wipeX, 0, 6, height);
      break;
    }

    default:
      break;
  }

  ctx.restore();
}
