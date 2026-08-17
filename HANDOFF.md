# Handoff: torlink-style TUI reskin + progress-bar bug fixes

**Generated**: 2026-08-15
**Branch**: none (not a git repo)
**Status**: Ready for review — reskin complete, progress bug fixes applied but NOT yet verified against a real live download (sandbox network got IP-banned by YouTube mid-session)

## Goal

1. Reskin yt-dlp-tui (TS/Ink terminal YouTube downloader) to adopt the "torlink" visual design language (violet/cyan dark TUI, title-in-border panels, gradient+sheen progress bar, braille spinner, data tables, help overlay) — style only, keep the existing sequential wizard screen flow (no nav rail).
2. Fix a real bug: the download progress bar never advances during a download — sits at 0%/"Connecting…" the whole time, then jumps straight to Complete, even while yt-dlp is genuinely downloading data (user confirmed via screenshots showing 8–17MB/s real throughput with a stuck 0.0% bar).

## Completed

- [x] Full torlink reskin: `src/theme.ts` (color tokens, icons, lerp/ramp, formatters), `src/hooks/useTerminalSize.ts`, `src/components/{Panel,ProgressBar,Spinner,Status,Key,Table,TextField,HelpOverlay}.tsx`, `src/App.tsx` rewired to use them (194 lines, down from monolithic 144-line original with everything inline).
- [x] Root-cause #1 found and fixed: `parseProgress` in `src/utils.ts` required a literal `download:` prefix on progress lines. That prefix is a yt-dlp `--progress-template` **type selector** consumed internally — never actually printed to stdout/stderr. Regex never matched, `job.progress` stayed frozen at `{percent:0}` for the entire download. Fixed by dropping the prefix requirement.
- [x] Root-cause #2 found and fixed: `consume()` in `src/downloader.ts` split stdout/stderr only on `\r?\n`. yt-dlp's live progress meter commonly redraws in place using a bare `\r` with no trailing `\n` — those updates never got split into lines, just piled up in the `remainder` buffer until an actual `\n` eventually arrived (e.g. at the very end), at which point the accumulated blob contained many concatenated frames. Fixed `consume()` to split on `\r\n|\r|\n`, and hardened `parseProgress` to take the **last** percent/speed/eta match in a line (defense in depth) instead of the first.
- [x] `formatRate`/`formatEta` in `theme.ts` hardened to treat yt-dlp's literal `"Unknown"` speed/eta strings as missing (`-`) instead of printing them raw.
- [x] `ProgressBar` component's smoothing `useEffect` fixed to not restart its interval on every `percent` prop change (was keyed on `[percent, animate]`, now uses a ref for the live target and keys only on `[animate]`) — a separate latent issue that could starve the 40ms smoothing/sheen tick on fast progress streams.
- [x] Test suite updated: `test/utils.test.ts` (parseProgress cases including the `\r`-concatenation scenario), `test/theme.test.ts` (new file, 15 tests covering lerp/ramp/formatBytes/formatRate/formatEta/formatRelativeTime/truncate/cleanText). All 25 tests passing.
- [x] `npm run typecheck`, `npm test`, `npm run build` all green as of last edit.
- [x] Verified the fix logically with synthetic-stream simulations (see Code Context below) reproducing exactly what a real `\r`-redrawing yt-dlp process sends — old code: 0 progress updates ever; new code: all frames parsed correctly in order.

## Not Yet Done

- [ ] **Live confirmation on a real download never completed.** Sandbox's YouTube access got IP-banned mid-session (`ERROR: [youtube] ...: Sign in to confirm you're not a bot`) after repeated automated test downloads — this now blocks even trivial video extraction, not just big ones. Could not verify the fix against a genuinely large, real, in-progress download with a visibly moving gradient bar.
- [ ] User needs to restart their own `npm run dev` (no `--watch` in the dev script — a running process holds the old file snapshot in memory forever) and test a real download themselves, then report back whether the bar now moves.
- [ ] If still broken after restart: the two fixes applied address every hypothesis this session could form and test in isolation, but neither was confirmed against a real live download end-to-end. If the user's yt-dlp version emits progress in some other format entirely, more raw output capture from their machine would be needed (see Resume Instructions).

## Failed Approaches (Don't Repeat These)

- Tried to verify the progress bar live via tmux-captured `npm run dev` PTY sessions with small/fast videos ("Me at the zoo", 19s/763KB) — download completes in ~3s, too fast to observe any intermediate frame regardless of whether the bug is fixed. Not useful for this kind of verification.
- Tried larger videos (Big Buck Bunny 4K, 1080p/2160p) to get a longer download window — sandbox network turned out to be anomalously fast (~20–40MB/s to YouTube's CDN), so even multi-hundred-MB files completed in 3–8 seconds, still too fast for coarse tmux-polling (subprocess-spawn overhead per `tmux capture-pane` call made 80–100ms polling loops unreliable) to reliably catch a mid-download frame.
- Repeated automated download attempts eventually triggered YouTube's bot-detection (`Sign in to confirm you're not a bot`) for the whole sandbox IP — now blocks all extraction, including previously-working small videos. **Do not hammer YouTube with repeated automated test downloads from this sandbox** — there's no recovery within the session; it's an IP-level block.
- Bypassed the flaky tmux/TUI-rendering layer entirely by calling `DownloadRunner` and raw `spawn()` directly from a `tsx -e` one-liner script to inspect real stdout/stderr byte-for-byte. This was far more reliable than screen-scraping the rendered TUI and is the recommended approach for any further live debugging (see Resume Instructions) — much less noisy than tmux capture-pane polling.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Style-only reskin, no nav rail | User explicitly chose this scope over a full structural transplant; app is a sequential wizard (dashboard→mode→quality→history→settings→error), not a persistent multi-section browser like the torlink spec's source app. |
| Keep persistent `message` line instead of building a toast | The message line already sits directly next to the action that produced it; no header-notice slot exists; recolored by tone (good/bad/muted) instead. |
| Minimal/partial readline in `TextField` (inverse cursor, placeholder styling, `^u` clear only — no `^a`/`^e`/`^w`/word-jumps) | App's two text fields (URL paste, directory path edit) are filled once per session, not iteratively edited mid-string; full readline was disproportionate engineering for the actual usage pattern. |
| Split `consume()` on `\r\n|\r|\n` rather than assuming yt-dlp's `--newline` flag is universally honored | `--newline` is supposed to force `\n`-terminated progress, but the exact behavior may differ by yt-dlp version/build; splitting on bare `\r` too is strictly safer and has no realistic downside since legitimate progress-template output never contains `\r`. |
| `parseProgress` takes the **last** match in a line via `matchAll` instead of the first via `.exec()` | Defense in depth — if multiple frames still end up concatenated into one "line" for any reason, always prefer the freshest reading. |

## Current State

**Working**: Full reskin renders correctly (verified visually via tmux PTY capture — panel borders, focus/blur, help overlay, tables, settings, history all confirmed). Typecheck/tests/build all pass. A real MP3 download (small file) was completed successfully earlier in the session and confirmed on disk with correct History/relative-time display.

**Broken / Unconfirmed**: The progress-bar-frozen bug's root causes are fixed in source, and independently proven via synthetic-stream unit tests to resolve the exact symptom described — but never confirmed against a real, live, in-progress large download, because the sandbox lost YouTube access entirely partway through verification.

**Uncommitted Changes**: No git repo exists in this project — nothing is "uncommitted" in the git sense, all changes are simply saved to disk. If the user wants version control, `git init` has not been run.

## Files to Know

| File | Why It Matters |
|------|----------------|
| `src/utils.ts` | `parseProgress` — the regex that reads yt-dlp's progress-template output. Both bugs traced back to lines 29–33. |
| `src/downloader.ts` | `DownloadRunner.start()`, specifically the `consume()` closure (~line 48) that buffers/splits child-process stdout+stderr into lines before calling `parseProgress`. |
| `src/theme.ts` | New: color tokens, icon set, `lerp`/`ramp`, all display formatters (`formatBytes`, `formatRate`, `formatEta`, `formatRelativeTime`, `truncate`, `cleanText`), `statusColor`/`statusLabel`. |
| `src/App.tsx` | App shell — screen state, `useInput` handler, composition of all the new components. Rewritten but same wizard flow as before. |
| `src/components/ProgressBar.tsx` | Gradient+sheen rendering; smoothing `useEffect` bug (interval restart on every `percent` change) fixed here via a `useRef` target. |
| `test/utils.test.ts` / `test/theme.test.ts` | Test coverage for everything above, including the `\r`-concatenation regression test. |
| `torlink-tui-design-prompt.md` | The original design spec this reskin was built from (repo root). |

## Code Context

**`parseProgress` (current, fixed):**
```typescript
export function parseProgress(line: string) {
  const matches = [...line.trim().matchAll(/([\d.]+)%\|([^|]*)\|([^|]*)/g)];
  const match = matches[matches.length - 1];
  return match ? {percent: Number(match[1]), speed: match[2].trim() || undefined, eta: match[3].trim() || undefined} : undefined;
}
```

**`consume()` in `DownloadRunner.start()` (current, fixed):**
```typescript
const consume = (data: Buffer) => {
  remainder += data.toString(); const lines = remainder.split(/\r\n|\r|\n/); remainder = lines.pop() || '';
  for (const line of lines) {
    const p = parseProgress(line); if (p) { job.progress = p; this.update(job); }
    if (line.startsWith('__YTUI_OUTPUT__')) outputPath = line.slice(15).trim();
  }
};
```

**Real yt-dlp raw output captured this session** (no TTY, piped, `--newline` flag set — confirms no `download:` prefix is ever printed):
```
  0.0%| Unknown B/s|11:45
  0.0%|   1.52MiB/s|07:28
  0.1%|   1.91MiB/s|05:54
  1.4%|  13.60MiB/s|00:49
```

**Synthetic proof used to validate the `\r`-splitting fix** (no network needed, safe to rerun any time):
```typescript
// Old split(/\r?\n/) on a stream of \r-terminated frames + final \n → 0 updates parsed ever.
// New split(/\r\n|\r|\n/) on the same stream → all frames parsed correctly, in order.
```
Full runnable versions of both are in the conversation history (ran via `npx tsx -e '...'`) — rerun if you need to re-demonstrate without touching the network.

## Resume Instructions

1. Ask the user to fully kill any existing `npm run dev` process (it holds an old in-memory snapshot of the source — `tsx src/index.tsx` has no `--watch` flag, does not hot-reload).
2. Have them run `npm run dev` fresh in their own terminal (not this sandbox — YouTube has IP-banned this sandbox for the rest of the session).
3. Have them paste a real YouTube URL, pick MP4 at a resolution large enough to take more than a few seconds (720p+), and watch the "Now downloading" panel.
   - Expected: percent climbs smoothly from 0% upward, speed shows a real `MB/s` reading (not stuck on "Connecting…"), gradient bar visibly fills with the sheen animation sweeping across it.
   - If still stuck at 0%: ask them to run the download's exact command manually via `yt-dlp --newline --progress-template 'download:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s' -f ... -o ... -- <url> 2>&1 | cat -A | head -40` and share the raw output — need to see their actual yt-dlp version's literal line format (with `cat -A` to reveal `^M` for `\r` vs `$` for `\n`) to check whether it differs from what's assumed here.
   - Also worth checking their yt-dlp version: `yt-dlp --version` — if very old or very new, `--progress-template` behavior could differ from what was reproduced in this session.
4. If it works: nothing further needed, the fix is confirmed and done.

## Warnings

- **Do not run repeated automated YouTube downloads from any single IP in quick succession** — this sandbox got bot-detection-banned mid-session (`Sign in to confirm you're not a bot`) after maybe 10-15 test downloads within roughly an hour. It did not recover before the session ended.
- `npm run dev` (`tsx src/index.tsx`) does **not** watch for file changes. Any long-running dev process must be manually restarted after every source edit — this caused significant confusion earlier in the session (user was testing against stale code and seeing "still doesn't work" for a bug that was already fixed on disk).
- The reskin's `Table` component does not attempt per-column width alignment when a cell renders a variable-width `Status` tag (e.g. `[DOWNLOADING]` vs `[COMPLETE]` differ in length) — this is a known, accepted, pre-existing-style cosmetic imperfection carried over intentionally from the original app, not a regression.
- `formatRate`/`formatEta` fall back to returning the raw yt-dlp string verbatim if it doesn't match the expected pattern (never throws) — by design, per the torlink spec's "never crash, degrade gracefully" rule.
