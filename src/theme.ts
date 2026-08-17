export const colors = {
  accent: '#a78bfa',
  bright: '#d8b4fe',
  text: '#e9e4f5',
  alt: '#b9a7e6',
  good: '#86d6a2',
  warn: '#f0c560',
  bad: '#ee7d92',
  rule: '#6b6577',
  muted: '#7c7785',
  deep: '#7c5cd6',
  sheen: '#f4efff',
} as const;

export const icons = {
  done: '✓',
  error: '✗',
  pending: '·',
  pointer: '❯',
  dot: '·',
  warn: '⚠',
  bar: '▌',
  down: '↓',
  up: '↑',
  pause: '⏸',
} as const;

export const SEP = '  ·  ';

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)));
  return `#${[r, g, b].map(channel => clamp(channel).toString(16).padStart(2, '0')).join('')}`;
}

export function lerp(hexA: string, hexB: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const a = parseHex(hexA); const b = parseHex(hexB);
  return toHex([a[0] + (b[0] - a[0]) * clamped, a[1] + (b[1] - a[1]) * clamped, a[2] + (b[2] - a[2]) * clamped]);
}

export function ramp(t: number, deep: string, mid: string, bright: string): string {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5 ? lerp(deep, mid, clamped * 2) : lerp(mid, bright, (clamped - 0.5) * 2);
}

export function cleanText(value: string): string {
  return value.replace(/[\x00-\x1F\x7F]/g, '').replace(/\s+/g, ' ').trim();
}

export function truncate(value: string, max: number): string {
  const clean = cleanText(value);
  return clean.length > max ? `${clean.slice(0, Math.max(1, max - 1))}…` : clean;
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function parseTimecode(raw: string): number | undefined {
  const parts = raw.trim().split(':').map(Number);
  if (parts.some(Number.isNaN) || parts.length === 0) return undefined;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function formatEta(raw?: string): string {
  if (!raw || raw.toLowerCase() === 'unknown') return '-';
  const totalSeconds = parseTimecode(raw);
  if (totalSeconds === undefined) return raw;
  if (totalSeconds <= 0) return '0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const tiers = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024; let tier = 0;
  while (value >= 1024 && tier < tiers.length - 1) { value /= 1024; tier += 1; }
  return `${value.toFixed(2)} ${tiers[tier]}`;
}

export function formatRate(raw?: string): string {
  if (!raw || raw.toLowerCase().startsWith('unknown')) return '-';
  const match = /^([\d.]+)\s*(B|KiB|MiB|GiB)\/s$/i.exec(raw.trim());
  if (!match) return raw;
  const multiplier: Record<string, number> = {b: 1, kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3};
  const bytesPerSecond = Number(match[1]) * multiplier[match[2].toLowerCase()];
  const tiers: Array<[number, string]> = [[1024 ** 3, 'GB/s'], [1024 ** 2, 'MB/s'], [1024, 'KB/s']];
  for (const [divisor, unit] of tiers) {
    if (bytesPerSecond >= divisor) {
      const value = bytesPerSecond / divisor;
      return `${value.toFixed(value < 10 ? 1 : 0)} ${unit}`;
    }
  }
  return `${Math.round(bytesPerSecond)} B/s`;
}

export const statusColor: Record<string, string> = {
  queued: colors.muted,
  fetching: colors.accent,
  downloading: colors.accent,
  completed: colors.good,
  failed: colors.bad,
  cancelled: colors.muted,
};

export const statusLabel: Record<string, string> = {
  queued: 'Queued',
  fetching: 'Refreshing',
  downloading: 'Downloading',
  completed: 'Complete',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '-';
  const diff = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}hr ${Math.floor((diff % 3600) / 60)}m ago`;
  if (diff < 30 * 86400) return `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}hr ago`;
  if (diff < 365 * 86400) return `${Math.floor(diff / (30 * 86400))}mo ago`;
  return `${Math.floor(diff / (365 * 86400))}y ago`;
}
