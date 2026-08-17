import {spawn, type ChildProcess} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {AppSettings, DownloadJob, Preset, VideoMetadata} from './types.js';
import {downloadArgs, parseProgress, qualitiesFromFormats} from './utils.js';

function run(command: string, args: string[]) {
  return new Promise<{stdout: string; stderr: string; code: number}>((resolve, reject) => {
    const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']}); let stdout = ''; let stderr = '';
    child.stdout.on('data', d => stdout += d); child.stderr.on('data', d => stderr += d);
    child.on('error', reject); child.on('close', code => resolve({stdout, stderr, code: code ?? 1}));
  });
}

export async function checkDependencies(): Promise<string[]> {
  const missing: string[] = [];
  for (const binary of ['yt-dlp', 'ffmpeg']) {
    try { await run(binary, ['--version']); } catch { missing.push(binary); }
  }
  return missing;
}

export async function inspectVideo(url: string): Promise<VideoMetadata> {
  const result = await run('yt-dlp', ['--no-playlist', '--skip-download', '--dump-single-json', '--', url]);
  if (result.code !== 0) throw new Error(result.stderr.trim() || 'yt-dlp could not read this video.');
  const item = JSON.parse(result.stdout) as {title?: string; duration?: number; uploader?: string; thumbnail?: string; formats?: Array<{vcodec?: string; ext?: string; height?: number}>};
  return {title: item.title || 'Untitled video', duration: item.duration, uploader: item.uploader, thumbnail: item.thumbnail, qualities: qualitiesFromFormats(item.formats || [])};
}

export class DownloadRunner {
  private processes = new Map<string, ChildProcess>();
  constructor(private readonly settings: () => AppSettings, private readonly update: (job: DownloadJob) => void) {}
  create(url: string, preset: Preset): DownloadJob { return {id: randomUUID(), url, preset, status: 'queued', createdAt: new Date().toISOString()}; }
  cancel(id: string) { this.processes.get(id)?.kill('SIGTERM'); }
  async start(job: DownloadJob, attempt = 0): Promise<DownloadJob> {
    const destination = job.preset === 'mp3' ? this.settings().audioDirectory : this.settings().videoDirectory;
    await mkdir(destination, {recursive: true});
    const template = join(destination, '%(title)s [%(id)s].%(ext)s');
    job.status = 'downloading'; job.error = undefined; job.progress = {percent: 0}; this.update(job);
    return new Promise(resolve => {
      // `downloadArgs` deliberately ends with `-- <url>` so URLs beginning with
      // a dash cannot become options. Add further yt-dlp options before that marker.
      const baseArgs = downloadArgs(job.url, job.preset, template, job.quality);
      const args = [...baseArgs.slice(0, -2), '--print', 'after_move:__YTUI_OUTPUT__%(filepath)s', '--', job.url];
      const child = spawn('yt-dlp', args, {stdio: ['ignore', 'pipe', 'pipe']}); this.processes.set(job.id, child);
      let remainder = ''; let stderr = ''; let outputPath: string | undefined;
      const consume = (data: Buffer) => {
        remainder += data.toString(); const lines = remainder.split(/\r\n|\r|\n/); remainder = lines.pop() || '';
        for (const line of lines) {
          const p = parseProgress(line); if (p) { job.progress = p; this.update(job); }
          if (line.startsWith('__YTUI_OUTPUT__')) outputPath = line.slice(15).trim();
        }
      };
      child.stdout.on('data', consume); child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); consume(d); });
      child.on('error', error => { job.status = 'failed'; job.error = error.message; this.processes.delete(job.id); this.update(job); resolve(job); });
      child.on('close', code => {
        this.processes.delete(job.id);
        if (code === 0) { job.status = 'completed'; job.progress = {percent: 100}; job.outputPath = outputPath; }
        else if (job.status !== 'cancelled') {
          const failure = stderr.trim().split('\n').slice(-1)[0] || `yt-dlp exited with code ${code}`;
          // YouTube's signed media URLs can occasionally be rejected once (HTTP 403).
          // A fresh extraction is the least invasive recovery and avoids requiring cookies.
          if (attempt === 0 && /HTTP Error 403|HTTP Error 429/.test(stderr)) {
            job.status = 'fetching'; job.progress = {percent: 0}; this.update(job);
            setTimeout(() => { void this.start(job, 1).then(resolve); }, 1000);
            return;
          }
          job.status = 'failed';
          job.error = /HTTP Error 403/.test(failure)
            ? 'YouTube denied this media request (HTTP 403). Retry later, update yt-dlp, or use a public video that does not require sign-in.'
            : failure;
        }
        this.update(job); resolve(job);
      });
    });
  }
}
