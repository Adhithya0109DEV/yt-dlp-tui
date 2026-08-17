#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import {App} from './App.js';
import {checkDependencies} from './downloader.js';
import {loadState} from './store.js';

const VERSION = '0.1.0';

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  console.log(`yt-dlp-tui v${VERSION}`);
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
◆ YT-DLP TUI v${VERSION}
Keyboard-first terminal client for YouTube downloads.

USAGE:
  $ yt-dlp-tui [options] [URL]

OPTIONS:
  -v, --version    Show program version
  -h, --help       Show this help message

EXAMPLES:
  $ yt-dlp-tui
  $ yt-dlp-tui https://www.youtube.com/watch?v=dQw4w9WgXcQ

PREREQUISITES:
  Requires 'yt-dlp' and 'ffmpeg' installed on your system PATH.
  - yt-dlp: https://github.com/yt-dlp/yt-dlp#installation
  - FFmpeg: https://ffmpeg.org/download.html
`);
  process.exit(0);
}

// Extract optional initial URL argument (first non-flag argument)
const initialUrl = args.find(arg => !arg.startsWith('-'));

const [state, missing] = await Promise.all([loadState(), checkDependencies()]);

const alternateScreen = Boolean(process.stdout.isTTY);
let restored = false;

const restoreTerminal = () => {
  if (!alternateScreen || restored) return;
  restored = true;
  // Restore alternate screen buffer & re-enable cursor visibility
  process.stdout.write('\u001B[?1049l\u001B[?25h');
};

if (alternateScreen) {
  process.stdout.write('\u001B[?1049h\u001B[2J\u001B[H');
}

// Clean terminal restoration on unexpected termination/crash
const cleanupAndExit = (code = 0) => {
  restoreTerminal();
  process.exit(code);
};

process.on('SIGINT', () => cleanupAndExit(0));
process.on('SIGTERM', () => cleanupAndExit(0));
process.on('uncaughtException', (err) => {
  restoreTerminal();
  console.error('Fatal Error:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  restoreTerminal();
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

const app = render(
  <App
    initialSettings={state.settings}
    initialHistory={state.history}
    missing={missing}
    initialUrl={initialUrl}
  />,
  {exitOnCtrlC: false}
);

try {
  await app.waitUntilExit();
} finally {
  restoreTerminal();
}
