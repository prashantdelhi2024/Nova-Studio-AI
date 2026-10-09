import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAIAction, validateAIPlan } from '../src/services/aiValidation';
import { Project } from '../src/types/editor';

const mockProject: Project = {
  id: 'proj-1',
  name: 'Test Project',
  createdAt: 0,
  updatedAt: 0,
  duration: 15.0,
  settings: {
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
    fps: 30,
    sampleRate: 48000,
    snapToGrid: true,
    previewQuality: 'auto'
  },
  tracks: [],
  clips: [],
  markers: []
};

test('AI Validation - Reframe Aspect Ratio', () => {
  const valid = validateAIAction({ type: 'reframe_aspect_ratio', aspectRatio: '9:16' }, mockProject);
  assert.equal(valid.valid, true);
  assert.equal(valid.validatedAction?.aspectRatio, '9:16');

  const invalid = validateAIAction({ type: 'reframe_aspect_ratio', aspectRatio: 'invalid-ratio' }, mockProject);
  assert.equal(invalid.valid, false);
});

test('AI Validation - Color Grade Presets', () => {
  const valid = validateAIAction({ type: 'apply_color_grade', preset: 'cinematic-teal-orange' }, mockProject);
  assert.equal(valid.valid, true);

  const invalid = validateAIAction({ type: 'apply_color_grade', preset: 'non-existent-preset-xyz' }, mockProject);
  assert.equal(invalid.valid, false);
});

test('AI Validation - Transitions', () => {
  const valid = validateAIAction({ type: 'add_transition', transitionType: 'whip-pan', duration: 0.5 }, mockProject);
  assert.equal(valid.valid, true);

  const invalid = validateAIAction({ type: 'add_transition', transitionType: 'unsupported-3d-flip' }, mockProject);
  assert.equal(invalid.valid, false);
});

test('AI Validation - Speed Adjustment Limits', () => {
  const valid = validateAIAction({ type: 'adjust_speed', rate: 2.0 }, mockProject);
  assert.equal(valid.valid, true);

  const tooFast = validateAIAction({ type: 'adjust_speed', rate: 50.0 }, mockProject);
  assert.equal(tooFast.valid, false);

  const tooSlow = validateAIAction({ type: 'adjust_speed', rate: 0.05 }, mockProject);
  assert.equal(tooSlow.valid, false);
});

test('AI Validation - Plan Batch Filtering', () => {
  const plan = [
    { type: 'reframe_aspect_ratio', aspectRatio: '9:16' },
    { type: 'adjust_speed', rate: 99.0 }, // invalid
    { type: 'add_title', text: 'HELLO WORLD' }
  ];

  const result = validateAIPlan(plan, mockProject);
  assert.equal(result.validActions.length, 2);
  assert.equal(result.rejectedActions.length, 1);
  assert.ok(result.rejectedActions[0].reason.includes('out of safe range'));
});
