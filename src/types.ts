export type Preset = 'mp3' | 'mp4';
export type JobStatus = 'queued' | 'fetching' | 'downloading' | 'completed' | 'failed' | 'cancelled';

export interface VideoQuality { height: number; label: string; }
export interface VideoMetadata { title: string; duration?: number; uploader?: string; thumbnail?: string; qualities: VideoQuality[]; }
export interface DownloadProgress { percent: number; speed?: string; eta?: string; }
export interface DownloadJob {
  id: string; url: string; preset: Preset; status: JobStatus; createdAt: string;
  metadata?: VideoMetadata; quality?: VideoQuality; resolvedQuality?: string; outputPath?: string; error?: string; progress?: DownloadProgress;
}
export interface AppSettings { audioDirectory: string; videoDirectory: string; }
export interface AppState { settings: AppSettings; history: DownloadJob[]; }
