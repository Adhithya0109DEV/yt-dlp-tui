import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import type {AppSettings, DownloadJob, Preset, VideoMetadata} from './types.js';
import {DownloadRunner, inspectVideo} from './downloader.js';
import {isYouTubeUrl, nearestQuality} from './utils.js';
import {saveState} from './store.js';
import {colors, formatDuration, formatEta, formatRate, formatRelativeTime, icons, SEP, truncate} from './theme.js';
import {useTerminalSize} from './hooks/useTerminalSize.js';
import {Panel, Rule} from './components/Panel.js';
import {Status} from './components/Status.js';
import {ProgressBar} from './components/ProgressBar.js';
import {Spinner} from './components/Spinner.js';
import {Key} from './components/Key.js';
import {Table, type Column} from './components/Table.js';
import {TextField} from './components/TextField.js';
import {HelpOverlay, type HelpGroup} from './components/HelpOverlay.js';

type Screen = 'dashboard' | 'mode' | 'quality' | 'history' | 'settings' | 'error' | 'help';
type Focus = 'url' | 'queue';
type Tone = 'good' | 'bad' | 'muted';
interface Message { text: string; tone: Tone; }

const label = (preset: Preset) => preset === 'mp3' ? 'MP3 audio · 320 kbps' : 'MP4 video · best quality';

function messageColor(tone: Tone): string {
  return tone === 'good' ? colors.good : tone === 'bad' ? colors.bad : colors.muted;
}

function getHints(screen: Screen, focus: Focus): Array<{key: string; label: string}> {
  if (screen === 'dashboard') {
    return focus === 'url'
      ? [{key: 'Enter', label: 'inspect & choose format'}, {key: 'Tab', label: 'queue controls'}, {key: '?', label: 'help'}, {key: 'Ctrl+C', label: 'quit'}]
      : [{key: 'a', label: 'add'}, {key: 'c', label: 'cancel'}, {key: 'r', label: 'retry'}, {key: 'd', label: 'error details'}, {key: 'h', label: 'history'}, {key: 's', label: 'settings'}, {key: '?', label: 'help'}, {key: 'q', label: 'quit'}];
  }
  if (screen === 'mode') return [{key: '↑↓', label: 'select'}, {key: 'Enter', label: 'continue'}, {key: '?', label: 'help'}, {key: 'Esc', label: 'cancel'}];
  if (screen === 'quality') return [{key: '↑↓', label: 'select'}, {key: 'Enter', label: 'queue download'}, {key: '?', label: 'help'}, {key: 'Esc', label: 'back'}];
  if (screen === 'history') return [{key: '?', label: 'help'}, {key: 'Esc', label: 'return'}];
  if (screen === 'settings') return [{key: 'Tab/↑↓', label: 'switch'}, {key: '^u', label: 'clear'}, {key: 'Esc', label: 'save'}];
  if (screen === 'error') return [{key: 'r', label: 'retry'}, {key: '?', label: 'help'}, {key: 'Esc', label: 'return'}];
  return [{key: 'any key', label: 'close'}];
}

export function App({initialSettings, initialHistory, missing, initialUrl}: {initialSettings: AppSettings; initialHistory: DownloadJob[]; missing: string[]; initialUrl?: string}) {
  const {exit} = useApp();
  const {columns, compact, compactHeight, hideFooter} = useTerminalSize();
  const frameWidth = Math.max(20, Math.min(columns - 2, 110));

  const [screen, setScreen] = useState<Screen>('dashboard');
  const [previousScreen, setPreviousScreen] = useState<Screen>('dashboard');
  const [focus, setFocus] = useState<Focus>('url');
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState<Message>({text: 'Paste a public YouTube URL to begin.', tone: 'muted'});
  const [metadata, setMetadata] = useState<VideoMetadata>(); const [modeIndex, setModeIndex] = useState(0); const [qualityIndex, setQualityIndex] = useState(0);
  const [jobs, setJobs] = useState<DownloadJob[]>([]); const [history, setHistory] = useState(initialHistory);
  const [settings, setSettings] = useState(initialSettings); const [settingsField, setSettingsField] = useState<'audioDirectory' | 'videoDirectory'>('audioDirectory');
  const [errorJob, setErrorJob] = useState<DownloadJob>();
  const busy = useRef(false); const settingsRef = useRef(settings); settingsRef.current = settings;
  const runner = useMemo(() => new DownloadRunner(() => settingsRef.current, update => {
    setJobs(current => current.map(job => job.id === update.id ? {...update} : job));
    if (['completed', 'failed', 'cancelled'].includes(update.status)) setHistory(current => [{...update}, ...current.filter(job => job.id !== update.id)].slice(0, 100));
  }), []);

  useEffect(() => { void saveState(settings, history); }, [settings, history]);
  useEffect(() => {
    if (busy.current) return; const next = jobs.find(job => job.status === 'queued'); if (!next) return;
    busy.current = true; void runner.start(next).finally(() => { busy.current = false; setJobs(current => [...current]); });
  }, [jobs, runner]);

  useEffect(() => {
    if (initialUrl && isYouTubeUrl(initialUrl)) {
      setUrl(initialUrl);
      setMessage({text: 'Reading video details…', tone: 'muted'});
      void inspectVideo(initialUrl.trim()).then(data => { setMetadata(data); setModeIndex(0); setScreen('mode'); })
        .catch(error => setMessage({text: error instanceof Error ? error.message : 'Unable to read video details.', tone: 'bad'}));
    }
  }, [initialUrl]);

  const submitUrl = () => {
    if (!isYouTubeUrl(url)) return setMessage({text: 'Use a public YouTube watch, short, live, or youtu.be URL.', tone: 'bad'});
    setMessage({text: 'Reading video details…', tone: 'muted'});
    void inspectVideo(url.trim()).then(data => { setMetadata(data); setModeIndex(0); setScreen('mode'); })
      .catch(error => setMessage({text: error instanceof Error ? error.message : 'Unable to read video details.', tone: 'bad'}));
  };
  const cancel = () => {
    const active = jobs.find(job => job.status === 'downloading' || job.status === 'fetching');
    if (!active) return setMessage({text: 'There is no active download to cancel.', tone: 'muted'});
    active.status = 'cancelled'; runner.cancel(active.id); setJobs(current => current.map(job => job.id === active.id ? {...active} : job));
  };
  const retry = () => { const last = jobs.find(job => job.status === 'failed'); if (last) setJobs(current => current.map(job => job.id === last.id ? {...job, status: 'queued', error: undefined, progress: undefined} : job)); };
  const openHelp = (from: Screen) => { setPreviousScreen(from); setScreen('help'); };

  useInput((input, key) => {
    if (key.ctrl && input === 'c') return exit();
    if (missing.length) { if (input === 'q' || key.escape) exit(); return; }
    if (screen === 'help') { setScreen(previousScreen); return; }
    if (screen === 'dashboard') {
      if (key.tab) return setFocus(current => current === 'url' ? 'queue' : 'url');
      if (focus === 'url') {
        if (key.return) submitUrl();
        else if (key.ctrl && input === 'u') setUrl('');
        else if (key.backspace || key.delete) setUrl(current => current.slice(0, -1));
        else if (input && !key.ctrl && !key.meta) setUrl(current => current + input);
      } else {
        if (input === 'a') { setFocus('url'); setMessage({text: 'Paste a public YouTube URL to begin.', tone: 'muted'}); }
        else if (input === 'c') cancel(); else if (input === 'r') retry(); else if (input === 'h') setScreen('history'); else if (input === 's') setScreen('settings');
        else if (input === 'd') { const failed = jobs.find(job => job.status === 'failed'); if (failed) { setErrorJob(failed); setScreen('error'); } }
        else if (input === '?') openHelp('dashboard');
        else if (input === 'q' || key.escape) exit();
      }
    } else if (screen === 'mode') {
      if (key.upArrow || key.downArrow) setModeIndex(current => current === 0 ? 1 : 0);
      else if (key.escape) setScreen('dashboard');
      else if (input === '?') openHelp('mode');
      else if (key.return && metadata) {
        if (modeIndex === 1) { setQualityIndex(0); setScreen('quality'); }
        else { const job = runner.create(url.trim(), 'mp3'); job.metadata = metadata; job.resolvedQuality = 'MP3 audio · 320 kbps'; setJobs(current => [...current, job]); setUrl(''); setMetadata(undefined); setMessage({text: 'Added to queue.', tone: 'good'}); setFocus('queue'); setScreen('dashboard'); }
      }
    } else if (screen === 'quality' && metadata) {
      const choices = [undefined, ...metadata.qualities];
      if (key.upArrow) setQualityIndex(current => (current - 1 + choices.length) % choices.length);
      else if (key.downArrow) setQualityIndex(current => (current + 1) % choices.length);
      else if (key.escape) setScreen('mode');
      else if (input === '?') openHelp('quality');
      else if (key.return) { const requested = choices[qualityIndex]; const quality = requested ? nearestQuality(requested.height, metadata.qualities) : undefined; const job = runner.create(url.trim(), 'mp4'); job.metadata = metadata; job.quality = quality; job.resolvedQuality = quality?.label || 'Best available MP4'; setJobs(current => [...current, job]); setUrl(''); setMetadata(undefined); setMessage({text: 'Added to queue.', tone: 'good'}); setFocus('queue'); setScreen('dashboard'); }
    } else if (screen === 'history') {
      if (key.escape || input === 'q') setScreen('dashboard'); else if (input === '?') openHelp('history');
    } else if (screen === 'error') {
      if (key.escape || input === 'q') setScreen('dashboard'); else if (input === 'r') { retry(); setScreen('dashboard'); } else if (input === '?') openHelp('error');
    } else if (screen === 'settings') {
      if (key.escape) setScreen('dashboard'); else if (key.tab || key.upArrow || key.downArrow) setSettingsField(current => current === 'audioDirectory' ? 'videoDirectory' : 'audioDirectory');
      else if (key.ctrl && input === 'u') setSettings(current => ({...current, [settingsField]: ''}));
      else if (key.backspace || key.delete) setSettings(current => ({...current, [settingsField]: current[settingsField].slice(0, -1)}));
      else if (input && !key.ctrl && !key.meta) setSettings(current => ({...current, [settingsField]: current[settingsField] + input}));
    }
  });

  const active = jobs.find(job => job.status === 'downloading' || job.status === 'fetching');
  const recent = jobs.slice(-5).reverse();

  const queueColumns: Column<DownloadJob>[] = [
    {label: 'Status', width: 13, render: job => <Status status={job.status}/>},
    {label: 'Name', width: compact ? 26 : 58, render: job => truncate(job.metadata?.title || job.url, compact ? 26 : 58)},
    ...(compact ? [] : [{label: 'Info', width: 10, align: 'right' as const, render: (job: DownloadJob) => job.progress ? `${job.progress.percent.toFixed(0)}%` : (job.resolvedQuality || label(job.preset))}]),
  ];
  const historyColumns: Column<DownloadJob>[] = [
    {label: 'Status', width: 13, render: job => <Status status={job.status}/>},
    {label: 'Name', width: compact ? 36 : 66, render: job => truncate(job.metadata?.title || job.url, compact ? 36 : 66)},
    {label: 'When', width: 12, align: 'right', render: job => formatRelativeTime(job.createdAt)},
  ];

  const hints = getHints(screen, focus);
  const footer = <>{hints.map((hint, index) => <React.Fragment key={hint.key}>{index > 0 && <Text dimColor>{SEP}</Text>}<Key>{hint.key}</Key><Text dimColor> {hint.label}</Text></React.Fragment>)}</>;
  const helpGroups: HelpGroup[] = [{title: screen === 'help' ? previousScreen : screen, hints: getHints(screen === 'help' ? previousScreen : screen, focus)}];

  return <Box flexDirection="column" paddingX={compact ? 0 : 2}>
    <Box justifyContent="space-between">
      <Text color={colors.accent} bold>◆ YT-DLP TUI</Text>
      <Text dimColor>{compact ? 'PUBLIC YOUTUBE' : 'Public YouTube downloader · local & private'}</Text>
    </Box>
    {!compactHeight && <Rule width={frameWidth}/>}
    {missing.length ? <Panel title="Setup required" width={frameWidth} tone="bad">
      <Text color={colors.bad} bold>Missing external dependencies: {missing.join(', ')}</Text>
      <Box marginY={1} flexDirection="column">
        <Text dimColor>Install required binaries using your package manager:</Text>
        <Text color={colors.accent}>  macOS (Homebrew):   <Text bold>brew install yt-dlp ffmpeg</Text></Text>
        <Text color={colors.accent}>  Ubuntu / Debian:    <Text bold>sudo apt update && sudo apt install yt-dlp ffmpeg</Text></Text>
        <Text color={colors.accent}>  Arch Linux:         <Text bold>sudo pacman -S yt-dlp ffmpeg</Text></Text>
        <Text color={colors.accent}>  Windows (Winget):   <Text bold>winget install yt-dlp ffmpeg</Text></Text>
      </Box>
      <Box marginY={1} flexDirection="column">
        <Text dimColor>Official Documentation & Downloads:</Text>
        <Text dimColor>  • yt-dlp: https://github.com/yt-dlp/yt-dlp#installation</Text>
        <Text dimColor>  • FFmpeg: https://ffmpeg.org/download.html</Text>
      </Box>
      <Text dimColor>Ensure both tools are available on your system PATH, then restart the app.</Text>
      <Text dimColor>Press <Key>q</Key> or <Key>Esc</Key> to exit.</Text>
    </Panel> : <>
      {screen === 'help' && <HelpOverlay groups={helpGroups} width={frameWidth}/>}
      {screen === 'dashboard' && <>
        <Panel title="Add a video" width={frameWidth} focused={focus === 'url'}>
          <Text color={focus === 'url' ? colors.accent : colors.muted}>{focus === 'url' ? `${icons.pointer} ` : '  '}<TextField value={url} placeholder="https://youtube.com/watch?v=…" focused={focus === 'url'} maxWidth={frameWidth - 4}/></Text>
          <Text color={messageColor(message.tone)}>{message.text}</Text>
        </Panel>
        <Panel title="Now downloading" width={frameWidth} focused={!!active}>{active ? <>
          <Box justifyContent="space-between"><Text bold>{truncate(active.metadata?.title || active.url, compact ? 46 : 72)}</Text><Status status={active.status}/></Box>
          {!compact && <Text dimColor>{active.metadata?.uploader || 'Unknown channel'} · {active.resolvedQuality || label(active.preset)}</Text>}
          <Box marginTop={1} justifyContent="space-between"><ProgressBar percent={active.progress?.percent || 0} width={compact ? 18 : 42}/><Text color={colors.accent}> {(active.progress?.percent || 0).toFixed(1)}%</Text></Box>
          <Text dimColor><Spinner/> {formatRate(active.progress?.speed) === '-' ? 'Connecting…' : formatRate(active.progress?.speed)}{active.progress?.eta ? `${SEP}ETA ${formatEta(active.progress.eta)}` : ''}{!compact ? `${SEP}${active.preset === 'mp3' ? settings.audioDirectory : settings.videoDirectory}` : ''}</Text>
        </> : <Text dimColor>No active download. Add a URL to start your queue.</Text>}</Panel>
        <Panel title="Queue" count={jobs.length} width={frameWidth} focused={focus === 'queue'}>
          <Table columns={queueColumns} rows={recent} cursorIndex={focus === 'queue' && recent.length ? 0 : undefined} keyOf={job => job.id} emptyText="Queue is clear. Your recent jobs will appear here."/>
        </Panel>
      </>}
      {screen === 'mode' && metadata && <Panel title="Choose download type" width={frameWidth} focused>
        <Text color={colors.accent} bold>{truncate(metadata.title, compact ? 46 : 76)}</Text>
        <Text dimColor>{metadata.uploader || 'Unknown channel'}{formatDuration(metadata.duration) ? ` · ${formatDuration(metadata.duration)}` : ''}</Text>
        <Box marginTop={1} flexDirection="column">{(['MP3 audio · 320 kbps', 'MP4 video · choose resolution'] as const).map((option, index) => <Text key={option} color={index === modeIndex ? colors.accent : colors.text} bold={index === modeIndex}>{index === modeIndex ? `${icons.pointer} ` : '  '}{option}</Text>)}</Box>
      </Panel>}
      {screen === 'quality' && metadata && <Panel title="Choose video resolution" width={frameWidth} focused>
        <Text color={colors.accent} bold>{truncate(metadata.title, compact ? 46 : 76)}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color={qualityIndex === 0 ? colors.accent : colors.text} bold={qualityIndex === 0}>{qualityIndex === 0 ? `${icons.pointer} ` : '  '}Best available MP4</Text>
          {metadata.qualities.map((quality, index) => <Text key={quality.height} color={qualityIndex === index + 1 ? colors.accent : colors.text} bold={qualityIndex === index + 1}>{qualityIndex === index + 1 ? `${icons.pointer} ` : '  '}{quality.label} MP4</Text>)}
        </Box>
      </Panel>}
      {screen === 'history' && <Panel title="History" count={history.length} width={frameWidth} focused>
        <Table columns={historyColumns} rows={history.slice(0, compact ? 5 : 10)} keyOf={job => `${job.id}-${job.createdAt}`} emptyText="No completed or failed downloads saved yet." showGutter={false}/>
      </Panel>}
      {screen === 'settings' && <Panel title="Destinations" width={frameWidth} focused>
        {(['audioDirectory', 'videoDirectory'] as const).map(field => <Text key={field} color={settingsField === field ? colors.accent : colors.text} bold={settingsField === field}>{settingsField === field ? `${icons.pointer} ` : '  '}{field === 'audioDirectory' ? 'Audio  ' : 'Video  '}<TextField value={settings[field]} placeholder="/path/to/destination" focused={settingsField === field} maxWidth={frameWidth - 12}/></Text>)}
      </Panel>}
      {screen === 'error' && errorJob && <Panel title="Download error" width={frameWidth} tone="bad">
        <Text color={colors.bad} bold>{truncate(errorJob.metadata?.title || errorJob.url, compact ? 42 : 76)}</Text>
        <Text>{errorJob.error || 'The download failed without an error message.'}</Text>
      </Panel>}
    </>}
    {!hideFooter && <><Rule width={frameWidth}/><Text dimColor>{footer}</Text></>}
  </Box>;
}
