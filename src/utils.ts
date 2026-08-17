import type {Preset, VideoQuality} from './types.js';

export function isYouTubeUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)) return false;
    return host === 'youtu.be' ? url.pathname.length > 1 :
      url.pathname === '/watch' || url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/live/') || url.pathname.startsWith('/embed/');
  } catch { return false; }
}

export function downloadArgs(url: string, preset: Preset, outputTemplate: string, quality?: VideoQuality): string[] {
  const common = ['--no-playlist', '--newline', '--progress-template', 'download:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s', '-o', outputTemplate];
  return preset === 'mp3'
    ? [...common, '-x', '--audio-format', 'mp3', '--audio-quality', '320K', '--embed-metadata', '--', url]
    : [...common, '-f', quality ? `bv*[ext=mp4][height=${quality.height}]+ba[ext=m4a]/b[ext=mp4][height=${quality.height}]` : 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]', '--merge-output-format', 'mp4', '--embed-metadata', '--', url];
}

export function qualitiesFromFormats(formats: Array<{vcodec?: string; ext?: string; height?: number}>): VideoQuality[] {
  const heights = new Set(formats.filter(format => format.ext === 'mp4' && format.vcodec && format.vcodec !== 'none' && typeof format.height === 'number').map(format => format.height as number));
  return [...heights].sort((a, b) => a - b).map(height => ({height, label: `${height}p`}));
}

export function nearestQuality(requested: number, qualities: VideoQuality[]): VideoQuality | undefined {
  return qualities.reduce<VideoQuality | undefined>((closest, current) => !closest || Math.abs(current.height - requested) < Math.abs(closest.height - requested) ? current : closest, undefined);
}

export function parseProgress(line: string) {
  const matches = [...line.trim().matchAll(/([\d.]+)%\|([^|]*)\|([^|]*)/g)];
  const match = matches[matches.length - 1];
  return match ? {percent: Number(match[1]), speed: match[2].trim() || undefined, eta: match[3].trim() || undefined} : undefined;
}

export function jobTitle(url: string): string { try { return new URL(url).pathname; } catch { return url; } }
