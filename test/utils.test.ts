import {describe, expect, it} from 'vitest';
import {downloadArgs, isYouTubeUrl, nearestQuality, parseProgress, qualitiesFromFormats} from '../src/utils.js';

describe('isYouTubeUrl', () => {
  it('accepts supported public YouTube URL shapes', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isYouTubeUrl('https://youtu.be/abc')).toBe(true);
    expect(isYouTubeUrl('https://youtube.com/shorts/abc')).toBe(true);
  });
  it('rejects non-YouTube and playlist URLs', () => {
    expect(isYouTubeUrl('https://example.com/watch?v=abc')).toBe(false);
    expect(isYouTubeUrl('https://youtube.com/playlist?list=abc')).toBe(false);
  });
});

describe('downloadArgs', () => {
  it('creates a high-quality MP3 command', () => {
    const args = downloadArgs('https://youtu.be/abc', 'mp3', '/tmp/%(title)s.%(ext)s');
    expect(args).toContain('--audio-format'); expect(args).toContain('mp3'); expect(args).toContain('320K');
  });
  it('creates a merged MP4 command', () => {
    const args = downloadArgs('https://youtu.be/abc', 'mp4', '/tmp/%(title)s.%(ext)s');
    expect(args).toContain('--merge-output-format'); expect(args).toContain('mp4');
  });
  it('targets a selected MP4 resolution', () => {
    const args = downloadArgs('https://youtu.be/abc', 'mp4', '/tmp/%(title)s.%(ext)s', {height: 720, label: '720p'});
    expect(args).toContain('bv*[ext=mp4][height=720]+ba[ext=m4a]/b[ext=mp4][height=720]');
  });
});

describe('video qualities', () => {
  const qualities = qualitiesFromFormats([
    {ext: 'mp4', vcodec: 'avc1', height: 1080}, {ext: 'webm', vcodec: 'vp9', height: 2160},
    {ext: 'mp4', vcodec: 'avc1', height: 720}, {ext: 'mp4', vcodec: 'avc1', height: 720}, {ext: 'mp4', vcodec: 'none', height: 480},
  ]);
  it('returns distinct sorted MP4 video tiers', () => expect(qualities).toEqual([{height: 720, label: '720p'}, {height: 1080, label: '1080p'}]));
  it('uses the numerically nearest tier for a missing request', () => expect(nearestQuality(900, qualities)).toEqual({height: 720, label: '720p'}));
});

describe('parseProgress', () => {
  it('reads yt-dlp progress-template output', () => {
    expect(parseProgress('  42.3%|1.20MiB/s|00:08')).toEqual({percent: 42.3, speed: '1.20MiB/s', eta: '00:08'});
  });
  it('handles unknown speed/eta fields', () => {
    expect(parseProgress('  0.0%| Unknown B/s|Unknown')).toEqual({percent: 0, speed: 'Unknown B/s', eta: 'Unknown'});
  });
  it('takes the latest reading when multiple carriage-return frames got concatenated', () => {
    expect(parseProgress('  0.0%|1.00MiB/s|10:00\r 45.0%|2.00MiB/s|05:00\r 92.5%|3.00MiB/s|00:10'))
      .toEqual({percent: 92.5, speed: '3.00MiB/s', eta: '00:10'});
  });
});
