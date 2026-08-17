import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanText, formatBytes, formatEta, formatRate, formatRelativeTime, lerp, ramp, truncate} from '../src/theme.js';

describe('lerp/ramp', () => {
  it('returns the boundary colors at t=0 and t=1', () => {
    expect(lerp('#000000', '#ffffff', 0)).toBe('#000000');
    expect(lerp('#000000', '#ffffff', 1)).toBe('#ffffff');
  });
  it('interpolates midpoint', () => expect(lerp('#000000', '#ffffff', 0.5)).toBe('#808080'));
  it('ramps through deep/mid/bright', () => {
    expect(ramp(0, '#000000', '#808080', '#ffffff')).toBe('#000000');
    expect(ramp(0.5, '#000000', '#808080', '#ffffff')).toBe('#808080');
    expect(ramp(1, '#000000', '#808080', '#ffffff')).toBe('#ffffff');
  });
});

describe('formatBytes', () => {
  it('formats byte tiers', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.00 KB');
    expect(formatBytes(1_960_000_000)).toBe('1.83 GB');
  });
});

describe('formatRate', () => {
  it('parses yt-dlp speed strings', () => {
    expect(formatRate('1.20MiB/s')).toBe('1.2 MB/s');
    expect(formatRate('853.4KiB/s')).toBe('853 KB/s');
  });
  it('falls back to the raw string when unparseable', () => expect(formatRate('weird')).toBe('weird'));
  it('handles missing input', () => expect(formatRate(undefined)).toBe('-'));
  it('treats yt-dlp "Unknown" speed as missing', () => expect(formatRate('Unknown B/s')).toBe('-'));
});

describe('formatEta', () => {
  it('parses mm:ss and h:mm:ss', () => {
    expect(formatEta('00:08')).toBe('8s');
    expect(formatEta('06:00')).toBe('6m');
    expect(formatEta('1:20:00')).toBe('1h 20m');
  });
  it('treats yt-dlp "Unknown" eta as missing', () => expect(formatEta('Unknown')).toBe('-'));
});

describe('formatRelativeTime', () => {
  beforeEach(() => vi.setSystemTime(new Date('2026-08-15T12:00:00Z')));
  afterEach(() => vi.useRealTimers());

  it('reports relative buckets', () => {
    expect(formatRelativeTime('2026-08-15T11:59:30Z')).toBe('now');
    expect(formatRelativeTime('2026-08-15T11:48:00Z')).toBe('12m ago');
    expect(formatRelativeTime('2026-08-15T10:40:00Z')).toBe('1hr 20m ago');
    expect(formatRelativeTime('2026-08-14T11:00:00Z')).toBe('1d 1hr ago');
    expect(formatRelativeTime('2026-05-15T12:00:00Z')).toBe('3mo ago');
    expect(formatRelativeTime('2024-08-15T12:00:00Z')).toBe('2y ago');
  });
});

describe('truncate/cleanText', () => {
  it('collapses repeated whitespace', () => expect(cleanText('a   b   c')).toBe('a b c'));
  it('strips control characters', () => expect(cleanText(`a${String.fromCharCode(7)}b`)).toBe('ab'));
  it('truncates with an ellipsis', () => expect(truncate('abcdefgh', 5)).toBe('abcd…'));
  it('leaves short strings unchanged', () => expect(truncate('abc', 5)).toBe('abc'));
});
