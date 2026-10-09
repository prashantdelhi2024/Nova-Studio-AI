import { ColorGrade, FilterPreset } from '../types/editor';

// 32 Distinct, handcrafted functional color grading presets
export const FILTER_PRESETS: FilterPreset[] = [
  // Cinematic
  {
    id: 'cinematic-teal-orange',
    name: 'Teal & Orange Blockbuster',
    category: 'Cinematic',
    previewColor: '#008b8b',
    colorGrade: { contrast: 25, saturation: 20, temperature: -15, tint: 10, highlights: 15, shadows: -20, vignette: 35, grain: 10 }
  },
  {
    id: 'cinematic-hollywood-gold',
    name: 'Hollywood Golden Sun',
    category: 'Cinematic',
    previewColor: '#d4af37',
    colorGrade: { contrast: 18, saturation: 15, temperature: 28, tint: -5, exposure: 8, vignette: 25 }
  },
  {
    id: 'cinematic-matrix-cyan',
    name: 'Sci-Fi Matrix Tint',
    category: 'Cinematic',
    previewColor: '#00ff66',
    colorGrade: { contrast: 30, saturation: -10, temperature: -20, tint: -35, shadows: -15, vignette: 40 }
  },
  {
    id: 'cinematic-anamorphic-blue',
    name: 'Anamorphic Blue Flare',
    category: 'Cinematic',
    previewColor: '#1e3a8a',
    colorGrade: { contrast: 22, saturation: 10, temperature: -30, tint: 8, highlights: 25, shadows: -10, vignette: 30 }
  },
  {
    id: 'cinematic-dune-spice',
    name: 'Arrakis Warm Dust',
    category: 'Cinematic',
    previewColor: '#c2410c',
    colorGrade: { contrast: 15, saturation: -15, temperature: 45, tint: 15, exposure: -5, vignette: 45, grain: 20 }
  },
  
  // Film Emulation
  {
    id: 'film-kodak-portra',
    name: 'Kodak Portra 400',
    category: 'Film Emulation',
    previewColor: '#f59e0b',
    colorGrade: { contrast: 10, saturation: 12, temperature: 14, tint: 4, highlights: -10, shadows: 12, grain: 25 }
  },
  {
    id: 'film-fuji-velvia',
    name: 'Fujifilm Velvia 50',
    category: 'Film Emulation',
    previewColor: '#10b981',
    colorGrade: { contrast: 32, saturation: 35, temperature: -8, tint: -10, highlights: 15, shadows: -25 }
  },
  {
    id: 'film-kodachrome-64',
    name: 'Kodachrome 64 Vintage',
    category: 'Film Emulation',
    previewColor: '#dc2626',
    colorGrade: { contrast: 28, saturation: 22, temperature: 18, tint: 12, highlights: 10, shadows: -18, grain: 30 }
  },
  {
    id: 'film-super8-grain',
    name: 'Super 8mm Motion Film',
    category: 'Film Emulation',
    previewColor: '#b45309',
    colorGrade: { contrast: 20, saturation: -10, temperature: 22, tint: 8, vignette: 50, grain: 60 }
  },
  {
    id: 'film-cinestill-800t',
    name: 'CineStill 800T Tungsten',
    category: 'Film Emulation',
    previewColor: '#0284c7',
    colorGrade: { contrast: 24, saturation: 14, temperature: -35, tint: 20, highlights: 30, shadows: -15, grain: 35 }
  },

  // Vintage & Retro
  {
    id: 'vintage-70s-summer',
    name: '1970s Sunset Haze',
    category: 'Vintage',
    previewColor: '#ea580c',
    colorGrade: { contrast: -10, saturation: -12, temperature: 35, tint: 15, highlights: -20, shadows: 25, vignette: 40, grain: 30 }
  },
  {
    id: 'vintage-vhs-tape',
    name: 'VHS Camcorder 1994',
    category: 'Vintage',
    previewColor: '#6366f1',
    colorGrade: { contrast: 15, saturation: 25, temperature: -10, tint: 18, grain: 45, hue: 10 }
  },
  {
    id: 'vintage-polaroid',
    name: 'Faded Polaroid Instant',
    category: 'Vintage',
    previewColor: '#fbbf24',
    colorGrade: { contrast: -15, saturation: -20, temperature: 20, tint: -10, shadows: 30, vignette: 45, grain: 20 }
  },
  {
    id: 'vintage-technicolor',
    name: '1950s Technicolor 3-Strip',
    category: 'Vintage',
    previewColor: '#be123c',
    colorGrade: { contrast: 35, saturation: 40, temperature: 10, tint: 25, shadows: -20 }
  },

  // Monochrome & Noir
  {
    id: 'noir-high-contrast',
    name: 'Classic Film Noir B&W',
    category: 'Monochrome',
    previewColor: '#374151',
    colorGrade: { saturation: -100, contrast: 45, exposure: -5, highlights: 25, shadows: -40, vignette: 55, grain: 35 }
  },
  {
    id: 'noir-silver-gelatin',
    name: 'Silver Gelatin Print',
    category: 'Monochrome',
    previewColor: '#6b7280',
    colorGrade: { saturation: -100, contrast: 20, temperature: -5, highlights: 10, shadows: 15, grain: 15 }
  },
  {
    id: 'noir-sepia-antique',
    name: 'Antique Sepia Tone',
    category: 'Monochrome',
    previewColor: '#78350f',
    colorGrade: { saturation: -80, temperature: 60, tint: 20, contrast: 15, vignette: 45, grain: 25 }
  },
  {
    id: 'noir-cyber-monochrome',
    name: 'Deep Shadow Carbon',
    category: 'Monochrome',
    previewColor: '#111827',
    colorGrade: { saturation: -100, contrast: 55, exposure: -15, shadows: -50, vignette: 65 }
  },

  // Cyberpunk & Neon
  {
    id: 'cyberpunk-neon-magenta',
    name: 'Cyberpunk Neon Tokyo',
    category: 'Cyberpunk',
    previewColor: '#ec4899',
    colorGrade: { contrast: 35, saturation: 45, temperature: -25, tint: 45, highlights: 30, shadows: -25, vignette: 30 }
  },
  {
    id: 'cyberpunk-synthwave',
    name: 'Synthwave 80s Purple',
    category: 'Cyberpunk',
    previewColor: '#8b5cf6',
    colorGrade: { contrast: 30, saturation: 35, temperature: -15, tint: 50, exposure: 5, vignette: 35 }
  },
  {
    id: 'cyberpunk-electric-cyan',
    name: 'Electric Cyan Grid',
    category: 'Cyberpunk',
    previewColor: '#06b6d4',
    colorGrade: { contrast: 28, saturation: 30, temperature: -45, tint: -20, highlights: 25, shadows: -15 }
  },

  // Moody & Street
  {
    id: 'moody-forest-emerald',
    name: 'Moody Nordic Forest',
    category: 'Moody',
    previewColor: '#065f46',
    colorGrade: { contrast: 20, saturation: -25, temperature: -18, tint: -15, exposure: -8, shadows: -15, vignette: 40 }
  },
  {
    id: 'moody-urban-desat',
    name: 'Urban Desaturated Street',
    category: 'Moody',
    previewColor: '#475569',
    colorGrade: { contrast: 25, saturation: -40, temperature: -10, highlights: 15, shadows: -30, vignette: 35, grain: 20 }
  },
  {
    id: 'moody-midnight-city',
    name: 'Midnight Gotham',
    category: 'Moody',
    previewColor: '#0f172a',
    colorGrade: { contrast: 32, saturation: -15, temperature: -35, exposure: -12, shadows: -35, vignette: 50 }
  },

  // Automotive & Luxury
  {
    id: 'automotive-metallic-spec',
    name: 'Velocity German Spec',
    category: 'Automotive',
    previewColor: '#334155',
    colorGrade: { contrast: 35, saturation: 10, temperature: -12, tint: 8, highlights: 30, shadows: -30, vignette: 40 }
  },
  {
    id: 'automotive-supercar-red',
    name: 'Maranello Gloss Red',
    category: 'Automotive',
    previewColor: '#b91c1c',
    colorGrade: { contrast: 28, saturation: 28, temperature: 15, tint: 20, highlights: 20, shadows: -20 }
  },
  {
    id: 'automotive-luxury-matte',
    name: 'Matte Stealth Carbon',
    category: 'Automotive',
    previewColor: '#18181b',
    colorGrade: { contrast: 18, saturation: -30, temperature: -5, highlights: -10, shadows: 15, vignette: 45, grain: 15 }
  },

  // Warm & Cool
  {
    id: 'warm-golden-hour',
    name: 'Magic Golden Hour',
    category: 'Warm & Cool',
    previewColor: '#f97316',
    colorGrade: { contrast: 14, saturation: 22, temperature: 40, tint: 8, exposure: 6, vignette: 20 }
  },
  {
    id: 'cool-arctic-breeze',
    name: 'Arctic Ice Glaze',
    category: 'Warm & Cool',
    previewColor: '#38bdf8',
    colorGrade: { contrast: 16, saturation: -10, temperature: -50, tint: -10, highlights: 20, shadows: 5 }
  },

  // Clean & Commercial
  {
    id: 'clean-youtube-vlog',
    name: 'Clean Creator Glow',
    category: 'Clean',
    previewColor: '#14b8a6',
    colorGrade: { brightness: 5, contrast: 12, saturation: 14, temperature: 6, highlights: 8, shadows: 6 }
  },
  {
    id: 'clean-commercial-pop',
    name: 'Commercial Product Pop',
    category: 'Clean',
    previewColor: '#e11d48',
    colorGrade: { brightness: 8, contrast: 22, saturation: 25, highlights: 12, shadows: -10 }
  },
  {
    id: 'clean-pastel-dream',
    name: 'Pastel Dream Pop',
    category: 'Clean',
    previewColor: '#f472b6',
    colorGrade: { brightness: 6, contrast: -8, saturation: 15, temperature: 8, tint: 12, highlights: 15, shadows: 20 }
  }
];

export const ALL_FILTER_PRESETS: FilterPreset[] = FILTER_PRESETS;

export const DEFAULT_COLOR_GRADE: ColorGrade = {
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
};

/**
 * Converts color grade parameters to a CSS filter string for real-time hardware accelerated preview
 */
export function colorGradeToCSSFilter(grade: ColorGrade): string {
  const brightnessVal = 1 + (grade.brightness + grade.exposure * 0.8) / 100;
  const contrastVal = 1 + grade.contrast / 100;
  const saturateVal = Math.max(0, 1 + grade.saturation / 100);
  const hueVal = grade.hue + grade.tint * 0.5;
  const blurVal = grade.blur > 0 ? `${grade.blur}px` : '0px';

  let filter = `brightness(${brightnessVal.toFixed(3)}) contrast(${contrastVal.toFixed(3)}) saturate(${saturateVal.toFixed(3)}) hue-rotate(${hueVal.toFixed(1)}deg)`;

  if (grade.temperature > 0) {
    filter += ` sepia(${(grade.temperature * 0.25).toFixed(2)}%)`;
  }

  if (grade.blur > 0) {
    filter += ` blur(${blurVal})`;
  }

  return filter;
}

/**
 * Applies procedural vignette & film grain onto HTML5 2D canvas context
 */
export function applyCanvasVignetteAndGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grade: ColorGrade
): void {
  // Vignette
  if (grade.vignette > 0) {
    const radius = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      radius * (1 - grade.vignette / 120),
      width / 2,
      height / 2,
      radius
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${(grade.vignette / 100).toFixed(2)})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // Film Grain
  if (grade.grain > 0) {
    const grainAlpha = Math.min(0.25, (grade.grain / 100) * 0.2);
    const step = 4;
    ctx.fillStyle = `rgba(255,255,255,${grainAlpha})`;
    for (let x = 0; x < width; x += step * 3) {
      for (let y = 0; y < height; y += step * 3) {
        if (Math.random() > 0.5) {
          ctx.fillRect(x + Math.random() * 2, y + Math.random() * 2, 2, 2);
        }
      }
    }
  }
}
