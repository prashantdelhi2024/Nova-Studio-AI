import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exportToSRT,
  exportToVTT,
  parseSRTorVTT,
  SubtitleSegment
} from '../src/services/audioAnalysis';

test('Audio Analysis - SRT export and parse roundtrip', () => {
  const segments: SubtitleSegment[] = [
    { start: 1.0, end: 3.5, text: 'First subtitle line' },
    { start: 4.2, end: 7.8, text: 'Second subtitle line with punctuation!' }
  ];

  const srtOutput = exportToSRT(segments);
  assert.ok(srtOutput.includes('00:00:01,000 --> 00:00:03,500'));
  assert.ok(srtOutput.includes('First subtitle line'));

  const parsed = parseSRTorVTT(srtOutput);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].start, 1.0);
  assert.equal(parsed[0].end, 3.5);
  assert.equal(parsed[0].text, 'First subtitle line');
});

test('Audio Analysis - VTT export and parse roundtrip', () => {
  const segments: SubtitleSegment[] = [
    { start: 0.5, end: 2.0, text: 'Introduction to NOVA Studio' }
  ];

  const vttOutput = exportToVTT(segments);
  assert.ok(vttOutput.startsWith('WEBVTT'));
  assert.ok(vttOutput.includes('00:00:00.500 --> 00:00:02.000'));

  const parsed = parseSRTorVTT(vttOutput);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].start, 0.5);
  assert.equal(parsed[0].end, 2.0);
  assert.equal(parsed[0].text, 'Introduction to NOVA Studio');
});
