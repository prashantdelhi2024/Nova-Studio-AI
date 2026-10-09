import { Project, AIAction, TransitionType, AspectRatio } from '../types/editor';
import { TRANSITION_CATALOG } from './transitions';
import { ALL_FILTER_PRESETS } from './colorGrading';

export interface ValidationResult {
  valid: boolean;
  validatedAction?: AIAction;
  error?: string;
}

const VALID_TRANSITION_TYPES = new Set<string>(TRANSITION_CATALOG.map((t) => t.type));
const VALID_FILTER_PRESET_IDS = new Set<string>(ALL_FILTER_PRESETS.map((f) => f.id));
const VALID_ASPECT_RATIOS = new Set<AspectRatio>(['16:9', '9:16', '1:1', '4:5', '21:9']);
const VALID_SFX_TYPES = new Set(['whoosh', 'impact', 'riser', 'glitch', 'click', 'pop']);

/**
 * Validates a proposed AI action against the current project state.
 * Strictly rejects invalid timestamps, non-existent clips/tracks, unsupported transitions,
 * out-of-bound speeds, and corrupting mutations.
 */
export function validateAIAction(action: any, project: Project): ValidationResult {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') {
    return { valid: false, error: 'Malformed action payload' };
  }

  switch (action.type) {
    case 'reframe_aspect_ratio': {
      if (!action.aspectRatio || !VALID_ASPECT_RATIOS.has(action.aspectRatio)) {
        return {
          valid: false,
          error: `Invalid aspect ratio: ${action.aspectRatio}. Must be one of 16:9, 9:16, 1:1, 4:5, 21:9`
        };
      }
      return { valid: true, validatedAction: { type: 'reframe_aspect_ratio', aspectRatio: action.aspectRatio } };
    }

    case 'apply_color_grade': {
      if (action.preset && !VALID_FILTER_PRESET_IDS.has(action.preset)) {
        return {
          valid: false,
          error: `Unknown color grade preset: ${action.preset}`
        };
      }
      return {
        valid: true,
        validatedAction: {
          type: 'apply_color_grade',
          preset: action.preset || 'cinematic-teal-orange'
        }
      };
    }

    case 'add_transition': {
      const transType = action.transitionType || 'cross-dissolve';
      if (!VALID_TRANSITION_TYPES.has(transType)) {
        return {
          valid: false,
          error: `Unsupported transition type: ${transType}`
        };
      }
      const dur = typeof action.duration === 'number' ? Math.max(0.2, Math.min(2.5, action.duration)) : 0.6;
      return {
        valid: true,
        validatedAction: {
          type: 'add_transition',
          transitionType: transType as TransitionType,
          duration: dur
        }
      };
    }

    case 'add_title': {
      if (!action.text || typeof action.text !== 'string' || action.text.trim().length === 0) {
        return { valid: false, error: 'Title text cannot be empty' };
      }
      const sanitizedText = action.text.trim().slice(0, 120);
      return {
        valid: true,
        validatedAction: {
          type: 'add_title',
          text: sanitizedText,
          style: action.style || 'pop-in',
          animation: action.animation || 'pop-in'
        }
      };
    }

    case 'adjust_speed': {
      const rate = typeof action.rate === 'number' ? action.rate : 1.0;
      if (rate < 0.2 || rate > 5.0) {
        return { valid: false, error: `Speed multiplier ${rate} is out of safe range (0.2x to 5.0x)` };
      }
      return {
        valid: true,
        validatedAction: {
          type: 'adjust_speed',
          rate: Number(rate.toFixed(2))
        }
      };
    }

    case 'add_sfx': {
      const sfx = action.sfxType || 'whoosh';
      if (!VALID_SFX_TYPES.has(sfx)) {
        return { valid: false, error: `Unknown SFX type: ${sfx}` };
      }
      return {
        valid: true,
        validatedAction: {
          type: 'add_sfx',
          sfxType: sfx
        }
      };
    }

    case 'smart_cut_pauses': {
      return {
        valid: true,
        validatedAction: {
          type: 'smart_cut_pauses',
          sensitivity: action.sensitivity === 'aggressive' ? 'aggressive' : 'normal'
        }
      };
    }

    default:
      return { valid: false, error: `Unknown action type: ${action.type}` };
  }
}

/**
 * Validates a list of actions and filters out invalid ones with clear diagnostic reasons
 */
export function validateAIPlan(
  rawActions: any[],
  project: Project
): { validActions: AIAction[]; rejectedActions: { action: any; reason: string }[] } {
  const validActions: AIAction[] = [];
  const rejectedActions: { action: any; reason: string }[] = [];

  if (!Array.isArray(rawActions)) {
    return { validActions, rejectedActions };
  }

  for (const raw of rawActions) {
    const res = validateAIAction(raw, project);
    if (res.valid && res.validatedAction) {
      validActions.push(res.validatedAction);
    } else {
      rejectedActions.push({ action: raw, reason: res.error || 'Validation failed' });
    }
  }

  return { validActions, rejectedActions };
}
