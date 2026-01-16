# YouTube Aha Catcher 🧠

A Chrome Extension for "Zero-Friction" knowledge capture. Instantly save "Aha!" moments from YouTube videos with a single keystroke, complete with context, transcript, and AI-powered enrichment.

![Version](https://img.shields.io/badge/version-1.0.0-blue) ![Status](https://img.shields.io/badge/status-stable-green)

## ✨ Features

-   **Instant Capture:** Press `⌥ + C` (Option + C on Mac) or `Alt + C` to capture the current moment.
-   **Smart Context:** Automatically extracts the last **30 seconds of transcript** and **video description** leading up to your capture.
-   **Robust Fetching:** Uses a multi-layered strategy (Direct Fetch > Innertube API > DOM Scraping) to ensure transcripts are found even on complex video pages.
-   **AI Builder Intelligence:** Combines **Gemini 3 Flash** for English reasoning with **DeepSeek** for original-language summarization.
-   **Structured Runs:** Each capture now stores the source metadata once plus an ordered list of AI runs (baseline + refinements). Every run records its `mode`, provided intent (or “Not Provided”), summary, background, and follow-ups so you can compare the base insight to every intent-driven rerun without duplicating transcript data.
-   **Live Progress:** Real-time status updates ("Analysing...") in the popup while AI processing is in progress.
-   **Multi-Select Export:** Select specific "Aha!" moments to copy as Markdown or download as a `.md` report.
-   **Privacy First:** All data is stored locally in your browser (`chrome.storage.local`).

## 🚀 Installation

### Prerequisites
-   Node.js 18+
-   npm

### Build from Source
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm ci
    ```
3.  Build the extension:
    ```bash
    npm run build
    ```
    This creates a `dist/` directory.

### Load into Chrome
1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer Mode** (top right toggle).
3.  Click **"Load unpacked"**.
4.  Select the `dist/` folder from this project.

## 🛠 Usage

1.  **Configure:** Click the extension icon and enter your AI Builder Token (required for the "Intelligence" summary feature).
2.  **Watch:** Open any YouTube video.
3.  **Capture:** When you hear something interesting, press `Alt+C` (Windows/Linux) or `Cmd+Shift+Y` (Mac).
    *   *Note: You must be logged into YouTube for the most reliable transcript access.*
4.  **Review:** Open the extension popup to see your list of captures.
5.  **Export:** Click "Copy MD" or "Download" to save your notes.

## ⚙️ Settings

Open the popup to paste your AI Builder key; that’s the only provider the extension now uses. It always runs the Gemini 2.5 + DeepSeek flow, so no additional configuration is required.

## 📁 Project Structure

```
src/
├── pages/
│   ├── background/    # Service Worker (orchestration & storage)
│   ├── content/       # Content Scripts (page interaction & hotkeys)
│   │   ├── mainWorld.ts # Injection for accessing YouTube internal API
│   │   └── index.tsx    # React-based UI overlay (toasts)
│   └── popup/         # Extension Popup UI (React)
├── services/
│   ├── youtube.ts     # Core logic for transcript extraction
│   ├── llm.ts         # AI Builder integration
│   └── storage.ts     # Local persistence layer
```

## 🗂️ Ignored Directories

- `tasks/` contains planning / PRD notes; keep local copies for reference but the files are not distributed with the published extension.
-- `tests/` hosts the local vitest/playwright harnesses; they are intentionally excluded from release bundles to prevent sensitive test data or hardcoded local paths from being shared.

## 📝 License

MIT
