import test from 'node:test';
import assert from 'node:assert/strict';
import { TRANSITION_CATALOG, renderTransitionEffect } from '../src/services/transitions';
import { TransitionType } from '../src/types/editor';

// Minimal mock 2D canvas context for testing
function createMockCanvasContext() {
  const operations: string[] = [];
  return {
    operations,
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    fillRect: (x: number, y: number, w: number, h: number) => operations.push(`fillRect(${x},${y},${w},${h})`),
    strokeRect: (x: number, y: number, w: number, h: number) => operations.push(`strokeRect(${x},${y},${w},${h})`),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    createLinearGradient: () => ({
      addColorStop: () => {}
    }),
    createRadialGradient: () => ({
      addColorStop: () => {}
    })
  } as unknown as CanvasRenderingContext2D;
}

test('Transitions - All catalog transitions are registered with metadata', () => {
  assert.ok(TRANSITION_CATALOG.length >= 15);
  const types = TRANSITION_CATALOG.map((t) => t.type);

  assert.ok(types.includes('cross-dissolve'));
  assert.ok(types.includes('fade-black'));
  assert.ok(types.includes('fade-white'));
  assert.ok(types.includes('whip-pan'));
  assert.ok(types.includes('film-burn'));
  assert.ok(types.includes('light-leak'));
  assert.ok(types.includes('glitch'));
  assert.ok(types.includes('zoom-in'));
  assert.ok(types.includes('zoom-out'));
  assert.ok(types.includes('rgb-split'));
  assert.ok(types.includes('blur-dissolve'));
  assert.ok(types.includes('flash'));
  assert.ok(types.includes('slide-left'));
  assert.ok(types.includes('slide-right'));
  assert.ok(types.includes('wipe'));
});

test('Transitions - Start (0.0) and end (1.0) boundary clamping produces no op', () => {
  const ctx = createMockCanvasContext();
  renderTransitionEffect(ctx, 1920, 1080, 'fade-black', 0.0);
  assert.equal((ctx as any).operations.length, 0);

  renderTransitionEffect(ctx, 1920, 1080, 'fade-black', 1.0);
  assert.equal((ctx as any).operations.length, 0);
});

test('Transitions - Midpoint (0.5) renders visual operations for all transitions', () => {
  const catalogTypes: TransitionType[] = [
    'cross-dissolve',
    'fade-black',
    'fade-white',
    'whip-pan',
    'film-burn',
    'light-leak',
    'glitch',
    'zoom-in',
    'zoom-out',
    'rgb-split',
    'blur-dissolve',
    'flash',
    'slide-left',
    'slide-right',
    'wipe'
  ];

  for (const type of catalogTypes) {
    const ctx = createMockCanvasContext();
    renderTransitionEffect(ctx, 1920, 1080, type, 0.5);
    // Should have called save and restore around drawing
    const ops = (ctx as any).operations;
    assert.ok(ops.includes('save'), `Missing save() for transition ${type}`);
    assert.ok(ops.includes('restore'), `Missing restore() for transition ${type}`);
  }
});
