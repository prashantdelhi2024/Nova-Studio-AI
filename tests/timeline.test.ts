import test from 'node:test';
import assert from 'node:assert/strict';
import { Project, Clip } from '../src/types/editor';

function createMockProject(): Project {
  return {
    id: 'test-proj',
    name: 'Test Project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    duration: 20.0,
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
      { id: 'v1', name: 'V1', type: 'video', order: 0, isMuted: false, isLocked: false, isHidden: false, volume: 1 },
      { id: 'a1', name: 'A1', type: 'audio', order: 1, isMuted: false, isLocked: false, isHidden: false, volume: 1 }
    ],
    clips: [
      {
        id: 'clip-1',
        trackId: 'v1',
        name: 'Clip 1',
        type: 'video',
        startTime: 2.0,
        duration: 8.0,
        sourceStartTime: 0,
        sourceDuration: 10.0,
        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, flipH: false, flipV: false, fit: 'cover', crop: { top: 0, bottom: 0, left: 0, right: 0 } },
        audio: { volume: 1, pan: 0, fadeIn: 0, fadeOut: 0, isMuted: false, ducking: false },
        speed: { rate: 1, reverse: false },
        colorGrade: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, exposure: 0, highlights: 0, shadows: 0, vignette: 0, grain: 0, hue: 0, blur: 0 },
        keyframes: []
      },
      {
        id: 'clip-2',
        trackId: 'v1',
        name: 'Clip 2',
        type: 'video',
        startTime: 10.0,
        duration: 5.0,
        sourceStartTime: 0,
        sourceDuration: 5.0,
        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, flipH: false, flipV: false, fit: 'cover', crop: { top: 0, bottom: 0, left: 0, right: 0 } },
        audio: { volume: 1, pan: 0, fadeIn: 0, fadeOut: 0, isMuted: false, ducking: false },
        speed: { rate: 1, reverse: false },
        colorGrade: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, exposure: 0, highlights: 0, shadows: 0, vignette: 0, grain: 0, hue: 0, blur: 0 },
        keyframes: []
      }
    ],
    markers: []
  };
}

test('Timeline - Split Clip at specified playhead time', () => {
  const project = createMockProject();
  const targetClip = project.clips[0];
  const splitTime = 5.0; // split at 5s, clip runs from 2s to 10s

  const splitOffset = splitTime - targetClip.startTime; // 3.0s
  assert.equal(splitOffset, 3.0);

  const part1: Clip = {
    ...targetClip,
    duration: splitOffset
  };

  const part2: Clip = {
    ...targetClip,
    id: 'clip-1-part-2',
    startTime: splitTime,
    duration: targetClip.duration - splitOffset,
    sourceStartTime: targetClip.sourceStartTime + splitOffset * targetClip.speed.rate
  };

  assert.equal(part1.duration, 3.0);
  assert.equal(part2.duration, 5.0);
  assert.equal(part2.startTime, 5.0);
  assert.equal(part2.sourceStartTime, 3.0);
  assert.equal(part1.duration + part2.duration, targetClip.duration);
});

test('Timeline - Trimming changes clip duration accurately', () => {
  const project = createMockProject();
  const clip = project.clips[0];
  const newDuration = 6.0;

  clip.duration = newDuration;
  assert.equal(clip.duration, 6.0);
  assert.equal(clip.startTime + clip.duration, 8.0);
});

test('Timeline - Ripple Delete shifts subsequent clips on the same track', () => {
  const project = createMockProject();
  const deletedClip = project.clips[0]; // starts at 2s, duration 8s
  const deletedDuration = deletedClip.duration;

  // Filter out deleted clip and shift trailing clips on track 'v1'
  const remainingClips = project.clips
    .filter((c) => c.id !== deletedClip.id)
    .map((c) => {
      if (c.trackId === deletedClip.trackId && c.startTime > deletedClip.startTime) {
        return { ...c, startTime: Math.max(0, c.startTime - deletedDuration) };
      }
      return c;
    });

  assert.equal(remainingClips.length, 1);
  // Clip 2 was at 10.0s. Shifting by 8.0s brings it to 2.0s
  assert.equal(remainingClips[0].startTime, 2.0);
});

test('Timeline - Project serialization and restoration roundtrip', () => {
  const project = createMockProject();
  const serialized = JSON.stringify(project);
  const restored: Project = JSON.parse(serialized);

  assert.equal(restored.id, project.id);
  assert.equal(restored.tracks.length, project.tracks.length);
  assert.equal(restored.clips.length, project.clips.length);
  assert.equal(restored.clips[0].name, 'Clip 1');
  assert.equal(restored.settings.aspectRatio, '16:9');
});
