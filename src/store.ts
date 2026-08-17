import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import type {AppSettings, AppState, DownloadJob} from './types.js';

export const appDirectory = join(process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state'), 'yt-dlp-tui');
export const statePath = join(appDirectory, 'state.json');
export const defaultSettings: AppSettings = {audioDirectory: join(homedir(), 'Music'), videoDirectory: join(homedir(), 'Videos')};

export async function loadState(): Promise<AppState> {
  try {
    const parsed = JSON.parse(await readFile(statePath, 'utf8')) as Partial<AppState>;
    return {settings: {...defaultSettings, ...parsed.settings}, history: Array.isArray(parsed.history) ? parsed.history : []};
  } catch { return {settings: defaultSettings, history: []}; }
}
export async function saveState(settings: AppSettings, history: DownloadJob[]) {
  await mkdir(appDirectory, {recursive: true});
  await writeFile(statePath, JSON.stringify({settings, history: history.slice(0, 100)}, null, 2) + '\n', 'utf8');
}
