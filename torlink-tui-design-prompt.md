# Codex prompt — "torlink" TUI design language

> Paste everything below the line into Codex. Fill in the two `<<< >>>` blocks first.

---

You are implementing the **visual design language** for a terminal UI.

**My project:** `<<< describe your app in 2–3 sentences: what it does, main screens, main data objects >>>`

**My stack:** `<<< e.g. Rust + ratatui / Go + Bubble Tea / Python + Textual / TS + Ink >>>`

Do **not** copy any application logic. Reproduce only the look, feel, and interaction
grammar described below. Where a primitive doesn't exist in my stack, build the closest
equivalent from the box-drawing characters and ANSI styling my framework exposes.

---

## 1. Design thesis

A dark, low-chroma violet interface that behaves like a **desktop app rendered in text**:
a persistent left nav rail, titled content panels, dense right-aligned data tables, and
exactly one focus ring on screen. Chrome is quiet; the accent color is spent almost
entirely on *where the user is* and *what they can press next*. Everything is keyboard
driven, and every screen tells you what keys work right now.

Three rules govern every decision:

1. **One accent, spent sparingly.** Violet marks focus, selection, and actionable keys — nothing else.
2. **Dim is the workhorse.** Terminals have no font sizes, so hierarchy comes from
   `bold` / normal / `dim`. Most text on screen is dim; bold+accent is reserved for the one
   selected row.
3. **The layout never breaks.** Every region has a computed height/width budget, everything
   truncates rather than wraps, and content degrades gracefully as the terminal shrinks.

---

## 2. Color tokens

Define these once as a theme module and never hardcode a color anywhere else.

| Token     | Hex       | Use |
|-----------|-----------|-----|
| `accent`  | `#a78bfa` | Focus borders, selection, actionable key letters, active progress |
| `bright`  | `#d8b4fe` | Selected-item marker, top of gradients |
| `text`    | `#e9e4f5` | Primary body text |
| `alt`     | `#b9a7e6` | Key glyphs in hint rows, secondary/muted identifiers |
| `good`    | `#86d6a2` | Success, healthy counts, completion checkmarks |
| `warn`    | `#f0c560` | Degraded state, partial outage messages |
| `bad`     | `#ee7d92` | Failure |
| `rule`    | `#6b6577` | Unfocused borders, horizontal rules, empty progress track |
| `muted`   | `#7c7785` | Paused / inert item status |
| `deep`    | `#7c5cd6` | Dark end of the accent gradient |
| `sheen`   | `#f4efff` | Animated highlight peak |
| terminal bg | `#0a0810` | (assumed, not painted — never set a background) |

**Never paint a background.** The app inherits the user's terminal background; the only
inverted cell on screen is the text cursor.

Categorical tags (sources, types, tags — whatever my app has) each get one color from a
small hand-picked set that harmonizes with the violet base: `#5fd0c5`, `#7db8f0`, `#f6a55c`,
plus `good` / `warn` / `bright` / `accent`. Every tag is a short uppercase code of 2–4 chars
so the column stays a fixed width. Unknown/missing category falls back to a neutral `·` glyph
and `alt` — never crash or leave a gap.

Gradients are computed, not hardcoded: write one `lerp(hexA, hexB, t)` helper and one
three-stop `ramp(t, deep, mid, bright)` helper, then derive every gradient from the tokens above.

---

## 3. Iconography

One frozen set, used everywhere, no synonyms:

```
done ✓   error ✗   pending ·   pointer ❯   dot ·   warn ⚠
bar ▌    down ↓    up ↑        peer •      pause ⏸
```

Separators between inline items are always `  ·  ` (two spaces, middot, two spaces).
Keys in prose are written bare: `↵`, `⇥`, `^c`, `esc`, `tab`, `?`.

---

## 4. The Panel — the core primitive

Every content region is a **round-cornered box whose title sits inside the top border**.

```
╭─ Results (12) ────────────────────────────────╮
│  content, padded 1 column on each side        │
╰───────────────────────────────────────────────╯
```

Implementation technique (important — reproduce this exactly):

- Draw the **top border by hand** as three text spans: `"╭─ "` + **bold title** + `" " + "─"×fill + "╮"`.
- Render the body as a normal rounded-border box **with the top border disabled**, so the
  hand-drawn line becomes the top edge.
- `fill = width - 5 - label.length`, clamped at 0.
- Titles are stored lowercase (`"results"`, `"downloads"`) and capitalized at render time.
- An optional count is appended inside the title as `(n)` and only shown when n > 0.
- Border color: `accent` when the panel holds focus, `rule` when it doesn't. That single
  color swap **is** the focus indicator — no other visual change.
- Horizontal padding is 1; vertical padding is 0. Content is dense.

Also provide a bare `Rule` component: a full-width run of `─` in `rule`, used to separate the
app header from the body.

---

## 5. Screen architecture

```
┌ wordmark ─────────────────── transient notice (right-aligned, good) ┐
├ ──────────────────────────────────────────────────────────────────── ┤
│ nav rail │ content column                                            │
│  All     │  ╭─ Search ──────────────────────────────────────────╮    │
│  Games   │    ❯ Search or paste…                                     │
│  Movies  │  ╰───────────────────────────────────────────────────╯    │
│  TV      │                                                           │
│  Anime   │  ╭─ Latest (5) ──────────────────────────────────────╮    │
│          │    newest across all sources                              │
│ Downloads│                                                           │
│ Seeding  │      # Name                    Size   Seed:Lch   Src      │
│          │   ❯  1 Some item name…      1.96 GB    1240:88   YTS      │
│          │      2 Another item…        7.82 GB     910:41   YTS      │
│          │  ╰───────────────────────────────────────────────────╯    │
├ ──────────────────────────────────────────────────────────────────── ┤
│ ↑↓←→ Move   d Download   y Copy   s Sort   / Search   tab Switch  ? Keys │
└──────────────────────────────────────────────────────────────────────┘
```

**Outer shell:** `paddingX: 1`, `flexDirection: column`. Rows in order — header row
(wordmark left, notice right), horizontal rule, body box (fixed height, `overflow: hidden`),
footer hint row.

**Nav rail:** width is computed from the longest label + a 2-column gutter + room for a
`(00)` badge — never hardcoded. Items are grouped with a **blank line between groups**
(e.g. filters above, library below). Selected item shows `▌` in the 2-col gutter and its
label goes `accent` + bold; unselected labels are dim with an empty gutter. When the rail
loses focus, the selection stays visible but drops to `alt` / `rule` and loses bold —
**a focused pane and a merely-selected pane must be visually distinct.** Live counts render
as a dim ` (n)` suffix, hidden at zero.

**Content column:** a stack of Panels. The primary input (search/command bar) is a Panel of
inner height 2 sitting above the main list Panel, separated by one blank row.

**Splash / empty first screen:** vertically and horizontally centered — wordmark, a one-line
tagline in `text`, a dim `·`-separated list of categories, the search Panel at
`clamp(24, cols-6, 62)` wide, then a dim hint row (`↵ search  ·  ⇥ browse  ·  ^c quit`).

---

## 6. Data tables

Rows are built from fixed-width right-aligned columns plus one elastic name column.

- Column 0: 2-wide selection gutter holding `❯` in accent (empty otherwise).
- Column 1: right-aligned index, width = digit-count of the total.
- Column 2: elastic name, `flexGrow: 1`, `minWidth: 0`, `wrap: truncate-end`.
- Trailing columns: fixed widths (e.g. 10 for size, 9 for a paired metric, 12 for a
  timestamp, 4 for a category tag), each right-aligned with `marginLeft: 1`.
- Header row: same widths, labels `bold` + `dim`.
- Sorted column shows a small accent arrow glyph prefixed to its header label.

**Row emphasis:** the row under the cursor is `bold` + `accent`; every other row is `dim`.
That's it — no background highlight, no reverse video. When the pane is unfocused, no row is
emphasized.

**Missing values** render as `-`, never as blank or `N/A`.

**Formatting conventions:**
- Sizes: `1.96 GB` (2 decimals above bytes, 0 for bytes).
- Rates: `7.7 MB/s` (1 decimal below 10, else 0).
- Big counts: `1240`, `12k`, `3.4m`.
- Relative time: `now`, `12m ago`, `1hr 20m ago`, `1d 1hr ago`, `3mo ago`, `2y ago`.
- Compact durations for ETA: `6m`, `1h 20m`.
- Every displayed string passes through a `cleanText` (collapse whitespace, strip control
  chars) and a `truncate(s, max)` that appends `…`.

---

## 7. Detail view

Selecting a row replaces the list *inside the same Panel* (title switches to `Details`) —
never a popup over the list. Layout: bold title line with the category tag right-aligned,
a `Rule`, a blank row, then label/value rows with a **9-column dim label gutter** and the
value in `text` or `alt`+dim for long identifiers (hashes, URLs, paths — `truncate-end`).
The view ends with an action row: accent bold key letter, then the verb in `text`, separated
by dim `  ·  `, closing with `esc back` in `alt`+dim.

---

## 8. Motion

Only three animations exist. Add no others.

1. **Spinner** — braille frames `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` at 80 ms, glyph in accent, optional dim label.
   When a list already has rows, the spinner appends to the end of the dim status line rather
   than replacing content: *arrived rows stay usable while the rest load.*
2. **Progress bar** — filled cells are `█`, empty track is `░` in `rule`. The fill is a
   left-to-right gradient (`deep → accent → bright`). While active, a **cosine-bell sheen**
   sweeps across it: bell half-width ≈ 4.5 cells, ~8 dark cells between sweeps, advancing
   0.45 cells per 40 ms tick, blending each cell up to 90 % toward `#f4efff`. The peak glides
   sub-cell (intensity-interpolated) while the cells themselves stay discrete and pixelated.
   Static bars (paused/queued/failed) get the gradient but no sheen, tinted by status color.
   Optimize the render by collapsing consecutive same-color cells into runs.
3. **Notice toast** — a single line in `good`, right-aligned in the header, auto-clearing
   after 4 s, `truncate-end`. Confirmations, errors, and background results all land here.
   There is no other notification surface.

Timers must not hold the process alive (`unref` or equivalent).

---

## 9. Keyboard model

**Footer hint row (always visible, exactly one row, `truncate-end`, never wraps):**
key glyph in `alt`, label in dim, three spaces between pairs. **The hints are contextual** —
they change with the focused pane *and* the state of the selected item (a paused row shows
`p Resume`, a failed row shows `f Retry`). Footer labels are terse single words; the full
descriptive list lives only in the help overlay.

**Help overlay (`?`):** a rounded card whose border color is `lerp(accent, rule, 0.55)`,
aligned to the top-left (not centered), with a bold accent `Keyboard` heading and grouped
sections (bold title, then rows of `alt` keys in a fixed-width gutter + dim labels). It
**replaces** the body rather than floating over it. Any key closes it.

Layout is responsive by measurement, not breakpoints: precompute column widths for a 4-col,
3-col, 2-col, and 1-col packing of the groups, then pick the **widest packing that fits
`cols - 2`**. Condense the footer to one line when the card would overflow vertically.

**Bindings:** arrows and `hjkl` both navigate. `tab` toggles panes, `↵` opens/confirms,
`esc` steps back one level then exits to the splash screen, `q` and `^c` quit, `/` focuses
search, `?` opens help. Vertical movement **wraps** at list ends. Pressing `↑` at the top of
a list jumps focus up into the search bar. `PgUp`/`PgDn` move by `visibleRows - 1`.

**Text input:** implement full readline editing — `^u` clear, `^w` delete word back,
`^k` kill to end, `^a`/`^e` home/end, `alt`+arrows for word jumps. The cursor is one
`inverse` cell. When the field is empty, the placeholder's **first character is inverse** and
the rest is dim. Long values scroll horizontally inside a viewport that keeps the cursor
visible. `esc` cancels, `↵` submits, `↓`/`tab` exits downward into the list.

---

## 10. Responsive rules

The layout is computed from `(rows, cols)` on every resize, with a real subscription to the
resize event. Clear the screen when either dimension **shrinks** to avoid renderer artifacts.

- `contentWidth = max(24, cols - railWidth - 3)`
- Body height = `rows - 1 - chrome`, where chrome counts the header, rule, margins and footer.
- `rows < 18` → compact mode: drop the top rule and the body's top margin.
- `rows < 12` → hide the footer entirely.
- `cols < wordmarkWidth + 2` → replace the wordmark with a bold accent one-word title.
- Give the main list panel **one row of slack** rather than letting it exactly fill its
  parent — an exact fit desyncs incremental terminal renderers and eats a row while scrolling.
- Scroll windowing: keep the cursor centered — `start = clamp(cursor - floor(height/2), 0, total - height)`.
- When a list's contents change under the cursor (async arrivals, re-sort, filter toggle),
  **follow the selected item by stable id**; if the user has never moved, stay pinned to row 0.
- When two lists share a panel (active + history), split the height budget by ratio
  (~55 % to the first), floor each at one visible item, and drop the separator row before
  dropping content.

---

## 11. Voice and copy

- Sentence case everywhere. No ALL CAPS except the short category tags.
- Empty states name the fix: *"No downloads yet. Find something and press d to grab it."*
- Errors are plain, specific, and blame the system: *"Couldn't reach any source. They may be
  down (ETIMEDOUT)."* Never expose a raw stack trace or a bare error code alone.
- Status lines are dim and factual: *"12 results · sort: size ↓ · alive only"*.
- Partial failure degrades, never blocks: show what arrived, and append a dim
  *"(2 sources down)"* note.
- Destructive-sounding actions get honest labels — if it removes a list entry but not a file,
  the hint says *"Remove from list"*.

---

## 12. Anti-patterns

Do not: paint background colors on rows; use reverse video for selection; use emoji; center
body text; wrap text in tables; use double-line box drawing; show more than one focus ring;
put a modal over the list; animate anything beyond the three listed motions; hardcode widths
that a label could outgrow; add a color outside the token table.

---

## Deliverable

Build these as reusable, dependency-light components in my stack, in this order:

1. `theme` — color tokens, icon set, `lerp`/`ramp` helpers, category tag registry
2. `Rule` and `Panel` (title-in-border, focus-colored, optional count, fixed or flex height)
3. `NavRail` — grouped items, computed width, `▌` marker, focus/blur states, count badges
4. `TextField` — readline editing, inverse cursor, scrolling viewport, placeholder styling
5. `Table` — gutter + index + elastic name + fixed right-aligned columns, header, cursor row
6. `Spinner`, `ProgressBar` (gradient + optional sheen), notice toast
7. `Footer` (contextual hints) and `HelpOverlay` (measured multi-column packing)
8. The app shell that computes the layout budget from `(rows, cols)` and wires it together

Then render one representative screen of my app using them, and show me the result. Include a
short `DESIGN.md` recording the tokens and the layout rules so future changes stay consistent.
