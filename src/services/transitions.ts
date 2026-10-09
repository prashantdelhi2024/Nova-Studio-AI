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
    description: 'Smooth alpha cross-fade between outgoing and incoming footage',
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
) {
  if (type === 'none' || progress <= 0 || progress >= 1) return;

  ctx.save();

  switch (type) {
    case 'cross-dissolve': {
      // In a dual-layer render, cross-dissolve interpolates alpha.
      // Here, if overlaying, we can apply subtle diffusion
      break;
    }

    case 'fade-black': {
      // Peaks at progress = 0.5
      const alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'fade-white': {
      const alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'flash': {
      // High-intensity flash at start with rapid exponential fadeout
      const flashAlpha = Math.max(0, Math.sin(progress * Math.PI));
      ctx.fillStyle = `rgba(255, 255, 255, ${(flashAlpha * 0.95).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'film-burn': {
      // Animated warm projector burn effect
      const peak = Math.sin(progress * Math.PI);
      const grad = ctx.createLinearGradient(
        (progress - 0.5) * width * 1.5,
        0,
        progress * width * 1.5,
        height
      );
      grad.addColorStop(0, `rgba(255, 120, 20, 0)`);
      grad.addColorStop(0.3, `rgba(255, 60, 0, ${(peak * 0.75).toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(255, 220, 100, ${(peak * 0.9).toFixed(3)})`);
      grad.addColorStop(0.7, `rgba(255, 40, 10, ${(peak * 0.6).toFixed(3)})`);
      grad.addColorStop(1, `rgba(0, 0, 0, 0)`);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'light-leak': {
      const peak = Math.sin(progress * Math.PI);
      const radGrad = ctx.createRadialGradient(
        width * (0.2 + progress * 0.6),
        height * 0.3,
        20,
        width * (0.2 + progress * 0.6),
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
      const intensity = Math.sin(progress * Math.PI);
      if (intensity > 0.1) {
        const bands = 5;
        for (let i = 0; i < bands; i++) {
          const y = (Math.random() * height);
          const h = Math.random() * (height / 8);
          const offset = (Math.random() - 0.5) * 40 * intensity;
          ctx.fillStyle = i % 2 === 0 ? `rgba(0, 255, 255, ${0.3 * intensity})` : `rgba(255, 0, 100, ${0.3 * intensity})`;
          ctx.fillRect(offset, y, width, h);
        }
      }
      break;
    }

    case 'whip-pan': {
      // Motion blur streaks
      const speed = Math.sin(progress * Math.PI);
      const streakAlpha = speed * 0.4;
      ctx.fillStyle = `rgba(0, 0, 0, ${streakAlpha.toFixed(2)})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'rgb-split': {
      const offset = Math.sin(progress * Math.PI) * 15;
      ctx.strokeStyle = `rgba(255, 0, 50, 0.4)`;
      ctx.lineWidth = 4;
      ctx.strokeRect(-offset, 0, width, height);
      ctx.strokeStyle = `rgba(0, 255, 255, 0.4)`;
      ctx.strokeRect(offset, 0, width, height);
      break;
    }

    case 'wipe': {
      // Linear angled wipe bar
      const wipeX = progress * (width + 40) - 20;
      ctx.fillStyle = `rgba(255, 255, 255, 0.6)`;
      ctx.fillRect(wipeX, 0, 8, height);
      break;
    }

    default:
      break;
  }

  ctx.restore();
}
