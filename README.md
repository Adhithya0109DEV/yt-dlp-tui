# yt-dlp-tui

A keyboard-first, production-ready terminal client for downloading **public YouTube videos** powered by `yt-dlp` and React Ink. Styled in a dark, high-contrast violet/cyan TUI theme with real-time gradient progress bars, braille spinners, queue management, and resolution selection.

---

## ⚡ Quick Start

Run instantly without installing via `npx`:

```bash
npx yt-dlp-tui
```

Or install globally on your system:

```bash
npm install -g yt-dlp-tui
yt-dlp-tui
```

### Direct Video Invocation

Pass a YouTube URL directly to skip manual pasting and open resolution selection immediately:

```bash
yt-dlp-tui "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

---

## 🛠️ Prerequisites & Dependencies

`yt-dlp-tui` requires **`yt-dlp`** and **`FFmpeg`** installed on your system `PATH`.

### Quick OS Installation Commands

#### macOS (Homebrew)
```bash
brew install yt-dlp ffmpeg
```

#### Ubuntu / Debian
```bash
sudo apt update && sudo apt install yt-dlp ffmpeg
```

#### Arch Linux
```bash
sudo pacman -S yt-dlp ffmpeg
```

#### Windows (Winget)
```cmd
winget install yt-dlp ffmpeg
```

### Official Documentation & Manual Install Links
- 📖 [**yt-dlp Official Installation Guide**](https://github.com/yt-dlp/yt-dlp#installation)
- 📖 [**FFmpeg Official Downloads & Setup**](https://ffmpeg.org/download.html)

> [!TIP]
> YouTube frequently updates its video delivery mechanisms. If downloads fail with `HTTP Error 403`, update `yt-dlp` to the latest release using `yt-dlp -U` or your package manager.

---

## ⌨️ Controls & Keybindings

| Key | Action |
| --- | --- |
| `Enter` | Submit URL / Inspect video / Confirm selection |
| `Tab` | Switch focus between URL input box and Queue controls |
| `↑` / `↓` | Select format or resolution option |
| `a` | Focus URL field to add a video |
| `c` | Cancel active download |
| `r` | Retry last failed download |
| `d` | View error details for failed download |
| `h` | View download history |
| `s` | View settings & destination paths |
| `?` | Toggle help overlay |
| `Esc` | Back / Cancel current screen |
| `Ctrl+C` or `q` | Exit application |

---

## ⚙️ Configuration & Storage

Download destinations and job history are saved automatically:

- **Audio destination**: Defaults to `~/Music` (320 kbps MP3)
- **Video destination**: Defaults to `~/Videos` (MP4 format)
- **State file**: Saved to `~/.local/state/yt-dlp-tui/state.json` (or `$XDG_STATE_HOME/yt-dlp-tui/state.json`)

You can edit download destination paths inside the app by pressing `s` on the dashboard.

---

## 💻 Development & Building from Source

```bash
# Clone repository
git clone https://github.com/your-username/yt-dlp-tui.git
cd yt-dlp-tui

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run type check & unit tests
npm run typecheck
npm test

# Build production bundle
npm run build
npm start
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

*Notice: Only download content you are authorized to access, and comply with YouTube’s terms of service and applicable local laws.*
